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


def test_parameter_parser_uses_average_from_min_average_max_table() -> None:
	text = """\
Parameter
Unit
Standard (Limit)
Min
Avg
Max
Status
pH
-
6.5 - 8.5
6.9
7.4
7.9
Compliant
Turbidity
NTU
<= 1.0 (5.0 max)
0.1
0.4
1.8
Minor exceedance
Total Dissolved Solids
mg/L
500 (2000 max)
210
286
342
Compliant
Total Hardness (CaCO3)
mg/L
200 (600 max)
98
142
176
Compliant
Iron
mg/L
0.3 (1.0 max)
<0.05
0.09
0.21
Compliant
"""

	assert parse_parameters(text) == [
		{"parameter": "pH", "value": 7.4, "unit": ""},
		{"parameter": "Turbidity", "value": 0.4, "unit": "NTU"},
		{"parameter": "TDS", "value": 286.0, "unit": "mg/L"},
		{"parameter": "Total Hardness", "value": 142.0, "unit": "mg/L"},
		{"parameter": "Iron", "value": 0.09, "unit": "mg/L"},
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


def test_real_sample_pdf_extraction_and_parsing() -> None:
	import os
	sample_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Water_Quality_Report_Sample.pdf"))
	if not os.path.exists(sample_path):
		return
	with open(sample_path, "rb") as f:
		pdf_bytes = f.read()

	extracted = extract_pdf_text(pdf_bytes)
	assert extracted["page_count"] == 2
	assert "Physical and Chemical Parameters" in extracted["extracted_text"]

	params = parse_parameters(extracted["extracted_text"])
	param_names = [p["parameter"] for p in params]
	assert "pH" in param_names
	assert "Turbidity" in param_names
	assert "TDS" in param_names
	assert "Total Hardness" in param_names
	assert "Chloride" in param_names
	assert "Nitrate" in param_names
	assert "Fluoride" in param_names
	assert "Iron" in param_names


def test_two_column_key_value_table_extraction() -> None:
	text = """
	Water Quality Analysis Certificate
	pH: 7.2
	Turbidity: 0.8 NTU
	Total Dissolved Solids: 310 mg/L
	Hardness: 120 mg/L
	Nitrate: 14.5 mg/L
	Fluoride: 0.6 mg/L
	Iron: 0.15 mg/L
	"""
	params = parse_parameters(text)
	found_map = {p["parameter"]: p["value"] for p in params}
	assert found_map["pH"] == 7.2
	assert found_map["Turbidity"] == 0.8
	assert found_map["TDS"] == 310.0
	assert found_map["Total Hardness"] == 120.0
	assert found_map["Nitrate"] == 14.5
	assert found_map["Fluoride"] == 0.6
	assert found_map["Iron"] == 0.15

