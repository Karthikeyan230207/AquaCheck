from dataclasses import dataclass


@dataclass(frozen=True)
class ReferenceRange:
	unit: str
	minimum: float | None
	maximum: float | None
	permissible_minimum: float | None = None
	permissible_maximum: float | None = None


STANDARDS: dict[str, ReferenceRange] = {
	"pH": ReferenceRange("", 6.5, 8.5),
	"TDS": ReferenceRange("mg/L", 0, 500, permissible_maximum=2000),
	"Turbidity": ReferenceRange("NTU", 0, 1, permissible_maximum=5),
	"Total Hardness": ReferenceRange("mg/L", 0, 200, permissible_maximum=600),
	"Chloride": ReferenceRange("mg/L", 0, 250, permissible_maximum=1000),
	"Fluoride": ReferenceRange("mg/L", 0, 1, permissible_maximum=1.5),
	"Nitrate": ReferenceRange("mg/L", 0, 45),
	"Iron": ReferenceRange("mg/L", 0, 0.3, permissible_maximum=1),
}
