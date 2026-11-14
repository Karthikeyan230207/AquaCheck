import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pymongo import DESCENDING
from pymongo.errors import PyMongoError

from app.analysis.analyzer import analyze_parameters
from app.api.auth import AuthenticatedUser, get_current_user, get_optional_user
from app.config.settings import settings
from app.extraction.ocr_engine import (
	OCRTimeoutError,
	OCRUnavailableError,
)
from app.extraction.parameter_parser import parse_parameters
from app.extraction.upload_validation import (
	UploadLimitExceededError,
	validate_image_bytes,
	validate_pdf_bytes,
)
from app.schemas.parameter import WaterParameter
from app.schemas.report import (
	ReportAnalysisResponse,
	ReportAnalysisJobResponse,
	ReportHistoryItem,
	ReportHistoryResponse,
	ReportUploadResponse,
)
from app.services.mongodb_service import get_reports_collection
from app.services.extraction_worker import (
	extract_image_in_process,
	extract_pdf_in_process,
)
from app.services.report_job_service import (
	AnalysisJobCapacityError,
	AnalysisJobError,
	get_analysis_job,
	submit_analysis_job,
)


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


def _list_reports(
	user_id: str,
	page: int,
	page_size: int,
) -> tuple[list[dict[str, object]], int]:
	collection = get_reports_collection()
	filter_document = {"user_id": user_id}
	total = collection.count_documents(filter_document)
	cursor = (
		collection.find(
			filter_document,
			{
				"_id": 1,
				"filename": 1,
				"page_count": 1,
				"created_at": 1,
				"analysis": 1,
			},
		)
		.sort([("created_at", DESCENDING), ("_id", DESCENDING)])
		.skip((page - 1) * page_size)
		.limit(page_size)
	)
	return list(cursor), total


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


def _delete_report(report_id: str, user_id: str) -> bool:
	collection = get_reports_collection()
	result = collection.delete_one({"_id": report_id, "user_id": user_id})
	return result.deleted_count > 0


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
	try:
		if extension == ".pdf":
			validate_pdf_bytes(content)
		else:
			validate_image_bytes(content, extension)
	except UploadLimitExceededError as error:
		raise HTTPException(status_code=413, detail=str(error)) from error
	except ValueError as error:
		raise HTTPException(status_code=400, detail=str(error)) from error
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
	response_model=ReportAnalysisJobResponse,
	status_code=status.HTTP_202_ACCEPTED,
)
async def analyze_report(
	file: UploadFile = File(...),
	user: AuthenticatedUser | None = Depends(get_optional_user),
) -> ReportAnalysisJobResponse:
	"""
	Queue a report analysis and return a job ID to poll for its result.

	The MongoDB connection string stays on the backend; the caller's Supabase
	access token is validated with Supabase Auth before it is used as the owner.
	"""
	filename, extension, content_type, content = await _read_upload(file)
	try:
		job = submit_analysis_job(
			user.user_id if user is not None else None,
			_analyze_uploaded_report,
			filename,
			extension,
			content_type,
			content,
			user.user_id if user is not None else None,
		)
	except AnalysisJobCapacityError as error:
		raise HTTPException(
			status_code=status.HTTP_429_TOO_MANY_REQUESTS,
			detail="Too many reports are being analyzed. Try again shortly.",
			headers={"Retry-After": "1"},
		) from error
	except RuntimeError as error:
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="The report analysis worker is unavailable.",
		) from error

	return ReportAnalysisJobResponse(
		job_id=job.job_id,
		status=job.status,
		result=job.result,
		error=job.error,
		error_code=job.error_code,
	)


def _analyze_uploaded_report(
	filename: str,
	extension: str,
	content_type: str,
	content: bytes,
	user_id: str | None,
) -> ReportAnalysisResponse:
	try:
		if extension == ".pdf":
			extracted = extract_pdf_in_process(content)
		else:
			extracted_text = extract_image_in_process(content)
			extracted = {"extracted_text": extracted_text, "page_count": 1}
	except OCRUnavailableError as error:
		raise AnalysisJobError(status.HTTP_503_SERVICE_UNAVAILABLE, str(error)) from error
	except OCRTimeoutError as error:
		raise AnalysisJobError(
			status.HTTP_504_GATEWAY_TIMEOUT,
			"OCR processing exceeded the configured time limit.",
		) from error
	except UploadLimitExceededError as error:
		raise AnalysisJobError(status.HTTP_413_CONTENT_TOO_LARGE, str(error)) from error
	except ValueError as error:
		raise AnalysisJobError(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from error

	parsed_parameters = parse_parameters(str(extracted["extracted_text"]))
	if not parsed_parameters:
		raise AnalysisJobError(
			status.HTTP_422_UNPROCESSABLE_CONTENT,
			"No supported water-quality measurements were found in the report.",
		)

	parameters = [WaterParameter.model_validate(item) for item in parsed_parameters]
	analysis = analyze_parameters(parameters)
	report_id = str(uuid4())
	if user_id is not None:
		document: dict[str, object] = {
			"_id": report_id,
			"user_id": user_id,
			"filename": filename,
			"content_type": content_type,
			"size_bytes": len(content),
			"page_count": int(extracted["page_count"]),
			"extracted_parameters": [item.model_dump(mode="json") for item in parameters],
			"analysis": analysis,
			"created_at": datetime.now(timezone.utc),
		}
		try:
			_save_report(document)
		except (PyMongoError, RuntimeError) as error:
			logger.error(
				"MongoDB Atlas report save failed (%s)",
				type(error).__name__,
			)
			raise AnalysisJobError(
				status.HTTP_503_SERVICE_UNAVAILABLE,
				"Report storage is unavailable. Please try again later.",
			) from error

	return ReportAnalysisResponse(
		report_id=report_id,
		filename=filename,
		content_type=content_type,
		size_bytes=len(content),
		page_count=int(extracted["page_count"]),
		extracted_parameters=parameters,
		analysis=analysis,
		saved_to_history=user_id is not None,
	)


@router.get("/jobs/{job_id}", response_model=ReportAnalysisJobResponse)
def get_report_analysis_job(
	job_id: str,
	user: AuthenticatedUser | None = Depends(get_optional_user),
) -> ReportAnalysisJobResponse:
	job = get_analysis_job(job_id, user.user_id if user is not None else None)
	if job is None:
		raise HTTPException(status_code=404, detail="Analysis job not found")
	return ReportAnalysisJobResponse(
		job_id=job.job_id,
		status=job.status,
		result=job.result,
		error=job.error,
		error_code=job.error_code,
	)


@router.get("", response_model=ReportHistoryResponse)
def list_reports(
	user: AuthenticatedUser = Depends(get_current_user),
	page: int = Query(default=1, ge=1, le=10_000),
	page_size: int | None = Query(default=None, ge=1, le=100),
	limit: int | None = Query(default=None, ge=1, le=100, deprecated=True),
) -> ReportHistoryResponse:
	effective_page_size = page_size or limit or 20
	try:
		documents, total = _list_reports(user.user_id, page, effective_page_size)
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
	total_pages = (total + effective_page_size - 1) // effective_page_size
	return ReportHistoryResponse(
		reports=reports,
		page=page,
		page_size=effective_page_size,
		total=total,
		total_pages=total_pages,
		has_next=page < total_pages,
		has_previous=page > 1,
	)


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


@router.delete("/{report_id}", status_code=status.HTTP_200_OK)
def delete_report(
	report_id: str,
	user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, str]:
	try:
		deleted = _delete_report(report_id, user.user_id)
	except (PyMongoError, RuntimeError) as error:
		raise _database_error(error) from error

	if not deleted:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Report not found",
		)
	return {"message": "Report deleted successfully"}
