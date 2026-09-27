import pytest
import os
import sqlite3
import tempfile
import importlib.util

def get_module(script_path, module_name):
    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db_module = get_module(os.path.join(base_dir, "backend", "database", "db.py"), "db")

@pytest.fixture
def test_db(monkeypatch):
    # Create a temporary file for the database
    db_fd, db_path = tempfile.mkstemp()
    monkeypatch.setattr(db_module, 'DB_PATH', db_path)
    db_module.init_db()
    yield db_path
    os.close(db_fd)
    os.unlink(db_path)

def test_init_db(test_db):
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='predictions'")
    table = cursor.fetchone()
    conn.close()
    assert table is not None

def test_insert_and_get_predictions(test_db):
    db_module.insert_prediction(
        prediction="SUSPICIOUS",
        attack_type="Zero-Day",
        risk_score=85,
        severity="HIGH",
        confidence=0.9,
        source="Test",
        metadata={"test": "data"}
    )
    
    predictions = db_module.get_predictions(limit=10)
    assert len(predictions) == 1
    assert predictions[0]["prediction"] == "SUSPICIOUS"
    assert predictions[0]["attack_type"] == "Zero-Day"
    assert predictions[0]["risk_score"] == 85
    assert predictions[0]["severity"] == "HIGH"
    assert predictions[0]["confidence"] == 0.9

def test_get_predictions_limit(test_db):
    for i in range(5):
        db_module.insert_prediction("NORMAL", "None", 10, "LOW", 0.99, "Test")
    
    predictions = db_module.get_predictions(limit=3)
    assert len(predictions) == 3

def test_database_error_handling(test_db, monkeypatch):
    # Simulating a database error
    def mock_connect(*args, **kwargs):
        raise sqlite3.OperationalError("Simulated error")
    
    monkeypatch.setattr(sqlite3, 'connect', mock_connect)
    
    with pytest.raises(sqlite3.OperationalError):
        db_module.insert_prediction("NORMAL", "None", 10, "LOW", 0.99)
