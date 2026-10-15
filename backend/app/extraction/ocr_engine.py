from collections.abc import Callable
from importlib import import_module
from io import BytesIO
import re

import fitz

from app.config.settings import settings


class OCRUnavailableError(RuntimeError):
	"""Raised when no OCR provider has been configured."""


OCRProvider = Callable[[bytes], str]


def tesseract_ocr(image_data: bytes) -> str:
	"""Recognize text from an image using the configured Tesseract installation."""
	try:
		image_module = import_module("PIL.Image")
		image_draw = import_module("PIL.ImageDraw")
		pytesseract = import_module("pytesseract")
	except ImportError as error:
		raise OCRUnavailableError(
			"OCR dependencies are missing. Install the backend requirements "
			"including Pillow and pytesseract."
		) from error

	if settings.ocr_tesseract_cmd:
		pytesseract.pytesseract.tesseract_cmd = settings.ocr_tesseract_cmd

	try:
		with image_module.open(BytesIO(image_data)) as image:
			try:
				image.load()
			except (image_module.UnidentifiedImageError, OSError) as error:
				raise ValueError("The uploaded image is not readable") from error
			ocr_image = image.convert("L")
			width, height = ocr_image.size
			pixels = ocr_image.tobytes()
			line_rows = [
				y
				for y in range(height)
				if sum(1 for value in pixels[y * width : (y + 1) * width] if value < 128)
				>= width * 0.7
			]
			if len(line_rows) >= 3:
				draw = image_draw.Draw(ocr_image)
				for y in line_rows:
					draw.line((0, max(0, y - 1), width - 1, min(height - 1, y + 1)), fill=255)

			scale = min(4, 5000 / max(width, height))
			if scale > 1:
				ocr_image = ocr_image.resize(
					(round(width * scale), round(height * scale)),
					image_module.Resampling.LANCZOS,
				)
			config = "--oem 3 --psm 11"
			text = pytesseract.image_to_string(
				ocr_image,
				lang=settings.ocr_language,
				config=config,
			)
			if re.search(r"(?<![A-Za-z])pH(?![A-Za-z])", text, re.IGNORECASE) is None:
				label_column = ocr_image.crop(
					(
						0,
						0,
						round(ocr_image.width * 0.65),
						round(ocr_image.height * 0.3),
					)
				)
				label_text = pytesseract.image_to_string(
					label_column,
					lang=settings.ocr_language,
					config=config,
				)
				if re.search(r"^\s*pH\s*$", label_text, re.IGNORECASE | re.MULTILINE):
					text = f"pH\n{text}"
			return text
	except (image_module.UnidentifiedImageError, OSError) as error:
		raise ValueError("The uploaded image is not readable") from error
	except pytesseract.pytesseract.TesseractNotFoundError as error:
		raise OCRUnavailableError(
			"Tesseract was not found. Install Tesseract OCR or set OCR_TESSERACT_CMD "
			"to its executable path."
		) from error
	except pytesseract.pytesseract.TesseractError as error:
		raise OCRUnavailableError(
			f"Tesseract OCR failed. Check OCR_LANGUAGE and installed language data: {error}"
		) from error


def extract_text_from_image(image_data: bytes, provider: OCRProvider | None = None) -> str:
	"""OCR provider boundary for image or rendered scanned-PDF page bytes."""
	if not image_data:
		raise ValueError("Image data is empty")
	if provider is None:
		raise OCRUnavailableError("OCR is not configured. Connect Tesseract or EasyOCR to extract text.")
	return provider(image_data)


def extract_text_from_scanned_pdf(
	pdf_data: bytes,
	provider: OCRProvider = tesseract_ocr,
) -> dict[str, object]:
	"""Render each scanned PDF page and pass it to the configured OCR provider."""
	if not pdf_data:
		raise ValueError("PDF data is empty")

	try:
		document = fitz.open(stream=pdf_data, filetype="pdf")
	except (fitz.FileDataError, ValueError) as error:
		raise ValueError("The uploaded data is not a readable PDF") from error

	with document:
		pages = [
			extract_text_from_image(
				page.get_pixmap(dpi=settings.ocr_dpi).tobytes("png"),
				provider,
			)
			for page in document
		]
	return {"extracted_text": "\n\n".join(pages), "page_count": len(pages), "pages": pages}
