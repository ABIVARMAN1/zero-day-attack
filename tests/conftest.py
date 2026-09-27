import os
import pytest
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-pytest"
from backend.app import app
from backend.auth import generate_jwt
from backend.database.auth_db import create_user
from backend.auth import hash_password

@pytest.fixture(autouse=True)
def client():
    app.config['TESTING'] = True
    
    # Create test user
    pwd_hash = hash_password("Test1234!")
    user_id = create_user("testuser", "test@soc.local", pwd_hash)
    if not user_id:
        # User already exists in test DB
        pass
    
    # Actually we don't strictly need the user to exist if our jwt token uses a static ID that is valid
    # But just in case, we generate a valid token:
    token = generate_jwt(1, mfa_pending=False)
    
    # Configure max content length for oversized upload test
    app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024 # 1 MB
    
    with app.test_client() as client:
        client.set_cookie('access_token', token)
        yield client
