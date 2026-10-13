from copy import deepcopy
from datetime import datetime, timezone
from types import SimpleNamespace
from collections.abc import Iterator

import fitz
import pytest
from fastapi.testclient import TestClient

from app.api import auth as auth_api
from app.api import reports as reports_api
from app.main import app


client = TestClient(app)


class FakeCursor:
	def __init__(self, documents: list[dict[str, object]]) -> None:
		self.documents = documents

	def sort(self, key: str, direction: int) -> "FakeCursor":
		self.documents.sort(key=lambda document: document[key], reverse=direction < 0)
		return self

	def limit(self, count: int) -> "FakeCursor":
		self.documents = self.documents[:count]
		return self

	def __iter__(self) -> Iterator[dict[str, object]]:
		return iter(self.documents)


class FakeReportsCollection:
	def __init__(self) -> None:
		self.documents: dict[str, dict[str, object]] = {}
		self.find_filters: list[dict[str, object]] = []
		self.indexes: list[list[tuple[str, int]]] = []

	def create_index(self, keys: list[tuple[str, int]]) -> None:
		self.indexes.append(keys)

	def insert_one(self, document: dict[str, object]) -> None:
		self.documents[str(document["_id"])] = deepcopy(document)

	def find(self, filter_document: dict[str, object], projection) -> FakeCursor:
		self.find_filters.append(filter_document)
		documents = [
			{key: value for key, value in document.items() if projection.get(key)}
			for document in self.documents.values()
			if document["user_id"] == filter_document["user_id"]
		]
		return FakeCursor(documents)

	def find_one(self, filter_document: dict[str, object], projection):
		document = self.documents.get(str(filter_document["_id"]))
		if document is None or document["user_id"] != filter_document["user_id"]:
			return None
		return {key: value for key, value in document.items() if projection.get(key)}

	def delete_one(self, filter_document: dict[str, object]):
		doc_id = str(filter_document.get("_id", ""))
		document = self.documents.get(doc_id)
		if document is not None and document.get("user_id") == filter_document.get("user_id"):
			del self.documents[doc_id]
			return SimpleNamespace(deleted_count=1)
		return SimpleNamespace(deleted_count=0)


@pytest.fixture(autouse=True)
def clear_auth_overrides():
	app.dependency_overrides.clear()
	yield
	app.dependency_overrides.clear()


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


def test_report_analysis_extracts_and_analyzes_pdf_measurements() -> None:
	document = fitz.open()
	page = document.new_page()
	page.insert_text((72, 72), "pH: 7.0\nTDS: 320 mg/L\nIron: 0.2 mg/L")
	pdf_data = document.tobytes()
	document.close()

	response = client.post(
		"/api/reports/analyze",
		files={"file": ("water-report.pdf", pdf_data, "application/pdf")},
	)

	assert response.status_code == 200
	result = response.json()
	assert result["filename"] == "water-report.pdf"
	assert result["page_count"] == 1
	assert [item["parameter"] for item in result["extracted_parameters"]] == [
		"pH",
		"TDS",
		"Iron",
	]
	assert [item["status"] for item in result["analysis"]["parameters"]] == [
		"within_range",
		"within_range",
		"within_range",
	]
	assert result["analysis"]["overall_score"] == 100.0


def test_report_analysis_uses_average_from_parameter_range_table() -> None:
	document = fitz.open()
	page = document.new_page()
	page.insert_text(
		(72, 72),
		"Parameter\nUnit\nStandard (Limit)\nMin\nAvg\nMax\nStatus\n"
		"pH\n-\n6.5 - 8.5\n6.9\n7.4\n7.9\nCompliant\n"
		"Turbidity\nNTU\n<= 1.0 (5.0 max)\n0.1\n0.4\n1.8\nMinor exceedance\n"
		"Total Dissolved Solids\nmg/L\n500 (2000 max)\n210\n286\n342\nCompliant",
	)
	pdf_data = document.tobytes()
	document.close()

	response = client.post(
		"/api/reports/analyze",
		files={"file": ("range-report.pdf", pdf_data, "application/pdf")},
	)

	assert response.status_code == 200
	result = response.json()
	assert [(item["parameter"], item["value"]) for item in result["extracted_parameters"]] == [
		("pH", 7.4),
		("Turbidity", 0.4),
		("TDS", 286.0),
	]
	assert [item["status"] for item in result["analysis"]["parameters"]] == [
		"within_range",
		"within_range",
		"within_range",
	]


def test_signed_in_analysis_saves_report_to_mongodb(monkeypatch) -> None:
	user = SimpleNamespace(user_id="owner-id", email="owner@example.com")
	collection = FakeReportsCollection()
	app.dependency_overrides[auth_api.get_optional_user] = lambda: user
	monkeypatch.setattr(reports_api, "get_reports_collection", lambda: collection)
	document = fitz.open()
	page = document.new_page()
	page.insert_text((72, 72), "pH: 7.0\nTDS: 320 mg/L\nIron: 0.2 mg/L")
	pdf_data = document.tobytes()
	document.close()

	response = client.post(
		"/api/reports/analyze",
		files={"file": ("water-report.pdf", pdf_data, "application/pdf")},
	)

	assert response.status_code == 200
	result = response.json()
	assert result["saved_to_history"] is True
	assert collection.documents[result["report_id"]]["user_id"] == "owner-id"
	assert collection.documents[result["report_id"]]["analysis"]["overall_score"] == 100.0


def test_report_history_requires_authentication() -> None:
	response = client.get("/api/reports")

	assert response.status_code == 401


def test_report_history_uses_verified_supabase_user_id(monkeypatch) -> None:
	user_id = "ecceca85-37c0-4ab5-965d-3e3f51e8a511"
	collection = FakeReportsCollection()
	monkeypatch.setattr(auth_api.settings, "supabase_url", "https://auth.example.test")
	monkeypatch.setattr(auth_api.settings, "supabase_key", "public-anon-key")
	monkeypatch.setattr(reports_api, "get_reports_collection", lambda: collection)

	class AuthResponse:
		status_code = 200
		is_error = False

		@staticmethod
		def json() -> dict[str, str]:
			return {"id": user_id, "email": "user@example.com"}

	class AuthClient:
		async def __aenter__(self):
			return self

		async def __aexit__(self, *_args: object) -> None:
			_ = _args
			return None

		async def get(self, url: str, headers: dict[str, str]) -> AuthResponse:
			assert url == "https://auth.example.test/auth/v1/user"
			assert headers == {
				"apikey": "public-anon-key",
				"Authorization": "Bearer verified-test-token",
			}
			return AuthResponse()

	monkeypatch.setattr(auth_api.httpx, "AsyncClient", AuthClient)

	response = client.get(
		"/api/reports",
		headers={"Authorization": "Bearer verified-test-token"},
	)

	assert response.status_code == 200
	assert collection.find_filters == [{"user_id": user_id}]


def test_report_history_rejects_invalid_supabase_token(monkeypatch) -> None:
	monkeypatch.setattr(auth_api.settings, "supabase_url", "https://auth.example.test")
	monkeypatch.setattr(auth_api.settings, "supabase_key", "public-anon-key")

	class AuthResponse:
		status_code = 401
		is_error = True

	class AuthClient:
		async def __aenter__(self):
			return self

		async def __aexit__(self, *_args: object) -> None:
			_ = _args
			return None

		async def get(self, url: str, headers: dict[str, str]) -> AuthResponse:
			assert url == "https://auth.example.test/auth/v1/user"
			assert headers["Authorization"] == "Bearer invalid-token"
			return AuthResponse()

	monkeypatch.setattr(auth_api.httpx, "AsyncClient", AuthClient)

	response = client.get(
		"/api/reports",
		headers={"Authorization": "Bearer invalid-token"},
	)

	assert response.status_code == 401
	assert response.json()["detail"] == "Access token is invalid or expired"


def test_report_history_and_detail_are_scoped_to_authenticated_user(monkeypatch) -> None:
	user = SimpleNamespace(user_id="owner-id", email="owner@example.com")
	collection = FakeReportsCollection()
	collection.insert_one(
		{
			"_id": "owned-report",
			"user_id": "owner-id",
			"filename": "mine.pdf",
			"content_type": "application/pdf",
			"size_bytes": 100,
			"page_count": 1,
			"extracted_parameters": [
				{"parameter": "pH", "value": 7.0, "unit": ""},
			],
			"analysis": {
				"parameters": [
					{
						"parameter": "pH",
						"value": 7.0,
						"unit": "",
						"status": "within_range",
						"reference_minimum": 6.5,
						"reference_maximum": 8.5,
						"permissible_minimum": None,
						"permissible_maximum": None,
					}
				],
				"overall_score": None,
				"score_method": "test score method",
				"recommendations": ["Routine retesting."],
			},
			"created_at": datetime.now(timezone.utc),
		}
	)
	collection.insert_one(
		{
			"_id": "other-report",
			"user_id": "different-owner",
			"filename": "other.pdf",
			"content_type": "application/pdf",
			"size_bytes": 100,
			"page_count": 1,
			"extracted_parameters": [],
			"analysis": {},
			"created_at": datetime.now(timezone.utc),
		}
	)
	app.dependency_overrides[auth_api.get_current_user] = lambda: user
	monkeypatch.setattr(reports_api, "get_reports_collection", lambda: collection)

	history_response = client.get("/api/reports")
	detail_response = client.get("/api/reports/owned-report")
	other_response = client.get("/api/reports/other-report")

	assert history_response.status_code == 200
	assert [report["report_id"] for report in history_response.json()["reports"]] == [
		"owned-report"
	]
	assert detail_response.status_code == 200
	assert detail_response.json()["filename"] == "mine.pdf"
	assert other_response.status_code == 404


def test_report_analysis_rejects_pdf_without_supported_measurements() -> None:
	document = fitz.open()
	page = document.new_page()
	page.insert_text((72, 72), "Water quality laboratory report")
	pdf_data = document.tobytes()
	document.close()

	response = client.post(
		"/api/reports/analyze",
		files={"file": ("report.pdf", pdf_data, "application/pdf")},
	)

	assert response.status_code == 422
	assert "No supported water-quality measurements" in response.json()["detail"]


def test_report_analysis_rejects_images_until_ocr_is_configured() -> None:
	response = client.post(
		"/api/reports/analyze",
		files={"file": ("report.png", b"\x89PNG\r\n\x1a\nimage", "image/png")},
	)

	assert response.status_code == 415


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


def test_explanation_endpoint_returns_rule_based_explanation() -> None:
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
	payload = response.json()
	assert payload["language"] == "en"
	assert "Attention needed!" in payload["explanation"]
	assert "pH is elevated / out of range" in payload["explanation"]
	assert "Retest the sample." in payload["explanation"]


def test_delete_report_success(monkeypatch) -> None:
	user_id = "user-abc-123"
	report_id = "report-xyz-789"
	user = SimpleNamespace(user_id=user_id, email="test@example.com")
	collection = FakeReportsCollection()
	collection.documents[report_id] = {
		"_id": report_id,
		"user_id": user_id,
		"filename": "test.pdf",
	}

	app.dependency_overrides[auth_api.get_current_user] = lambda: user
	monkeypatch.setattr(reports_api, "get_reports_collection", lambda: collection)

	response = client.delete(f"/api/reports/{report_id}")
	assert response.status_code == 200
	assert response.json() == {"message": "Report deleted successfully"}
	assert report_id not in collection.documents


def test_delete_report_not_found(monkeypatch) -> None:
	user_id = "user-abc-123"
	user = SimpleNamespace(user_id=user_id, email="test@example.com")
	collection = FakeReportsCollection()

	app.dependency_overrides[auth_api.get_current_user] = lambda: user
	monkeypatch.setattr(reports_api, "get_reports_collection", lambda: collection)

	response = client.delete("/api/reports/nonexistent-id")
	assert response.status_code == 404
	assert response.json()["detail"] == "Report not found"

