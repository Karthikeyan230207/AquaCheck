from app.schemas.analysis import AnalysisResult


def explain_analysis(analysis: AnalysisResult, model_path: str | None = None) -> str:
	if model_path:
		from app.ai.model import generate_local_explanation
		from app.ai.prompts import build_explanation_prompt

		return generate_local_explanation(build_explanation_prompt(analysis), model_path)

	if not analysis.parameters:
		return "No water-quality measurements were available to explain."

	concerning = [
		item for item in analysis.parameters if item.status in {"attention", "outside_range"}
	]
	if not concerning:
		return "All reported measurements are within the selected reference ranges."

	items = ", ".join(
		f"{item.parameter} ({item.value:g} {item.unit}) is {item.status.replace('_', ' ')}"
		for item in concerning
	)
	return (
		f"Review these measurements: {items}. The status is based on the configured "
		"reference ranges; consider discussing the results with a qualified water professional."
	)
