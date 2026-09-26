from collections.abc import Sequence
from typing import Any

from app.analysis.recommendations import make_recommendations
from app.analysis.rules import classify_value
from app.analysis.scoring import SCORE_METHOD, calculate_score
from app.analysis.standards import STANDARDS


def analyze_parameters(parameters: Sequence[Any]) -> dict[str, Any]:
	analyzed: list[dict[str, Any]] = []
	for item in parameters:
		parameter = item.parameter
		value = item.value
		standard = STANDARDS.get(parameter)
		unit = item.unit or (standard.unit if standard else "")
		status = classify_value(value, standard)
		analyzed.append(
			{
				"parameter": parameter,
				"value": value,
				"unit": unit,
				"status": status,
				"reference_minimum": standard.minimum if standard else None,
				"reference_maximum": standard.maximum if standard else None,
				"permissible_minimum": standard.permissible_minimum if standard else None,
				"permissible_maximum": standard.permissible_maximum if standard else None,
			}
		)

	statuses = [item["status"] for item in analyzed]
	return {
		"parameters": analyzed,
		"overall_score": calculate_score(statuses),
		"score_method": SCORE_METHOD,
		"recommendations": make_recommendations(analyzed),
	}
