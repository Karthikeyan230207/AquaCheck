from types import SimpleNamespace

from app.analysis.analyzer import analyze_parameters
from app.analysis.rules import classify_value
from app.analysis.standards import STANDARDS


def test_analysis_classifies_values_and_recommends_actions() -> None:
	input_parameters = [
		SimpleNamespace(parameter="pH", value=7.0, unit=""),
		SimpleNamespace(parameter="TDS", value=1200, unit="mg/L"),
		SimpleNamespace(parameter="Iron", value=1.2, unit="mg/L"),
	]

	result = analyze_parameters(input_parameters)

	assert [item["status"] for item in result["parameters"]] == [
		"within_range",
		"attention",
		"outside_range",
	]
	assert result["overall_score"] == 50.0
	assert len(result["recommendations"]) == 2


def test_score_is_unavailable_when_too_few_values_exist() -> None:
	result = analyze_parameters([SimpleNamespace(parameter="pH", value=7.0, unit="")])

	assert result["overall_score"] is None


def test_missing_values_are_unavailable_not_guessed() -> None:
	assert classify_value(None, STANDARDS["pH"]) == "unavailable"
