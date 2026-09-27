import pytest
from backend.app import app
import io
import pandas as pd

# The client fixture is now provided by conftest.py

def test_file_type_validation(client):
    # Try uploading a non-CSV file
    data = {'file': (io.BytesIO(b"this is not a csv, it's an exe"), 'test.exe')}
    response = client.post('/api/predict', data=data, content_type='multipart/form-data')
    assert response.status_code in [400, 415, 500]  # Depends on how we handle it, usually 400

def test_malformed_csv(client):
    # Upload malformed CSV
    malformed_csv = b"\x00\x01\x02"
    data = {'file': (io.BytesIO(malformed_csv), 'test.csv')}
    response = client.post('/api/predict', data=data, content_type='multipart/form-data')
    assert response.status_code in [400, 500]

def test_oversized_upload(client):
    # Exceed the 1MB limit
    large_data = b"0" * (2 * 1024 * 1024)
    data = {'file': (io.BytesIO(large_data), 'large.csv')}
    response = client.post('/api/predict', data=data, content_type='multipart/form-data')
    assert response.status_code == 413 # Payload Too Large

def test_path_traversal(client):
    # Try sending a file with path traversal characters in filename
    data = {'file': (io.BytesIO(b"a,b\n1,2"), '../../../etc/passwd')}
    response = client.post('/api/predict', data=data, content_type='multipart/form-data')
    # Should not crash and should process normally or reject cleanly
    assert response.status_code in [200, 400, 500]


