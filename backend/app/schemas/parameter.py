import math
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


ParameterName = Literal[
	"pH",
	"TDS",
	"Turbidity",
	"Total Hardness",
	"Chloride",
	"Fluoride",
	"Nitrate",
	"Iron",
]

_PARAMETER_NAMES = {
	"ph": "pH",
	"tds": "TDS",
	"turbidity": "Turbidity",
	"hardness": "Total Hardness",
	"total hardness": "Total Hardness",
	"chloride": "Chloride",
	"fluoride": "Fluoride",
	"nitrate": "Nitrate",
	"iron": "Iron",
}


class WaterParameter(BaseModel):
	model_config = ConfigDict(extra="forbid")

	parameter: ParameterName
	value: float | None = Field(default=None, allow_inf_nan=False)
	unit: str = Field(default="", max_length=30)

	@field_validator("parameter", mode="before")
	@classmethod
	def normalize_parameter(cls, value: object) -> str:
		if not isinstance(value, str):
			raise ValueError("parameter must be a string")
		normalized = re.sub(r"\s+", " ", value.strip().lower())
		if normalized not in _PARAMETER_NAMES:
			raise ValueError("unsupported water-quality parameter")
		return _PARAMETER_NAMES[normalized]

	@field_validator("value")
	@classmethod
	def ensure_finite_value(cls, value: float | None) -> float | None:
		if value is not None and not math.isfinite(value):
			raise ValueError("value must be finite")
		return value
