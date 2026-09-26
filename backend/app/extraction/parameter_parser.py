import re


_PARAMETER_ALIASES = {
	"pH": ("pH",),
	"TDS": ("TDS", "total dissolved solids"),
	"Turbidity": ("turbidity",),
	"Total Hardness": ("total hardness", "hardness"),
	"Chloride": ("chloride", "cl-"),
	"Fluoride": ("fluoride", "fluor ide", "f-"),
	"Nitrate": ("nitrate", "no3"),
	"Iron": ("iron", "fe"),
}
_NUMBER_PATTERN = r"([-+]?(?:\d+(?:\.\d*)?|\.\d+))"
_UNIT_PATTERN = r"\s*(mg\s*/\s*L|µg\s*/\s*L|μg\s*/\s*L|ug\s*/\s*L|mg\s*/\s*dL|ppm|NTU)?"


def parse_parameters(text: str) -> list[dict[str, float | str]]:
	"""Parse explicitly labelled numeric values; absent values are omitted."""
	if not text:
		return []

	found: list[dict[str, float | str]] = []
	for canonical_name, aliases in _PARAMETER_ALIASES.items():
		for alias in aliases:
			pattern = re.compile(
				rf"(?<![A-Za-z]){re.escape(alias)}(?![A-Za-z])\s*[:=]?\s*"
				rf"{_NUMBER_PATTERN}{_UNIT_PATTERN}",
				re.IGNORECASE,
			)
			match = pattern.search(text)
			if match:
				unit = re.sub(r"\s+", "", match.group(2) or "")
				found.append(
					{
						"parameter": canonical_name,
						"value": float(match.group(1)),
						"unit": unit,
					}
				)
				break
	return found
