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
	return MongoClient(settings.mongodb_uri, tz_aware=True)


@lru_cache(maxsize=1)
def get_reports_collection() -> Collection[dict[str, Any]]:
	database: Database[dict[str, Any]] = get_mongo_client()[settings.mongodb_database]
	collection = database["reports"]
	collection.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
	return collection
