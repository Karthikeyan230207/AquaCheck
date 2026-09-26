from app.analysis.standards import ReferenceRange


def classify_value(value: float | None, standard: ReferenceRange | None) -> str:
	if value is None or standard is None:
		return "unavailable"

	lower_limit = standard.permissible_minimum
	upper_limit = standard.permissible_maximum
	if lower_limit is None:
		lower_limit = standard.minimum
	if upper_limit is None:
		upper_limit = standard.maximum

	if lower_limit is not None and value < lower_limit:
		return "outside_range"
	if upper_limit is not None and value > upper_limit:
		return "outside_range"

	if standard.minimum is not None and value < standard.minimum:
		return "attention"
	if standard.maximum is not None and value > standard.maximum:
		return "attention"
	return "within_range"
