"""
Authentication database layer.
Uses MongoDB in production (when MONGODB_URI is set),
falls back to SQLite for local development.
"""
import os
import sqlite3
from datetime import datetime

# Determine backend: MongoDB or SQLite
_USE_MONGO = bool(os.environ.get("MONGODB_URI"))

if _USE_MONGO:
    from bson import ObjectId
    from backend.database.mongo import (
        get_users_collection,
        get_login_history_collection,
    )

# SQLite fallback for local development
_SQLITE_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "predictions.db")

def _get_sqlite_connection():
    conn = sqlite3.connect(_SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ---------- Compatibility helpers ----------
def _mongo_user_to_dict(doc):
    """Convert a MongoDB user document to a dict matching the SQLite row format."""
    if doc is None:
        return None
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name"),
        "username": doc.get("username"),
        "email": doc.get("email"),
        "password_hash": doc.get("password_hash"),
        "role": doc.get("role", "user"),
        "mfa_enabled": doc.get("mfa_enabled", False),
        "mfa_secret": doc.get("mfa_secret"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
        "last_login_at": doc.get("last_login_at"),
        "failed_login_attempts": doc.get("failed_login_attempts", 0),
        "locked_until": doc.get("locked_until"),
        "is_active": doc.get("is_active", True),
    }


# ---------- Public API ----------

def get_db_connection():
    """Get a SQLite connection (only used when MongoDB is NOT available)."""
    if _USE_MONGO:
        # Return a stub — callers that still use raw SQL will need updating.
        # This should only be reached by legacy code paths.
        return _get_sqlite_connection()
    return _get_sqlite_connection()


def get_user_by_email(email):
    email = email.strip().lower()
    if _USE_MONGO:
        users = get_users_collection()
        doc = users.find_one({"email": email})
        return _mongo_user_to_dict(doc)
    else:
        conn = _get_sqlite_connection()
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        conn.close()
        return dict(user) if user else None


def get_user_by_id(user_id):
    if _USE_MONGO:
        users = get_users_collection()
        # user_id could be a string ObjectId from JWT
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        doc = users.find_one({"_id": oid})
        return _mongo_user_to_dict(doc)
    else:
        conn = _get_sqlite_connection()
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        conn.close()
        return dict(user) if user else None


def create_user(username, email, password_hash, name=None, role='user'):
    email = email.strip().lower()
    now = datetime.now().isoformat()
    
    if _USE_MONGO:
        users = get_users_collection()
        # Check for duplicate
        if users.find_one({"email": email}):
            return None
        doc = {
            "name": name,
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "role": role,
            "mfa_enabled": False,
            "mfa_secret": None,
            "created_at": now,
            "updated_at": now,
            "last_login_at": None,
            "failed_login_attempts": 0,
            "locked_until": None,
            "is_active": True,
        }
        result = users.insert_one(doc)
        return str(result.inserted_id)
    else:
        conn = _get_sqlite_connection()
        try:
            cursor = conn.execute("""
                INSERT INTO users (name, username, email, password_hash, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (name, username, email, password_hash, role, now, now))
            conn.commit()
            user_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            user_id = None
        finally:
            conn.close()
        return user_id


def update_user_login_status(user_id, success, reset_failures=False):
    now = datetime.now().isoformat()
    
    if _USE_MONGO:
        users = get_users_collection()
        try:
            oid = ObjectId(user_id)
        except Exception:
            return
        if success:
            users.update_one({"_id": oid}, {"$set": {
                "last_login_at": now,
                "failed_login_attempts": 0,
                "locked_until": None,
                "updated_at": now,
            }})
        else:
            user = users.find_one({"_id": oid})
            if user:
                failures = user.get("failed_login_attempts", 0) + 1
                locked_until = None
                if failures >= 5:
                    import time
                    locked_until = datetime.fromtimestamp(time.time() + 900).isoformat()
                users.update_one({"_id": oid}, {"$set": {
                    "failed_login_attempts": failures,
                    "locked_until": locked_until,
                    "updated_at": now,
                }})
    else:
        conn = _get_sqlite_connection()
        if success:
            conn.execute("""
                UPDATE users 
                SET last_login_at = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = ?
                WHERE id = ?
            """, (now, now, user_id))
        else:
            user = conn.execute("SELECT failed_login_attempts FROM users WHERE id = ?", (user_id,)).fetchone()
            if user:
                failures = user['failed_login_attempts'] + 1
                locked_until = None
                if failures >= 5:
                    import time
                    locked_until = datetime.fromtimestamp(time.time() + 900).isoformat()
                conn.execute("""
                    UPDATE users 
                    SET failed_login_attempts = ?, locked_until = ?, updated_at = ?
                    WHERE id = ?
                """, (failures, locked_until, now, user_id))
        conn.commit()
        conn.close()


def log_login_history(user_id, success, ip_address, user_agent, failure_reason=""):
    now = datetime.now().isoformat()
    
    if _USE_MONGO:
        history = get_login_history_collection()
        history.insert_one({
            "user_id": str(user_id),
            "timestamp": now,
            "success": success,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "failure_reason": failure_reason,
        })
    else:
        conn = _get_sqlite_connection()
        conn.execute("""
            INSERT INTO login_history (user_id, timestamp, success, ip_address, user_agent, failure_reason)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, now, success, ip_address, user_agent, failure_reason))
        conn.commit()
        conn.close()


def get_login_history(user_id, limit=50):
    if _USE_MONGO:
        history = get_login_history_collection()
        docs = list(history.find(
            {"user_id": str(user_id)},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit))
        return docs
    else:
        conn = _get_sqlite_connection()
        history = conn.execute("""
            SELECT * FROM login_history 
            WHERE user_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (user_id, limit)).fetchall()
        conn.close()
        return [dict(row) for row in history]


def enable_mfa(user_id, secret):
    now = datetime.now().isoformat()
    
    if _USE_MONGO:
        users = get_users_collection()
        try:
            oid = ObjectId(user_id)
        except Exception:
            return
        users.update_one({"_id": oid}, {"$set": {
            "mfa_enabled": True,
            "mfa_secret": secret,
            "updated_at": now,
        }})
    else:
        conn = _get_sqlite_connection()
        conn.execute("""
            UPDATE users SET mfa_enabled = 1, mfa_secret = ?, updated_at = ? WHERE id = ?
        """, (secret, now, user_id))
        conn.commit()
        conn.close()


def disable_mfa(user_id):
    now = datetime.now().isoformat()
    
    if _USE_MONGO:
        users = get_users_collection()
        try:
            oid = ObjectId(user_id)
        except Exception:
            return
        users.update_one({"_id": oid}, {"$set": {
            "mfa_enabled": False,
            "mfa_secret": None,
            "updated_at": now,
        }})
    else:
        conn = _get_sqlite_connection()
        conn.execute("""
            UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, updated_at = ? WHERE id = ?
        """, (now, user_id))
        conn.commit()
        conn.close()


def update_password(user_id, new_password_hash):
    now = datetime.now().isoformat()
    
    if _USE_MONGO:
        users = get_users_collection()
        try:
            oid = ObjectId(user_id)
        except Exception:
            return
        users.update_one({"_id": oid}, {"$set": {
            "password_hash": new_password_hash,
            "updated_at": now,
        }})
    else:
        conn = _get_sqlite_connection()
        conn.execute("""
            UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
        """, (new_password_hash, now, user_id))
        conn.commit()
        conn.close()
