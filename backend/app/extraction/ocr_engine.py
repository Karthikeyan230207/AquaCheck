from collections.abc import Callable

import fitz


class OCRUnavailableError(RuntimeError):
	"""Raised when no OCR provider has been configured."""


OCRProvider = Callable[[bytes], str]


def extract_text_from_image(image_data: bytes, provider: OCRProvider | None = None) -> str:
	"""OCR provider boundary for image or rendered scanned-PDF page bytes."""
	if not image_data:
		raise ValueError("Image data is empty")
	if provider is None:
		raise OCRUnavailableError("OCR is not configured. Connect Tesseract or EasyOCR to extract text.")
	return provider(image_data)


def extract_text_from_scanned_pdf(
	pdf_data: bytes,
	provider: OCRProvider | None = None,
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
			extract_text_from_image(page.get_pixmap().tobytes("png"), provider)
			for page in document
		]
	return {"extracted_text": "\n\n".join(pages), "page_count": len(pages), "pages": pages}
