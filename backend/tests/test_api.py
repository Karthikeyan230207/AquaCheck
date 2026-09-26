import fitz
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint() -> None:
	response = client.get("/api/health")

	assert response.status_code == 200
	assert response.json() == {"status": "ok"}


def test_swagger_docs_are_available() -> None:
	response = client.get("/docs")

	assert response.status_code == 200
	assert "swagger-ui" in response.text


def test_upload_rejects_unsupported_file_type() -> None:
	response = client.post(
		"/api/reports/upload",
		files={"file": ("notes.txt", b"not a report", "text/plain")},
	)

	assert response.status_code == 415


def test_upload_accepts_pdf_and_returns_temporary_report_id() -> None:
	document = fitz.open()
	document.new_page()
	pdf_data = document.tobytes()
	document.close()

	response = client.post(
		"/api/reports/upload",
		files={"file": ("sample.pdf", pdf_data, "application/pdf")},
	)

	assert response.status_code == 201
	assert response.json()["status"] == "uploaded"
	assert response.json()["size_bytes"] == len(pdf_data)
	assert response.json()["report_id"]


def test_upload_rejects_mismatched_file_signature() -> None:
	response = client.post(
		"/api/reports/upload",
		files={"file": ("sample.pdf", b"not a PDF", "application/pdf")},
	)

	assert response.status_code == 400


def test_analysis_rejects_unknown_parameter() -> None:
	response = client.post(
		"/api/analysis/analyze",
		json={"parameters": [{"parameter": "temperature", "value": 10, "unit": "C"}]},
	)

	assert response.status_code == 422


def test_analysis_endpoint_returns_statuses_and_score_method() -> None:
	response = client.post(
		"/api/analysis/analyze",
		json={
			"parameters": [
				{"parameter": "pH", "value": 7.0, "unit": ""},
				{"parameter": "TDS", "value": 320, "unit": "mg/L"},
				{"parameter": "Iron", "value": 0.2, "unit": "mg/L"},
			]
		},
	)

	assert response.status_code == 200
	assert response.json()["overall_score"] == 100.0
	assert "within_range=100" in response.json()["score_method"]


def test_explanation_endpoint_uses_rule_based_fallback_without_model() -> None:
	response = client.post(
		"/api/ai/explain",
		json={
			"analysis": {
				"parameters": [
					{
						"parameter": "pH",
						"value": 9.0,
						"unit": "",
						"status": "outside_range",
						"reference_minimum": 6.5,
						"reference_maximum": 8.5,
						"permissible_minimum": None,
						"permissible_maximum": None,
					}
				],
				"overall_score": None,
				"score_method": "test score method",
				"recommendations": ["Retest the sample."],
			}
		},
	)

	assert response.status_code == 200
	assert "pH" in response.json()["explanation"]
	assert "outside range" in response.json()["explanation"]
