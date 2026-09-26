from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ReportUploadResponse(BaseModel):
	model_config = ConfigDict(extra="forbid")

	report_id: str
	filename: str
	content_type: str
	size_bytes: int = Field(ge=1)
	status: Literal["uploaded"] = "uploaded"
