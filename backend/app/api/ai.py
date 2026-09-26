from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from app.ai.explanation import explain_analysis
from app.config.settings import settings
from app.schemas.analysis import AnalysisResult


router = APIRouter(prefix="/api/ai", tags=["explanations"])


class ExplanationRequest(BaseModel):
	model_config = ConfigDict(extra="forbid")

	analysis: AnalysisResult


class ExplanationResponse(BaseModel):
	explanation: str


@router.post("/explain", response_model=ExplanationResponse)
def explain(request: ExplanationRequest) -> ExplanationResponse:
	return ExplanationResponse(
		explanation=explain_analysis(request.analysis, settings.explanation_model_path)
	)
