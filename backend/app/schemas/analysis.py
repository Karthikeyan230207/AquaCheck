from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.parameter import WaterParameter


ParameterStatus = Literal["within_range", "attention", "outside_range", "unavailable"]


class AnalysisRequest(BaseModel):
	model_config = ConfigDict(extra="forbid")

	parameters: list[WaterParameter] = Field(min_length=1, max_length=100)


class AnalyzedParameter(WaterParameter):
	status: ParameterStatus
	reference_minimum: float | None = None
	reference_maximum: float | None = None
	permissible_minimum: float | None = None
	permissible_maximum: float | None = None


class AnalysisResult(BaseModel):
	model_config = ConfigDict(extra="forbid")

	parameters: list[AnalyzedParameter]
	overall_score: float | None = Field(default=None, ge=0, le=100)
	score_method: str
	recommendations: list[str]
