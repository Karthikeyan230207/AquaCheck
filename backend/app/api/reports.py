import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from pymongo import DESCENDING
from pymongo.errors import PyMongoError

from app.analysis.analyzer import analyze_parameters
from app.api.auth import AuthenticatedUser, get_current_user, get_optional_user
from app.config.settings import settings
from app.extraction.parameter_parser import parse_parameters
from app.extraction.pdf_extractor import extract_pdf_text
from app.schemas.parameter import WaterParameter
from app.schemas.report import (
	ReportAnalysisResponse,
	ReportHistoryItem,
	ReportHistoryResponse,
	ReportUploadResponse,
)
from app.services.mongodb_service import get_reports_collection


router = APIRouter(prefix="/api/reports", tags=["reports"])
logger = logging.getLogger(__name__)

_ALLOWED_TYPES = {
	".pdf": {"application/pdf", "application/octet-stream"},
	".jpg": {"image/jpeg", "application/octet-stream"},
	".jpeg": {"image/jpeg", "application/octet-stream"},
	".png": {"image/png", "application/octet-stream"},
}


def _has_expected_signature(extension: str, content: bytes) -> bool:
	signatures = {
		".pdf": content.startswith(b"%PDF-"),
		".jpg": content.startswith(b"\xff\xd8\xff"),
		".jpeg": content.startswith(b"\xff\xd8\xff"),
		".png": content.startswith(b"\x89PNG\r\n\x1a\n"),
	}
	return signatures.get(extension, False)


def _database_error(error: Exception) -> HTTPException:
	logger.error(
		"MongoDB Atlas report operation failed (%s)",
		type(error).__name__,
	)
	return HTTPException(
		status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
		detail="Report storage is unavailable. Please try again later.",
	)


def _save_report(document: dict[str, object]) -> None:
	collection = get_reports_collection()
	collection.insert_one(document)


def _list_reports(user_id: str, limit: int) -> list[dict[str, object]]:
	collection = get_reports_collection()
	cursor = (
		collection.find(
			{"user_id": user_id},
			{
				"_id": 1,
				"filename": 1,
				"page_count": 1,
				"created_at": 1,
				"analysis": 1,
			},
		)
		.sort("created_at", DESCENDING)
		.limit(limit)
	)
	return list(cursor)


def _find_report(report_id: str, user_id: str) -> dict[str, object] | None:
	return get_reports_collection().find_one(
		{"_id": report_id, "user_id": user_id},
		{
			"_id": 1,
			"filename": 1,
			"page_count": 1,
			"extracted_parameters": 1,
			"analysis": 1,
			"created_at": 1,
		},
	)


async def _read_upload(file: UploadFile) -> tuple[str, str, str, bytes]:
	filename = (file.filename or "").strip()
	extension = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
	content_type = file.content_type or "application/octet-stream"
	if extension not in _ALLOWED_TYPES or content_type not in _ALLOWED_TYPES[extension]:
		raise HTTPException(status_code=415, detail="Only PDF, JPG, JPEG, and PNG files are supported")

	content = await file.read(settings.max_upload_size_bytes + 1)
	if len(content) > settings.max_upload_size_bytes:
		raise HTTPException(status_code=413, detail="Uploaded file exceeds the configured size limit")
	if not content:
		raise HTTPException(status_code=400, detail="Uploaded file is empty")
	if not _has_expected_signature(extension, content):
		raise HTTPException(status_code=400, detail="File contents do not match the declared file type")
	return filename, extension, content_type, content


@router.post("/upload", response_model=ReportUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_report(file: UploadFile = File(...)) -> ReportUploadResponse:
	filename, _, content_type, content = await _read_upload(file)

	return ReportUploadResponse(
		report_id=str(uuid4()),
		filename=filename,
		content_type=content_type,
		size_bytes=len(content),
	)


@router.post(
	"/analyze",
	response_model=ReportAnalysisResponse,
	status_code=status.HTTP_200_OK,
)
async def analyze_report(
	file: UploadFile = File(...),
	user: AuthenticatedUser | None = Depends(get_optional_user),
) -> ReportAnalysisResponse:
	"""
	Analyze a report and persist the result in Atlas when the caller is signed in.

	The MongoDB connection string stays on the backend; the caller's Supabase
	access token is validated with Supabase Auth before it is used as the owner.
	"""
	filename, extension, content_type, content = await _read_upload(file)
	if extension != ".pdf":
		raise HTTPException(
			status_code=415,
			detail="Report analysis currently supports text-based PDF files only",
		)

	try:
		extracted = extract_pdf_text(content)
	except ValueError as error:
		raise HTTPException(status_code=422, detail=str(error)) from error

	parsed_parameters = parse_parameters(str(extracted["extracted_text"]))
	if not parsed_parameters:
		raise HTTPException(
			status_code=422,
			detail=(
				"No supported water-quality measurements were found. "
				"Scanned PDFs require OCR, which is not configured."
			),
		)

	parameters = [WaterParameter.model_validate(item) for item in parsed_parameters]
	analysis = analyze_parameters(parameters)
	report_id = str(uuid4())
	if user is not None:
		document: dict[str, object] = {
			"_id": report_id,
			"user_id": user.user_id,
			"filename": filename,
			"content_type": content_type,
			"size_bytes": len(content),
			"page_count": int(extracted["page_count"]),
			"extracted_parameters": [item.model_dump(mode="json") for item in parameters],
			"analysis": analysis,
			"created_at": datetime.now(timezone.utc),
		}
		try:
			await run_in_threadpool(_save_report, document)
		except (PyMongoError, RuntimeError) as error:
			raise _database_error(error) from error

	return ReportAnalysisResponse(
		report_id=report_id,
		filename=filename,
		content_type=content_type,
		size_bytes=len(content),
		page_count=int(extracted["page_count"]),
		extracted_parameters=parameters,
		analysis=analysis,
		saved_to_history=user is not None,
	)


@router.get("", response_model=ReportHistoryResponse)
def list_reports(
	user: AuthenticatedUser = Depends(get_current_user),
	limit: int = Query(default=50, ge=1, le=100),
) -> ReportHistoryResponse:
	try:
		documents = _list_reports(user.user_id, limit)
	except (PyMongoError, RuntimeError) as error:
		raise _database_error(error) from error

	reports = [
		ReportHistoryItem(
			report_id=str(document["_id"]),
			filename=str(document["filename"]),
			page_count=int(document["page_count"]),
			created_at=document["created_at"],
			analysis=document["analysis"],
		)
		for document in documents
	]
	return ReportHistoryResponse(reports=reports)


@router.get("/{report_id}", response_model=ReportAnalysisResponse)
def get_report(
	report_id: str,
	user: AuthenticatedUser = Depends(get_current_user),
) -> ReportAnalysisResponse:
	try:
		document = _find_report(report_id, user.user_id)
	except (PyMongoError, RuntimeError) as error:
		raise _database_error(error) from error

	if document is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Report not found",
		)
	parameters = [
		WaterParameter.model_validate(item)
		for item in document["extracted_parameters"]
	]
	return ReportAnalysisResponse(
		report_id=str(document["_id"]),
		filename=str(document["filename"]),
		content_type=str(document.get("content_type", "application/pdf")),
		size_bytes=int(document.get("size_bytes", 1)),
		page_count=int(document["page_count"]),
		extracted_parameters=parameters,
		analysis=document["analysis"],
		saved_to_history=True,
	)
