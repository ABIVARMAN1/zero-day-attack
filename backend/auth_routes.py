import os
from flask import Blueprint, request, jsonify, make_response
from datetime import datetime
import qrcode
import base64
from io import BytesIO
import uuid

from backend.database.auth_db import (
    get_user_by_email, get_user_by_id, update_user_login_status, 
    log_login_history, get_login_history, enable_mfa, disable_mfa, update_password, create_user
)
from backend.auth import (
    verify_password, generate_jwt, require_auth, decode_jwt,
    generate_totp_secret, get_totp_uri, verify_totp, hash_password, check_password_strength
)
import re

auth_bp = Blueprint('auth_bp', __name__)

def _is_production():
    """Check if running in production (cross-origin deployment)."""
    return bool(os.environ.get("MONGODB_URI")) or os.environ.get("FLASK_ENV") == "production"

def _set_auth_cookie(response, token):
    """Set the access_token cookie with correct attributes for the environment."""
    if _is_production():
        # Cross-origin: requires SameSite=None + Secure
        response.set_cookie(
            'access_token', token,
            httponly=True,
            secure=True,
            samesite='None',
            max_age=7200,  # 2 hours
            path='/',
        )
    else:
        # Local development
        response.set_cookie(
            'access_token', token,
            httponly=True,
            secure=False,
            path='/',
        )

def _delete_auth_cookie(response):
    """Delete the access_token cookie with correct attributes."""
    if _is_production():
        response.set_cookie(
            'access_token', '',
            httponly=True,
            secure=True,
            samesite='None',
            max_age=0,
            path='/',
        )
    else:
        response.delete_cookie('access_token', path='/')

def get_client_ip():
    return request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)

def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400
        
    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400
        
    if not check_password_strength(password):
        return jsonify({"error": "Password does not meet complexity requirements"}), 400
    
    # Normalize email
    email = email.strip().lower()
    
    # Check if user already exists
    existing_user = get_user_by_email(email)
    if existing_user:
        # Generic message to avoid email enumeration
        return jsonify({"error": "Registration failed. Account may already exist or data is invalid."}), 400
        
    # Create the user
    user_id = create_user(
        username=name, # Map name to username or pass name separately
        email=email,
        password_hash=hash_password(password),
        name=name,
        role='user'
    )
    
    if not user_id:
        return jsonify({"error": "Registration failed. Account may already exist or data is invalid."}), 400
        
    # Generate setup_pending token for MFA setup immediately after registration
    temp_token = generate_jwt(user_id, mfa_pending=True)
    
    response = make_response(jsonify({
        "success": True,
        "message": "Account created successfully. Please configure MFA.",
        "mfa_setup_required": True
    }))
    _set_auth_cookie(response, temp_token)
    return response

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    ip_addr = get_client_ip()
    user_agent = request.headers.get('User-Agent', '')

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    # Normalize email
    email = email.strip().lower()

    user = get_user_by_email(email)
    
    if not user:
        # Don't reveal user doesn't exist — use timing-safe dummy
        verify_password("$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy", "dummy")
        return jsonify({"error": "Invalid credentials"}), 401

    if user.get('locked_until'):
        try:
            locked_until_dt = datetime.fromisoformat(user['locked_until'])
            if datetime.utcnow() < locked_until_dt:
                log_login_history(user['id'], False, ip_addr, user_agent, "Account locked")
                return jsonify({"error": "Account temporarily locked"}), 403
        except (ValueError, TypeError):
            pass  # Invalid date format, proceed with login

    if not verify_password(user['password_hash'], password):
        update_user_login_status(user['id'], False)
        log_login_history(user['id'], False, ip_addr, user_agent, "Invalid credentials")
        return jsonify({"error": "Invalid credentials"}), 401

    update_user_login_status(user['id'], True)
    
    if user.get('mfa_enabled'):
        # Issue a temporary token for MFA
        temp_token = generate_jwt(user['id'], mfa_pending=True)
        response = make_response(jsonify({"mfa_required": True}))
        _set_auth_cookie(response, temp_token)
        return response

    # Successful fully authenticated login
    token = generate_jwt(user['id'], mfa_pending=False)
    log_login_history(user['id'], True, ip_addr, user_agent)
    
    response = make_response(jsonify({
        "success": True, 
        "user": {"id": str(user["id"]), "username": user["username"], "email": user["email"]}
    }))
    _set_auth_cookie(response, token)
    return response

@auth_bp.route('/api/auth/mfa/verify', methods=['POST'])
def verify_mfa():
    token = request.cookies.get("access_token")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
        
    payload = decode_jwt(token)
    if not payload or not payload.get("mfa_pending"):
        return jsonify({"error": "Invalid state"}), 400

    data = request.get_json()
    code = data.get('code')
    user_id = payload['user_id']
    
    ip_addr = get_client_ip()
    user_agent = request.headers.get('User-Agent', '')

    user = get_user_by_id(user_id)
    if not user or not user.get('mfa_enabled'):
        return jsonify({"error": "Invalid request"}), 400

    if not verify_totp(user['mfa_secret'], code):
        log_login_history(user_id, False, ip_addr, user_agent, "Invalid authentication code")
        return jsonify({"error": "The authentication code is invalid or expired."}), 401

    log_login_history(user_id, True, ip_addr, user_agent)
    
    # Issue fully authenticated token
    new_token = generate_jwt(user_id, mfa_pending=False)
    response = make_response(jsonify({
        "success": True,
        "user": {"id": str(user["id"]), "username": user["username"], "email": user["email"]}
    }))
    _set_auth_cookie(response, new_token)
    return response

@auth_bp.route('/api/auth/me', methods=['GET'])
@require_auth
def get_me():
    user = get_user_by_id(request.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify({
        "user": {
            "id": str(user["id"]), 
            "username": user["username"], 
            "email": user["email"],
            "mfa_enabled": bool(user.get("mfa_enabled", False)),
            "role": user.get("role", "user"),
            "name": user.get("name"),
        }
    })

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({"success": True}))
    _delete_auth_cookie(response)
    return response

@auth_bp.route('/api/auth/mfa/setup', methods=['POST'])
@require_auth(allow_mfa_pending=True)
def mfa_setup():
    user = get_user_by_id(request.user_id)
    if user.get('mfa_enabled'):
        return jsonify({"error": "MFA already enabled"}), 400
        
    secret = generate_totp_secret()
    uri = get_totp_uri(secret, user['email'])
    
    # Generate QR Code image
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return jsonify({
        "qr_code": f"data:image/png;base64,{img_str}",
        "secret": secret  # Frontend needs to pass this back for verification
    })

@auth_bp.route('/api/auth/mfa/enable', methods=['POST'])
@require_auth(allow_mfa_pending=True)
def mfa_enable():
    data = request.get_json()
    code = data.get('code')
    secret = data.get('secret')
    
    if not verify_totp(secret, code):
        return jsonify({"error": "Invalid verification code"}), 400
        
    enable_mfa(request.user_id, secret)
    
    # If the user is setting up MFA post-registration, they are technically verified now.
    # We will issue a fully authenticated token.
    new_token = generate_jwt(request.user_id, mfa_pending=False)
    response = make_response(jsonify({"success": True}))
    _set_auth_cookie(response, new_token)
    return response

@auth_bp.route('/api/auth/mfa/disable', methods=['POST'])
@require_auth
def mfa_disable():
    data = request.get_json()
    password = data.get('password')
    
    user = get_user_by_id(request.user_id)
    if not verify_password(user['password_hash'], password):
        return jsonify({"error": "Invalid password"}), 403
        
    disable_mfa(request.user_id)
    return jsonify({"success": True})

@auth_bp.route('/api/auth/password/change', methods=['POST'])
@require_auth
def change_password():
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    user = get_user_by_id(request.user_id)
    if not verify_password(user['password_hash'], current_password):
        return jsonify({"error": "Invalid current password"}), 403
        
    if not check_password_strength(new_password):
        return jsonify({"error": "Password does not meet complexity requirements"}), 400
        
    update_password(request.user_id, hash_password(new_password))
    return jsonify({"success": True})

@auth_bp.route('/api/auth/login_history', methods=['GET'])
@require_auth
def login_history():
    history = get_login_history(request.user_id)
    return jsonify({"history": history})

# Dummy DB for reset tokens for demonstration
reset_tokens = {}

@auth_bp.route('/api/auth/password/forgot', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    if email:
        email = email.strip().lower()
    
    user = get_user_by_email(email)
    if user:
        token = str(uuid.uuid4())
        reset_tokens[token] = user['id']
        # In dev mode, just print to console.
        print(f"RESET LINK (DEV ONLY): http://localhost:5173/reset-password?token={token}")
        
    # Always return success to prevent email enumeration
    return jsonify({"success": True, "message": "If an account exists, a reset link has been sent."})

@auth_bp.route('/api/auth/password/reset', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')
    
    user_id = reset_tokens.get(token)
    if not user_id:
        return jsonify({"error": "Invalid or expired reset token"}), 400
        
    if not check_password_strength(new_password):
        return jsonify({"error": "Password does not meet complexity requirements"}), 400
        
    update_password(user_id, hash_password(new_password))
    del reset_tokens[token] # Single-use token
    
    return jsonify({"success": True})
