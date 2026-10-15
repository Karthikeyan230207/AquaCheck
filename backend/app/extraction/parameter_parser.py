import re


_PARAMETER_ALIASES = {
	"pH": ("pH",),
	"TDS": (
		"TDS",
		"total dissolved solids",
		"dissolved solids",
		"issolved",
		"solids",
	),
	"Turbidity": ("turbidity",),
	"Total Hardness": ("total hardness", "hardness"),
	"Chloride": ("chloride", "cl-", "cl"),
	"Fluoride": ("fluoride", "fluor ide", "f-", "f"),
	"Nitrate": ("nitrate", "itrate", "no3", "no₃"),
	"Iron": ("iron", "fe"),
}
_NUMBER_PATTERN = r"([-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+))"
_NUMBER_RE = re.compile(_NUMBER_PATTERN)
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
	delimited_rows = [line.split("|") for line in lines if "|" in line]
	if delimited_rows:
		header_index = next(
			(
				index
				for index, cells in enumerate(delimited_rows)
				if len(cells) >= 2
				and cells[0].strip().casefold() in {"parameter", "name", "analyte"}
			),
			None,
		)
		if header_index is not None:
			headers = [cell.strip().casefold() for cell in delimited_rows[header_index]]
			value_index = next(
				(
					index
					for index, header in enumerate(headers)
					if header in {"avg", "average", "result", "value", "reading"}
				),
				None,
			)
			if value_index is not None:
				table_parameters: list[dict[str, float | str]] = []
				for cells in delimited_rows[header_index + 1 :]:
					if len(cells) <= value_index:
						continue
					row_name = cells[0].strip().casefold()
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
					value_match = re.fullmatch(_NUMBER_PATTERN, cells[value_index].strip())
					if canonical_name is None or value_match is None:
						continue
					unit_index = next(
						(index for index, header in enumerate(headers) if header == "unit"),
						None,
					)
					unit = (
						re.sub(r"\s+", "", cells[unit_index].strip())
						if unit_index is not None and len(cells) > unit_index
						else ""
					)
					if unit == "-":
						unit = ""
					table_parameters.append(
						{
							"parameter": canonical_name,
							"value": float(value_match.group(1).replace(",", ".")),
							"unit": unit,
						}
					)
				if table_parameters:
					return table_parameters

	raw_end_parameters = _parse_raw_end_rows(text)
	if raw_end_parameters:
		return raw_end_parameters

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
			average_match = re.fullmatch(_NUMBER_PATTERN, average)
			if average_match is None:
				continue
			unit = "" if lines[index + 1] == "-" else re.sub(r"\s+", "", lines[index + 1])
			table_parameters.append(
				{
					"parameter": canonical_name,
					"value": float(average_match.group(1).replace(",", ".")),
					"unit": unit,
				}
			)
		if table_parameters:
			return table_parameters

	found: list[dict[str, float | str]] = []
	for canonical_name, aliases in _PARAMETER_ALIASES.items():
		for alias in aliases:
			pattern = re.compile(
				rf"(?<![A-Za-z]){re.escape(alias)}(?![A-Za-z])"
				rf"(?:\s*[:=|]\s*|\s+-\s+)?\s*"
				rf"{_NUMBER_PATTERN}{_UNIT_PATTERN}",
				re.IGNORECASE,
			)
			match = pattern.search(text)
			if match:
				unit = re.sub(r"\s+", "", match.group(2) or "")
				found.append(
					{
						"parameter": canonical_name,
						"value": float(match.group(1).replace(",", ".")),
						"unit": unit,
					}
				)
				break
	return found


def _parse_raw_end_rows(text: str) -> list[dict[str, float | str]]:
	"""Parse OCR'd tables where each parameter has separate Raw and End readings."""
	label_matches: list[tuple[int, int, str]] = []
	for canonical_name, aliases in _PARAMETER_ALIASES.items():
		for alias in aliases:
			alias_pattern = r"\s+".join(re.escape(part) for part in alias.split())
			pattern = re.compile(
				rf"(?<![A-Za-z]){alias_pattern}(?![A-Za-z])",
				re.IGNORECASE,
			)
			label_matches.extend(
				(match.start(), match.end(), canonical_name)
				for match in pattern.finditer(text)
			)

	label_matches.sort()
	rows: list[dict[str, float | str]] = []
	seen: set[str] = set()
	for index, (_, end, canonical_name) in enumerate(label_matches):
		if canonical_name in seen:
			continue
		next_label = next(
			(
				match_start
				for match_start, _, next_name in label_matches[index + 1 :]
				if next_name != canonical_name
			),
			len(text),
		)
		row_text = text[end:next_label]
		row_context = row_text[:120]
		end_match = re.search(
			rf"\bend\b[^\d+-]{{0,24}}{_NUMBER_PATTERN}",
			row_context,
			re.IGNORECASE,
		)
		if end_match is None:
			raw_marker = re.search(r"\braw\b", row_context, re.IGNORECASE)
			raw_values = (
				list(_NUMBER_RE.finditer(row_context[raw_marker.end() :]))
				if raw_marker is not None
				else []
			)
			value_text = raw_values[-1].group(1) if raw_values else None
		else:
			value_text = end_match.group(1)

		if value_text is None:
			continue
		rows.append(
			{
				"parameter": canonical_name,
				"value": float(value_text.replace(",", ".")),
				"unit": "",
			}
		)
		seen.add(canonical_name)
	return rows
