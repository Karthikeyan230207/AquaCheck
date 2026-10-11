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


def test_all_supported_parameters_standards_and_limits() -> None:
	expected_params = [
		("pH", "", 6.5, 8.5, None, None),
		("TDS", "mg/L", 0, 500, None, 2000),
		("Turbidity", "NTU", 0, 1, None, 5),
		("Total Hardness", "mg/L", 0, 200, None, 600),
		("Chloride", "mg/L", 0, 250, None, 1000),
		("Fluoride", "mg/L", 0, 1, None, 1.5),
		("Nitrate", "mg/L", 0, 45, None, None),
		("Iron", "mg/L", 0, 0.3, None, 1.0),
	]
	for param, unit, min_val, max_val, perm_min, perm_max in expected_params:
		std = STANDARDS[param]
		assert std.unit == unit
		assert std.minimum == min_val
		assert std.maximum == max_val
		assert std.permissible_minimum == perm_min
		assert std.permissible_maximum == perm_max


def test_borderline_and_threshold_classifications() -> None:
	# pH exact limits: 6.5 and 8.5 are within_range, 6.49 and 8.51 are outside_range (no permissible range)
	assert classify_value(6.5, STANDARDS["pH"]) == "within_range"
	assert classify_value(8.5, STANDARDS["pH"]) == "within_range"
	assert classify_value(6.49, STANDARDS["pH"]) == "outside_range"
	assert classify_value(8.51, STANDARDS["pH"]) == "outside_range"

	# TDS: 500 is within_range, 500.1 is attention (up to 2000), 2000 is attention, 2000.1 is outside_range
	assert classify_value(500.0, STANDARDS["TDS"]) == "within_range"
	assert classify_value(501.0, STANDARDS["TDS"]) == "attention"
	assert classify_value(2000.0, STANDARDS["TDS"]) == "attention"
	assert classify_value(2000.1, STANDARDS["TDS"]) == "outside_range"

	# Turbidity: 1.0 is within_range, 1.1 to 5.0 is attention, > 5.0 is outside_range
	assert classify_value(1.0, STANDARDS["Turbidity"]) == "within_range"
	assert classify_value(1.1, STANDARDS["Turbidity"]) == "attention"
	assert classify_value(5.0, STANDARDS["Turbidity"]) == "attention"
	assert classify_value(5.1, STANDARDS["Turbidity"]) == "outside_range"

	# Nitrate: 45.0 is within_range, 45.1 is outside_range
	assert classify_value(45.0, STANDARDS["Nitrate"]) == "within_range"
	assert classify_value(45.1, STANDARDS["Nitrate"]) == "outside_range"

	# Iron: 0.3 is within_range, 0.31 to 1.0 is attention, > 1.0 is outside_range
	assert classify_value(0.3, STANDARDS["Iron"]) == "within_range"
	assert classify_value(0.5, STANDARDS["Iron"]) == "attention"
	assert classify_value(1.0, STANDARDS["Iron"]) == "attention"
	assert classify_value(1.01, STANDARDS["Iron"]) == "outside_range"


def test_insufficient_data_never_declares_water_safe_or_scored() -> None:
	# 0 parameters
	res_empty = analyze_parameters([])
	assert res_empty["overall_score"] is None
	assert "No usable measurements" in res_empty["recommendations"][0]

	# 1 parameter only: not enough data to score
	res_single = analyze_parameters([SimpleNamespace(parameter="pH", value=7.2, unit="")])
	assert res_single["overall_score"] is None

	# 2 parameters only: not enough data to score (minimum 3 required)
	res_two = analyze_parameters([
		SimpleNamespace(parameter="pH", value=7.2, unit=""),
		SimpleNamespace(parameter="TDS", value=200, unit="mg/L"),
	])
	assert res_two["overall_score"] is None

	# Parameters with null/missing values do not count towards minimum scored threshold
	res_missing = analyze_parameters([
		SimpleNamespace(parameter="pH", value=7.2, unit=""),
		SimpleNamespace(parameter="TDS", value=None, unit="mg/L"),
		SimpleNamespace(parameter="Iron", value=None, unit="mg/L"),
	])
	assert res_missing["overall_score"] is None


def test_all_safe_and_all_unsafe_scoring() -> None:
	# All safe
	all_safe = [
		SimpleNamespace(parameter="pH", value=7.4, unit=""),
		SimpleNamespace(parameter="TDS", value=300, unit="mg/L"),
		SimpleNamespace(parameter="Turbidity", value=0.5, unit="NTU"),
		SimpleNamespace(parameter="Nitrate", value=10.0, unit="mg/L"),
		SimpleNamespace(parameter="Iron", value=0.1, unit="mg/L"),
	]
	res_safe = analyze_parameters(all_safe)
	assert res_safe["overall_score"] == 100.0
	assert all(p["status"] == "within_range" for p in res_safe["parameters"])

	# All unsafe
	all_unsafe = [
		SimpleNamespace(parameter="pH", value=10.0, unit=""),
		SimpleNamespace(parameter="TDS", value=2500, unit="mg/L"),
		SimpleNamespace(parameter="Turbidity", value=10.0, unit="NTU"),
		SimpleNamespace(parameter="Nitrate", value=80.0, unit="mg/L"),
		SimpleNamespace(parameter="Iron", value=2.5, unit="mg/L"),
	]
	res_unsafe = analyze_parameters(all_unsafe)
	assert res_unsafe["overall_score"] == 0.0
	assert all(p["status"] == "outside_range" for p in res_unsafe["parameters"])
	assert len(res_unsafe["recommendations"]) == 5

