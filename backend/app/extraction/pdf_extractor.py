from typing import Any

import fitz


def extract_pdf_text(pdf_data: bytes) -> dict[str, Any]:
	"""Extract embedded text page by page without attempting OCR."""
	if not pdf_data:
		raise ValueError("PDF data is empty")

	try:
		document = fitz.open(stream=pdf_data, filetype="pdf")
	except (fitz.FileDataError, ValueError) as error:
		raise ValueError("The uploaded data is not a readable PDF") from error

	with document:
		pages = [page.get_text("text").strip() for page in document]
	return {"extracted_text": "\n\n".join(pages), "page_count": len(pages), "pages": pages}
