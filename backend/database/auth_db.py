import sqlite3
from datetime import datetime
from backend.database.db import DB_PATH

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_user_by_email(email):
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(user) if user else None

def get_user_by_id(user_id):
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(user) if user else None

def create_user(username, email, password_hash, name=None, role='user'):
    conn = get_db_connection()
    now = datetime.now().isoformat()
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
    conn = get_db_connection()
    now = datetime.now().isoformat()
    
    if success:
        conn.execute("""
            UPDATE users 
            SET last_login_at = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = ?
            WHERE id = ?
        """, (now, now, user_id))
    else:
        # Increment failed login attempts
        user = conn.execute("SELECT failed_login_attempts FROM users WHERE id = ?", (user_id,)).fetchone()
        if user:
            failures = user['failed_login_attempts'] + 1
            locked_until = None
            if failures >= 5:
                # Lock for 15 minutes
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
    conn = get_db_connection()
    now = datetime.now().isoformat()
    conn.execute("""
        INSERT INTO login_history (user_id, timestamp, success, ip_address, user_agent, failure_reason)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, now, success, ip_address, user_agent, failure_reason))
    conn.commit()
    conn.close()

def get_login_history(user_id, limit=50):
    conn = get_db_connection()
    history = conn.execute("""
        SELECT * FROM login_history 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
    """, (user_id, limit)).fetchall()
    conn.close()
    return [dict(row) for row in history]

def enable_mfa(user_id, secret):
    conn = get_db_connection()
    now = datetime.now().isoformat()
    conn.execute("""
        UPDATE users SET mfa_enabled = 1, mfa_secret = ?, updated_at = ? WHERE id = ?
    """, (secret, now, user_id))
    conn.commit()
    conn.close()

def disable_mfa(user_id):
    conn = get_db_connection()
    now = datetime.now().isoformat()
    conn.execute("""
        UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, updated_at = ? WHERE id = ?
    """, (now, user_id))
    conn.commit()
    conn.close()

def update_password(user_id, new_password_hash):
    conn = get_db_connection()
    now = datetime.now().isoformat()
    conn.execute("""
        UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
    """, (new_password_hash, now, user_id))
    conn.commit()
    conn.close()
