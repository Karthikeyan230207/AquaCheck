from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	supabase_url: str | None = None
	supabase_key: str | None = None
	mongodb_uri: str | None = None
	mongodb_database: str = "aquacheck"
	frontend_origins: str = "http://localhost:3000"
	max_upload_size_bytes: int = 20 * 1024 * 1024
	explanation_model_path: str | None = None

	model_config = SettingsConfigDict(
		env_file=".env",
		env_file_encoding="utf-8",
		extra="ignore",
	)


settings = Settings()
