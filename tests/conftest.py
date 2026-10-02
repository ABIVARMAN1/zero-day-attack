import os
import pytest
from backend.app import app

@pytest.fixture(autouse=True)
def client():
    app.config['TESTING'] = True
    
    # Configure max content length for oversized upload test
    app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024 # 1 MB
    
    with app.test_client() as client:
        yield client
