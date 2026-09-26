from typing import Any

from app.config.settings import settings


def get_supabase_client() -> Any | None:
	"""Create a Supabase client only when credentials are configured."""
	if not settings.supabase_url or not settings.supabase_key:
		return None

	try:
		from supabase import create_client
	except ImportError as error:
		raise RuntimeError("Install supabase to enable database and storage integration") from error

	return create_client(settings.supabase_url, settings.supabase_key)
