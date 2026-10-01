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
        import certifi
        _client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=5000,
            waitQueueTimeoutMS=5000,
            tlsCAFile=certifi.where()
        )
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
    print(f"MongoDB diagnostics: MONGODB_URI configured: {bool(MONGODB_URI)}")
    if not MONGODB_URI:
        return False
        
    try:
        # Extract host safely without password for logging
        import urllib.parse
        parsed = urllib.parse.urlparse(MONGODB_URI)
        host = parsed.hostname
        db_name = parsed.path.strip('/') if parsed.path else 'default'
        print(f"MongoDB diagnostics: host detected: {host}")
        print(f"MongoDB diagnostics: database detected: {db_name}")
    except Exception as e:
        print(f"MongoDB diagnostics: failed to parse URI securely: {type(e).__name__}")
        
    try:
        client = get_mongo_client()
        client.admin.command("ping")
        return True
    except Exception as e:
        print("MongoDB health check failed:")
        print(f"type={type(e).__name__}")
        # Make sure not to print the actual MONGODB_URI inside the exception string
        safe_msg = str(e).replace(MONGODB_URI, "<REDACTED_URI>") if MONGODB_URI else str(e)
        print(f"message={safe_msg}")
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
