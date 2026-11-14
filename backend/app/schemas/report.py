from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.analysis import AnalysisResult
from app.schemas.parameter import WaterParameter


class ReportUploadResponse(BaseModel):
	model_config = ConfigDict(extra="forbid")

	report_id: str
	filename: str
	content_type: str
	size_bytes: int = Field(ge=1)
	status: Literal["uploaded"] = "uploaded"


class ReportAnalysisResponse(BaseModel):
	model_config = ConfigDict(extra="forbid")

	report_id: str
	filename: str
	content_type: str
	size_bytes: int = Field(ge=1)
	page_count: int = Field(ge=1)
	extracted_parameters: list[WaterParameter]
	analysis: AnalysisResult
	saved_to_history: bool = False


class ReportAnalysisJobResponse(BaseModel):
	model_config = ConfigDict(extra="forbid")

	job_id: str
	status: Literal["queued", "processing", "completed", "failed"]
	result: ReportAnalysisResponse | None = None
	error: str | None = None
	error_code: int | None = None


class ReportHistoryItem(BaseModel):
	model_config = ConfigDict(extra="forbid")

	report_id: str
	filename: str
	page_count: int = Field(ge=1)
	created_at: datetime
	analysis: AnalysisResult


class ReportHistoryResponse(BaseModel):
	model_config = ConfigDict(extra="forbid")

	reports: list[ReportHistoryItem]
	page: int = Field(ge=1)
	page_size: int = Field(ge=1)
	total: int = Field(ge=0)
	total_pages: int = Field(ge=0)
	has_next: bool
	has_previous: bool
