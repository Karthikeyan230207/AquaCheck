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


def test_explanation_uses_plain_language_and_does_not_repeat_lab_recommendations() -> None:
	analysis = _analysis()

	res = explain_analysis(analysis, lang="en")
	assert "Some results are outside the suggested ranges." in res
	assert "The water's acid balance is above the suggested range. The result was 9." in res
	assert "Ask a local water-testing lab what to do" in res
	assert "Retest the sample." not in res
	assert "Total Dissolved Solids" not in res


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


def test_non_english_explanations_do_not_append_english_recommendations() -> None:
	analysis = _analysis()
	analysis.recommendations = ["Retest the sample."]

	for language, localized_advice in (
		("es", "Consulte las acciones recomendadas en el informe."),
		("hi", "रिपोर्ट में दिए गए सुझाए गए कदम देखें।"),
		("ta", "அறிக்கையில் பரிந்துரைக்கப்பட்ட நடவடிக்கைகளைப் பார்க்கவும்."),
		("fr", "Consultez les actions recommandées dans le rapport."),
	):
		text = explain_analysis(analysis, lang=language)

		assert localized_advice in text
		assert "Retest the sample." not in text


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
	assert "The results shown are within the suggested ranges." in res


def test_explanation_handles_empty_measurements() -> None:
	analysis = AnalysisResult.model_validate(
		{
			"parameters": [],
			"overall_score": None,
			"score_method": "test score method",
			"recommendations": [],
		}
	)

	assert "No water test results were found" in explain_analysis(analysis)


def test_explanation_handles_measurements_without_numeric_values() -> None:
	analysis = _analysis()
	parameter = analysis.parameters[0]
	parameter.value = None
	parameter.status = "unavailable"
	parameter.reference_minimum = None
	parameter.reference_maximum = None

	assert "No numeric results were found" in explain_analysis(analysis)
