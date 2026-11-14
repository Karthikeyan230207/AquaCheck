from app.config.settings import settings
from app.services import mongodb_service


def test_mongo_client_uses_configured_database_timeouts(monkeypatch) -> None:
	client_options: dict[str, object] = {}

	def fake_mongo_client(uri: str, **kwargs):
		assert uri == "mongodb://example.test"
		client_options.update(kwargs)
		return object()

	monkeypatch.setattr(settings, "mongodb_uri", "mongodb://example.test")
	monkeypatch.setattr(mongodb_service, "MongoClient", fake_mongo_client)
	mongodb_service.get_mongo_client.cache_clear()
	try:
		mongodb_service.get_mongo_client()
	finally:
		mongodb_service.get_mongo_client.cache_clear()

	assert client_options == {
		"tz_aware": True,
		"timeoutMS": settings.mongodb_timeout_ms,
		"serverSelectionTimeoutMS": settings.mongodb_server_selection_timeout_ms,
		"connectTimeoutMS": settings.mongodb_connect_timeout_ms,
		"socketTimeoutMS": settings.mongodb_socket_timeout_ms,
	}
