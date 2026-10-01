"""
MongoDB connection module for production use.
Uses MONGODB_URI env variable when available (Render/production),
falls back to SQLite for local development when MONGODB_URI is not set.
"""
import os
from pymongo import MongoClient

MONGODB_URI = os.environ.get("MONGODB_URI")

_client = None
_db = None

def get_mongo_client():
    """Get or create a shared MongoClient instance."""
    global _client
    if _client is None:
        if not MONGODB_URI:
            raise RuntimeError("MONGODB_URI is not configured")
        _client = MongoClient(MONGODB_URI)
    return _client

def get_mongo_db():
    """Get the zero_day_db database instance."""
    global _db
    if _db is None:
        client = get_mongo_client()
        _db = client["zero_day_db"]
    return _db

def is_mongo_available():
    """Check if MongoDB is configured and reachable."""
    if not MONGODB_URI:
        return False
    try:
        client = get_mongo_client()
        client.admin.command("ping")
        return True
    except Exception:
        return False

def get_users_collection():
    """Get the users collection."""
    return get_mongo_db()["users"]

def get_predictions_collection():
    """Get the predictions collection."""
    return get_mongo_db()["predictions"]

def get_alerts_collection():
    """Get the alerts collection."""
    return get_mongo_db()["alerts"]

def get_investigations_collection():
    """Get the investigations collection."""
    return get_mongo_db()["investigations"]

def get_login_history_collection():
    """Get the login_history collection."""
    return get_mongo_db()["login_history"]

def get_notifications_collection():
    """Get the notifications collection."""
    return get_mongo_db()["notifications"]

def get_sessions_collection():
    """Get the sessions collection."""
    return get_mongo_db()["sessions"]

def get_model_registry_collection():
    """Get the model_registry collection."""
    return get_mongo_db()["model_registry"]

def get_reports_collection():
    """Get the reports collection."""
    return get_mongo_db()["reports"]

def init_mongo_indexes():
    """Create indexes for performance and uniqueness."""
    try:
        users = get_users_collection()
        users.create_index("email", unique=True)
        users.create_index("username")
        
        predictions = get_predictions_collection()
        predictions.create_index([("timestamp", -1)])
        
        alerts = get_alerts_collection()
        alerts.create_index([("created_at", -1)])
        alerts.create_index("status")
        
        login_history = get_login_history_collection()
        login_history.create_index("user_id")
        login_history.create_index([("timestamp", -1)])
        
        notifications = get_notifications_collection()
        notifications.create_index("user_id")
        notifications.create_index([("created_at", -1)])
        
        reports = get_reports_collection()
        reports.create_index([("created_at", -1)])
    except Exception as e:
        print(f"Warning: Could not create MongoDB indexes: {e}")
