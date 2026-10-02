import pytest
import os
import sys
from backend.app import app
import json
import io
import pandas as pd

# The client fixture is now provided by conftest.py

def test_api_health(client):
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.get_json()['status'] == 'ok'

def test_api_statistics(client):
    response = client.get('/api/statistics')
    assert response.status_code == 200
    data = response.get_json()
    assert 'total_packets' in data
    assert 'threat_level' in data

def test_api_model_performance(client):
    response = client.get('/api/model-performance')
    assert response.status_code == 200

def test_api_history(client):
    response = client.get('/api/history?limit=5')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'history' in data

def test_upload_no_file(client):
    response = client.post('/api/predict')
    assert response.status_code == 400
    assert 'error' in response.get_json()

def test_upload_empty_file(client):
    data = {'file': (io.BytesIO(b""), '')}
    response = client.post('/api/predict', data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    assert 'error' in response.get_json()

def test_upload_valid_file(client, monkeypatch):
    # Create a small valid CSV
    df = pd.DataFrame({'col1': [1, 2], 'col2': [3, 4]})
    csv_data = df.to_csv(index=False).encode('utf-8')
    data = {'file': (io.BytesIO(csv_data), 'test.csv')}
    
    # We must mock get_predictor in backend.app so it doesn't crash if models aren't right
    class MockPredictor:
        def predict(self, df):
            return [{"prediction": "NORMAL", "attack_type": "None", "confidence": 0.99, "risk_score": 10, "severity": "LOW"}]
    
    import backend.app as backend_app
    monkeypatch.setattr(backend_app, 'get_predictor', lambda: MockPredictor())
    
    response = client.post('/api/predict', data=data, content_type='multipart/form-data')
    assert response.status_code == 200
    res_data = response.get_json()
    assert 'total_records' in res_data
    assert 'results' in res_data

def test_report_generation(client):
    # 1. Authenticated request (client fixture handles auth)
    # 2. Correct report endpoint
    # 3. Valid payload
    payload = {
        "report_type": "Executive Summary (Weekly)",
        "timeframe": "Last 7 Days"
    }
    
    # Generate report
    post_res = client.post('/api/reports', json=payload)
    # 4. HTTP success status
    assert post_res.status_code == 200
    res_data = post_res.get_json()
    assert res_data['success'] is True
    assert 'report_id' in res_data
    
    report_id = res_data['report_id']
    
    # Download report
    get_res = client.get(f'/api/reports/{report_id}/download')
    assert get_res.status_code == 200
    # 5. Content-Type is application/pdf
    assert get_res.content_type == 'application/pdf'
    # 6. Response contains PDF bytes
    assert get_res.data.startswith(b'%PDF-')
