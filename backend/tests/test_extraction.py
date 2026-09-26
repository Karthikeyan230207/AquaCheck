import fitz

from app.extraction.parameter_parser import parse_parameters
from app.extraction.ocr_engine import OCRUnavailableError, extract_text_from_scanned_pdf
from app.extraction.pdf_extractor import extract_pdf_text


def test_pdf_extraction_returns_page_text_and_page_count() -> None:
	document = fitz.open()
	page = document.new_page()
	page.insert_text((72, 72), "pH: 6.8\nTDS: 320 mg/L")
	pdf_data = document.tobytes()
	document.close()

	result = extract_pdf_text(pdf_data)

	assert result["page_count"] == 1
	assert "pH: 6.8" in result["extracted_text"]


def test_parameter_parser_extracts_known_values_and_omits_missing_ones() -> None:
	parameters = parse_parameters("pH: 6.8\nTDS: 320 mg/L\nIron: 0.2 mg/L")

	assert parameters == [
		{"parameter": "pH", "value": 6.8, "unit": ""},
		{"parameter": "TDS", "value": 320.0, "unit": "mg/L"},
		{"parameter": "Iron", "value": 0.2, "unit": "mg/L"},
	]


def test_parser_does_not_invent_missing_values() -> None:
	assert parse_parameters("Water sample report without measurements") == []


def test_scanned_pdf_requires_an_explicit_ocr_provider() -> None:
	document = fitz.open()
	document.new_page()
	pdf_data = document.tobytes()
	document.close()

	try:
		extract_text_from_scanned_pdf(pdf_data)
	except OCRUnavailableError:
		pass
	else:
		raise AssertionError("OCR must not return invented text without a provider")
