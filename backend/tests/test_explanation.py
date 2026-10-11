from app.ai.explanation import explain_analysis
from app.schemas.analysis import AnalysisResult


def _analysis() -> AnalysisResult:
	return AnalysisResult.model_validate(
		{
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
	)


def test_explanation_describes_reference_status_and_limits() -> None:
	analysis = _analysis()
	analysis.parameters[0].unit = "mg/L"

	res = explain_analysis(analysis, lang="en")
	assert "Attention needed!" in res
	assert "pH is elevated / out of range" in res
	assert "Retest the sample." in res


def test_explanation_multilingual_support() -> None:
	analysis = _analysis()

	es_text = explain_analysis(analysis, lang="es")
	assert "¡Se requiere atención!" in es_text
	assert "El pH está fuera de rango" in es_text

	hi_text = explain_analysis(analysis, lang="hi")
	assert "ध्यान दें!" in hi_text
	assert "pH सीमा से बाहर है" in hi_text

	ta_text = explain_analysis(analysis, lang="ta")
	assert "கவனம் தேவை!" in ta_text
	assert "pH அளவுக்கு அதிகமாக ஆக உள்ளது" in ta_text


def test_explanation_all_good_scenario() -> None:
	analysis = AnalysisResult.model_validate(
		{
			"parameters": [
				{
					"parameter": "pH",
					"value": 7.2,
					"unit": "",
					"status": "within_range",
					"reference_minimum": 6.5,
					"reference_maximum": 8.5,
					"permissible_minimum": None,
					"permissible_maximum": None,
				}
			],
			"overall_score": 100.0,
			"score_method": "test score method",
			"recommendations": [],
		}
	)

	res = explain_analysis(analysis, lang="en")
	assert "Everything in this water test looks clean" in res


def test_explanation_handles_empty_measurements() -> None:
	analysis = AnalysisResult.model_validate(
		{
			"parameters": [],
			"overall_score": None,
			"score_method": "test score method",
			"recommendations": [],
		}
	)

	assert "No water quality measurements were provided" in explain_analysis(analysis)
