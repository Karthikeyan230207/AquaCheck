from app.schemas.analysis import AnalysisResult


def build_explanation_prompt(analysis: AnalysisResult) -> str:
	return (
		"Explain the following rule-based water quality analysis in plain language. "
		"Do not change statuses, make new safety claims, or provide medical advice. "
		f"Analysis: {analysis.model_dump_json()}"
	)
