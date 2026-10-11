from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.ai.explanation import explain_analysis
from app.schemas.analysis import AnalysisResult
from app.schemas.parameter import ParameterName


router = APIRouter(prefix="/api/ai", tags=["explanations"])


# Lenient versions for the explain endpoint – extra fields from the frontend
# are silently ignored instead of raising a 422 validation error.
class LenientParameter(BaseModel):
	model_config = ConfigDict(extra="ignore")

	parameter: ParameterName
	value: float | None = None
	unit: str = ""
	status: str = "within_range"
	reference_minimum: float | None = None
	reference_maximum: float | None = None
	permissible_minimum: float | None = None
	permissible_maximum: float | None = None


class LenientAnalysisResult(BaseModel):
	model_config = ConfigDict(extra="ignore")

	parameters: list[LenientParameter] = []
	overall_score: float | None = None
	score_method: str = "unspecified"
	recommendations: list[str] = []


class ExplanationRequest(BaseModel):
	model_config = ConfigDict(extra="ignore")

	analysis: LenientAnalysisResult
	language: str = Field(default="en", description="Language code: en, es, hi, ta, fr")


class ExplanationResponse(BaseModel):
	explanation: str
	language: str


@router.post("/explain", response_model=ExplanationResponse)
def explain(request: ExplanationRequest) -> ExplanationResponse:
	# Convert lenient model → canonical AnalysisResult for the explain function
	canonical = AnalysisResult(
		parameters=[
			{
				"parameter": p.parameter,
				"value": p.value,
				"unit": p.unit,
				"status": p.status,
				"reference_minimum": p.reference_minimum,
				"reference_maximum": p.reference_maximum,
				"permissible_minimum": p.permissible_minimum,
				"permissible_maximum": p.permissible_maximum,
			}
			for p in request.analysis.parameters
		],
		overall_score=request.analysis.overall_score,
		score_method=request.analysis.score_method,
		recommendations=request.analysis.recommendations,
	)
	text = explain_analysis(canonical, lang=request.language)
	return ExplanationResponse(explanation=text, language=request.language)
