from collections.abc import Sequence


RECOMMENDATIONS: dict[str, str] = {
	"pH": "Consider checking treatment or source conditions and retesting the water.",
	"TDS": "Review dissolved-solids sources and consider appropriate treatment.",
	"Turbidity": "Inspect filtration and clarify the sample before use.",
	"Total Hardness": "Consider a suitable softening treatment if hardness is a concern.",
	"Chloride": "Check for saltwater intrusion or other chloride sources.",
	"Fluoride": "Consult a qualified water professional about fluoride treatment.",
	"Nitrate": "Check for agricultural or wastewater sources and seek expert advice.",
	"Iron": "Inspect for corrosion or iron sources and consider filtration.",
}


def make_recommendations(parameters: Sequence[dict[str, object]]) -> list[str]:
	recommendations: list[str] = []
	for item in parameters:
		if item.get("status") in {"attention", "outside_range"}:
			recommendation = RECOMMENDATIONS.get(str(item.get("parameter")))
			if recommendation and recommendation not in recommendations:
				recommendations.append(recommendation)
	if not recommendations:
		if any(item.get("value") is not None for item in parameters):
			recommendations.append("No attention or out-of-range results were identified. Follow routine testing guidance.")
		else:
			recommendations.append("No usable measurements were available to generate recommendations.")
	return recommendations
