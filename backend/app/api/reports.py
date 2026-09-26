from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.config.settings import settings
from app.schemas.report import ReportUploadResponse


router = APIRouter(prefix="/api/reports", tags=["reports"])

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


@router.post("/upload", response_model=ReportUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_report(file: UploadFile = File(...)) -> ReportUploadResponse:
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

	return ReportUploadResponse(
		report_id=str(uuid4()),
		filename=filename,
		content_type=content_type,
		size_bytes=len(content),
	)
