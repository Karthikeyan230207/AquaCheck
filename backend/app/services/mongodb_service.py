from functools import lru_cache
from typing import Any

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from app.config.settings import settings


@lru_cache(maxsize=1)
def get_mongo_client() -> MongoClient[dict[str, Any]]:
	if not settings.mongodb_uri:
		raise RuntimeError("MongoDB Atlas is not configured; set MONGODB_URI")
	return MongoClient(
		settings.mongodb_uri,
		tz_aware=True,
		timeoutMS=settings.mongodb_timeout_ms,
		serverSelectionTimeoutMS=settings.mongodb_server_selection_timeout_ms,
		connectTimeoutMS=settings.mongodb_connect_timeout_ms,
		socketTimeoutMS=settings.mongodb_socket_timeout_ms,
	)


@lru_cache(maxsize=1)
def get_reports_collection() -> Collection[dict[str, Any]]:
	database: Database[dict[str, Any]] = get_mongo_client()[settings.mongodb_database]
	collection = database["reports"]
	collection.create_index(
		[
			("user_id", ASCENDING),
			("created_at", DESCENDING),
			("_id", DESCENDING),
		]
	)
	return collection
