import os
import jwt
import pyotp
import re
from datetime import datetime, timedelta
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from functools import wraps
from flask import request, jsonify
from backend.database.auth_db import get_db_connection

# Should use environment variables in production
SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is not set. Please configure it safely.")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DELTA = timedelta(hours=2)

ph = PasswordHasher()

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(hashed_password: str, password: str) -> bool:
    try:
        return ph.verify(hashed_password, password)
    except VerifyMismatchError:
        return False

def check_password_strength(password: str) -> bool:
    """
    Min 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    """
    if len(password) < 12:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'\d', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    return True

def generate_jwt(user_id: int, mfa_pending: bool = False) -> str:
    payload = {
        "user_id": user_id,
        "mfa_pending": mfa_pending,
        "exp": datetime.utcnow() + JWT_EXPIRATION_DELTA,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_jwt(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(allow_mfa_pending=False):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token = request.cookies.get("access_token")
            if not token:
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]

            if not token:
                return jsonify({"error": "Unauthorized"}), 401

            payload = decode_jwt(token)
            if not payload:
                return jsonify({"error": "Invalid or expired token"}), 401
                
            if payload.get("mfa_pending") and not allow_mfa_pending:
                return jsonify({"error": "MFA verification required"}), 403

            # Attach user info to request
            conn = get_db_connection()
            user = conn.execute("SELECT id, username, email, role, mfa_enabled FROM users WHERE id = ?", (payload["user_id"],)).fetchone()
            conn.close()
            
            if not user:
                return jsonify({"error": "User not found"}), 401
                
            request.user = dict(user)
            request.user_id = payload["user_id"]
            return f(*args, **kwargs)
        return decorated
    # Allow decorator to be used without parentheses if no args
    if callable(allow_mfa_pending):
        f = allow_mfa_pending
        allow_mfa_pending = False
        return decorator(f)
    return decorator

def require_role(allowed_roles):
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            if request.user.get('role') not in allowed_roles:
                return jsonify({"error": "Forbidden: Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

def generate_totp_secret() -> str:
    return pyotp.random_base32()

def get_totp_uri(secret: str, username: str, issuer_name="AI SOC") -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(name=username, issuer_name=issuer_name)

def verify_totp(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code)
