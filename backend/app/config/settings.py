from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	supabase_url: str | None = None
	supabase_key: str | None = None
	mongodb_uri: str | None = None
	mongodb_database: str = "aquacheck"
	mongodb_timeout_ms: int = Field(default=10_000, gt=0)
	mongodb_server_selection_timeout_ms: int = Field(default=5_000, gt=0)
	mongodb_connect_timeout_ms: int = Field(default=5_000, gt=0)
	mongodb_socket_timeout_ms: int = Field(default=10_000, gt=0)
	frontend_origins: str = "http://localhost:3000"
	max_upload_size_bytes: int = Field(default=20 * 1024 * 1024, gt=0)
	max_pdf_pages: int = Field(default=20, gt=0)
	max_image_dimension_px: int = Field(default=8000, gt=0)
	max_image_pixels: int = Field(default=25_000_000, gt=0)
	max_concurrent_uploads: int = Field(default=3, gt=0)
	ocr_timeout_seconds: int = Field(default=20, gt=0)
	ocr_tesseract_cmd: str | None = None
	ocr_language: str = "eng"
	ocr_dpi: int = 200

	model_config = SettingsConfigDict(
		env_file=".env",
		env_file_encoding="utf-8",
		extra="ignore",
	)


settings = Settings()
