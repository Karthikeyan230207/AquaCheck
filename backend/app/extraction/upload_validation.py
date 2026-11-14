from io import BytesIO
import math

import fitz
from PIL import Image, UnidentifiedImageError

from app.config.settings import settings


class UploadLimitExceededError(ValueError):
	"""Raised when an upload exceeds a configured processing limit."""


def validate_image_dimensions(width: int, height: int) -> None:
	if (
		width <= 0
		or height <= 0
		or width > settings.max_image_dimension_px
		or height > settings.max_image_dimension_px
		or width * height > settings.max_image_pixels
	):
		raise UploadLimitExceededError(
			"Image dimensions exceed the configured limit."
		)


def validate_image_bytes(content: bytes, extension: str) -> None:
	expected_format = "PNG" if extension == ".png" else "JPEG"
	try:
		with Image.open(BytesIO(content)) as image:
			if image.format != expected_format:
				raise ValueError("File contents do not match the declared file type")
			validate_image_dimensions(*image.size)
			image.verify()
	except UploadLimitExceededError:
		raise
	except (Image.DecompressionBombError, OSError, SyntaxError, UnidentifiedImageError) as error:
		raise ValueError("The uploaded image is not readable") from error


def validate_pdf_document(document: fitz.Document) -> int:
	if document.needs_pass:
		raise ValueError("Password-protected PDF files are not supported.")

	page_count = len(document)
	if page_count == 0:
		raise ValueError("The uploaded PDF does not contain any pages.")
	if page_count > settings.max_pdf_pages:
		raise UploadLimitExceededError(
			"PDF exceeds the configured page limit."
		)

	for page in document:
		width = math.ceil(page.rect.width * settings.ocr_dpi / 72)
		height = math.ceil(page.rect.height * settings.ocr_dpi / 72)
		validate_image_dimensions(width, height)
	return page_count


def validate_pdf_bytes(content: bytes) -> int:
	try:
		document = fitz.open(stream=content, filetype="pdf")
	except (fitz.FileDataError, RuntimeError, ValueError) as error:
		raise ValueError("The uploaded data is not a readable PDF") from error

	with document:
		return validate_pdf_document(document)
