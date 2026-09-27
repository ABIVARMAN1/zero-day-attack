import os
import pytest
import pandas as pd
from backend.app import app
import importlib.util

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("ZeroDayPredictor", os.path.join(base_dir, "src", "09_prediction.py"))
pred_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pred_module)
ZeroDayPredictor = pred_module.ZeroDayPredictor

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_api_health(client):
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.get_json()['status'] == 'ok'

def test_predictor_initialization():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, "models")
    
    predictor = ZeroDayPredictor(models_dir)
    assert predictor is not None
    assert predictor.scaler is not None
    assert predictor.iso_forest is not None
    assert predictor.xgb_model is not None
    assert predictor.encoder is not None
