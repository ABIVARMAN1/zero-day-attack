import pandas as pd
import numpy as np
import pytest
import os
import importlib.util

def get_module(script_path, module_name):
    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
prediction = get_module(os.path.join(base_dir, "src", "09_prediction.py"), "prediction")

@pytest.fixture
def predictor():
    models_dir = os.path.join(base_dir, "models")
    return prediction.ZeroDayPredictor(models_dir)

def test_predictor_initialization(predictor):
    assert predictor is not None
    assert predictor.scaler is not None
    assert predictor.iso_forest is not None
    assert predictor.xgb_model is not None
    assert predictor.encoder is not None
    assert hasattr(predictor, 'benign_classes')

def test_severity_calculation(predictor):
    assert predictor.get_severity(10) == "NORMAL"
    assert predictor.get_severity(30) == "LOW"
    assert predictor.get_severity(50) == "MEDIUM"
    assert predictor.get_severity(70) == "MEDIUM"
    assert predictor.get_severity(85) == "HIGH"

def test_prediction_output_format(predictor):
    # Create mock data that matches the expected features from the scaler
    expected_cols = getattr(predictor.scaler, "feature_names_in_", None)
    if expected_cols is None:
        pytest.skip("Scaler does not have feature_names_in_")
        
    df = pd.DataFrame([np.zeros(len(expected_cols))], columns=expected_cols)
    results = predictor.predict(df)
    
    assert isinstance(results, list)
    assert len(results) == 1
    res = results[0]
    
    assert "prediction" in res
    assert "attack_type" in res
    assert "anomaly" in res
    assert "confidence" in res
    assert "risk_score" in res
    assert "severity" in res
    
    assert 0 <= res["risk_score"] <= 100

def test_empty_dataframe(predictor):
    df = pd.DataFrame()
    results = predictor.predict(df)
    assert results == []

def test_missing_features(predictor):
    expected_cols = getattr(predictor.scaler, "feature_names_in_", None)
    if expected_cols is None:
        pytest.skip("Scaler does not have feature_names_in_")
        
    # Provide a dataframe with completely different columns
    df = pd.DataFrame({"random_col": [1]})
    results = predictor.predict(df)
    assert len(results) == 1
    # Check if preprocessing filled in missing features with 0
    res = results[0]
    assert 0 <= res["risk_score"] <= 100
