from typing import Any

import fitz

from app.config.settings import settings
from app.extraction.ocr_engine import OCRProvider, extract_text_from_image, tesseract_ocr


def extract_pdf_text(
	pdf_data: bytes,
	ocr_provider: OCRProvider = tesseract_ocr,
) -> dict[str, Any]:
	"""Extract embedded text and use OCR on pages without embedded text."""
	if not pdf_data:
		raise ValueError("PDF data is empty")

	try:
		document = fitz.open(stream=pdf_data, filetype="pdf")
	except (fitz.FileDataError, ValueError) as error:
		raise ValueError("The uploaded data is not a readable PDF") from error

	with document:
		pages = []
		for page in document:
			text = page.get_text("text").strip()
			if not text:
				image_data = _embedded_scan_image(document, page)
				if image_data is None:
					image_data = page.get_pixmap(dpi=settings.ocr_dpi).tobytes("png")
				text = extract_text_from_image(image_data, ocr_provider).strip()
			pages.append(text)
	return {"extracted_text": "\n\n".join(pages), "page_count": len(pages), "pages": pages}


def _embedded_scan_image(document: fitz.Document, page: fitz.Page) -> bytes | None:
	"""Return the original image when it is the dominant content of a scanned page."""
	page_area = page.rect.width * page.rect.height
	candidates: list[tuple[float, int]] = []
	for image in page.get_images(full=True):
		xref = image[0]
		coverage = max(
			(
				rect.width * rect.height / page_area
				for rect in page.get_image_rects(xref)
			),
			default=0,
		)
		if coverage >= 0.3:
			candidates.append((coverage, xref))
	if not candidates:
		return None

	_, xref = max(candidates)
	return document.extract_image(xref)["image"]
