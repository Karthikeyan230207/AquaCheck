from fastapi import APIRouter

from app.analysis.analyzer import analyze_parameters
from app.schemas.analysis import AnalysisRequest, AnalysisResult


router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResult)
def analyze(request: AnalysisRequest) -> AnalysisResult:
	return AnalysisResult.model_validate(analyze_parameters(request.parameters))
