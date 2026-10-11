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
_TABLE_HEADER = (
	"parameter",
	"unit",
	"standard (limit)",
	"min",
	"avg",
	"max",
	"status",
)


def parse_parameters(text: str) -> list[dict[str, float | str]]:
	"""Parse explicitly labelled numeric values; absent values are omitted."""
	if not text:
		return []

	lines = [line.strip() for line in text.splitlines()]
	header_start = next(
		(
			index
			for index in range(len(lines) - len(_TABLE_HEADER) + 1)
			if tuple(line.casefold() for line in lines[index : index + len(_TABLE_HEADER)])
			== _TABLE_HEADER
		),
		None,
	)
	if header_start is not None:
		table_parameters: list[dict[str, float | str]] = []
		for index in range(header_start + len(_TABLE_HEADER), len(lines) - 4):
			row_name = lines[index].casefold()
			canonical_name = next(
				(
					name
					for name, aliases in _PARAMETER_ALIASES.items()
					if any(
						row_name == alias.casefold()
						or row_name.startswith(alias.casefold() + " (")
						for alias in aliases
					)
				),
				None,
			)
			if canonical_name is None:
				continue

			average = lines[index + 4]
			if not re.fullmatch(_NUMBER_PATTERN, average):
				continue
			unit = "" if lines[index + 1] == "-" else re.sub(r"\s+", "", lines[index + 1])
			table_parameters.append(
				{
					"parameter": canonical_name,
					"value": float(average),
					"unit": unit,
				}
			)
		if table_parameters:
			return table_parameters

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
