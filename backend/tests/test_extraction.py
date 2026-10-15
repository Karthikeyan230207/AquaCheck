from io import BytesIO
from types import SimpleNamespace

import fitz
import pytest
from PIL import Image, ImageDraw

from app.extraction import ocr_engine
from app.extraction.parameter_parser import parse_parameters
from app.extraction.ocr_engine import (
	OCRUnavailableError,
	extract_text_from_image,
	extract_text_from_scanned_pdf,
)
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


@pytest.mark.parametrize(
	("text", "expected_value"),
	[
		("pH | 7.2", 7.2),
		("pH - 7.2", 7.2),
		("pH: 7,2", 7.2),
	],
)
def test_parameter_parser_handles_common_ocr_separators_and_decimal_commas(
	text: str,
	expected_value: float,
) -> None:
	assert parse_parameters(text) == [
		{"parameter": "pH", "value": expected_value, "unit": ""},
	]


def test_parameter_parser_uses_average_from_pipe_delimited_ocr_table() -> None:
	text = """\
Parameter | Unit | Standard (Limit) | Min | Avg | Max | Status
pH | - | 6.5 - 8.5 | 6.9 | 7.4 | 7.9 | Compliant
Turbidity | NTU | <= 1.0 (5.0 max) | 0.1 | 0.4 | 1.8 | Compliant
"""

	assert parse_parameters(text) == [
		{"parameter": "pH", "value": 7.4, "unit": ""},
		{"parameter": "Turbidity", "value": 0.4, "unit": "NTU"},
	]


def test_parameter_parser_extracts_end_readings_from_ocr_raw_end_table() -> None:
	text = """\
pH
Raw
7.5
Total Hardness
Raw
432
End
282
Iron (as Fe)
Raw
0.18
End
0.05
Chloride (as
Raw
43
Cl)
End
23
Fluoride (as F)
Raw
1.06
1.03
D
issolved
Raw
580
Solids (TDS)
End
390
itrate (as
Raw
14.2
NO3)
End
5.6
"""

	assert parse_parameters(text) == [
		{"parameter": "pH", "value": 7.5, "unit": ""},
		{"parameter": "Total Hardness", "value": 282.0, "unit": ""},
		{"parameter": "Iron", "value": 0.05, "unit": ""},
		{"parameter": "Chloride", "value": 23.0, "unit": ""},
		{"parameter": "Fluoride", "value": 1.03, "unit": ""},
		{"parameter": "TDS", "value": 390.0, "unit": ""},
		{"parameter": "Nitrate", "value": 5.6, "unit": ""},
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


def test_scanned_pdf_uses_ocr_provider_on_each_page() -> None:
	document = fitz.open()
	document.new_page()
	document.new_page()
	pdf_data = document.tobytes()
	document.close()
	seen_images: list[bytes] = []

	def provider(image_data: bytes) -> str:
		seen_images.append(image_data)
		return "pH: 7.0"

	result = extract_text_from_scanned_pdf(pdf_data, provider)

	assert len(seen_images) == 2
	assert result["page_count"] == 2
	assert result["pages"] == ["pH: 7.0", "pH: 7.0"]


def test_image_ocr_without_provider_reports_unavailability() -> None:
	try:
		extract_text_from_image(b"image")
	except OCRUnavailableError as error:
		assert "OCR is not configured" in str(error)
	else:
		raise AssertionError("Image OCR must require a provider")


def test_missing_ocr_dependency_does_not_prevent_api_startup(monkeypatch) -> None:
	original_import_module = ocr_engine.import_module

	def import_without_pillow(name: str, package: str | None = None):
		if name == "PIL.Image":
			raise ModuleNotFoundError("No module named 'PIL'")
		return original_import_module(name, package)

	monkeypatch.setattr(ocr_engine, "import_module", import_without_pillow)

	with pytest.raises(OCRUnavailableError, match="Install the backend requirements"):
		ocr_engine.tesseract_ocr(b"image")


def test_tesseract_ocr_recovers_pH_label_from_left_column(monkeypatch) -> None:
	image_buffer = BytesIO()
	Image.new("RGB", (200, 300), "white").save(image_buffer, format="PNG")
	pytesseract = SimpleNamespace(
		pytesseract=SimpleNamespace(
			tesseract_cmd="",
			TesseractNotFoundError=RuntimeError,
			TesseractError=RuntimeError,
		),
		image_to_string=lambda image, **kwargs: (
			"SN\nRaw\n7.5\nTotal Hardness\nRaw\n432"
			if image.width == 800
			else "pH\nTotal Hardness"
		),
	)
	original_import_module = ocr_engine.import_module

	def import_with_fake_tesseract(name: str, package: str | None = None):
		if name == "pytesseract":
			return pytesseract
		return original_import_module(name, package)

	monkeypatch.setattr(ocr_engine, "import_module", import_with_fake_tesseract)

	text = ocr_engine.tesseract_ocr(image_buffer.getvalue())

	assert text.startswith("pH\n")
	assert parse_parameters(text)[0] == {"parameter": "pH", "value": 7.5, "unit": ""}


def test_pdf_extraction_uses_ocr_for_pages_without_embedded_text() -> None:
	document = fitz.open()
	document.new_page()
	pdf_data = document.tobytes()
	document.close()
	seen_images: list[bytes] = []

	def provider(image_data: bytes) -> str:
		seen_images.append(image_data)
		return "pH: 7.2"

	result = extract_pdf_text(pdf_data, provider)

	assert len(seen_images) == 1
	assert result["pages"] == ["pH: 7.2"]
	assert result["extracted_text"] == "pH: 7.2"


def test_pdf_extraction_uses_original_dominant_scanned_image() -> None:
	source_image = Image.new("RGB", (300, 500), "white")
	ImageDraw.Draw(source_image).text((30, 30), "Water report", fill="black")
	image_buffer = BytesIO()
	source_image.save(image_buffer, format="PNG")
	image_data = image_buffer.getvalue()

	document = fitz.open()
	page = document.new_page(width=595, height=842)
	page.insert_image(
		fitz.Rect(160, 0, 435, 842),
		stream=image_data,
		keep_proportion=False,
	)
	pdf_data = document.tobytes()
	document.close()

	document = fitz.open(stream=pdf_data, filetype="pdf")
	page = document[0]
	expected_embedded_image = document.extract_image(page.get_images(full=True)[0][0])["image"]
	document.close()

	seen_images: list[bytes] = []

	def provider(ocr_image: bytes) -> str:
		seen_images.append(ocr_image)
		return "pH\nRaw\n7.5"

	result = extract_pdf_text(pdf_data, provider)

	assert seen_images == [expected_embedded_image]
	assert result["pages"] == ["pH\nRaw\n7.5"]


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
