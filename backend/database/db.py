import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "predictions.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            prediction TEXT NOT NULL,
            attack_type TEXT NOT NULL,
            risk_score INTEGER NOT NULL,
            severity TEXT NOT NULL,
            confidence REAL NOT NULL,
            source TEXT,
            metadata TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            mfa_enabled BOOLEAN DEFAULT 0,
            mfa_secret TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_login_at TEXT,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TEXT,
            is_active BOOLEAN DEFAULT 1
        )
    ''')
    
    # Simple migration for existing DBs
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN name TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists
        
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
    except sqlite3.OperationalError:
        pass # Column already exists

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS login_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            timestamp TEXT NOT NULL,
            success BOOLEAN NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            failure_reason TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id INTEGER,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            risk_score INTEGER NOT NULL,
            status TEXT DEFAULT 'NEW',
            created_at TEXT NOT NULL,
            acknowledged_at TEXT,
            resolved_at TEXT,
            user_id INTEGER,
            FOREIGN KEY(prediction_id) REFERENCES predictions(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS investigations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id INTEGER NOT NULL,
            assigned_to INTEGER,
            status TEXT DEFAULT 'OPEN',
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            resolved_at TEXT,
            FOREIGN KEY(alert_id) REFERENCES alerts(id),
            FOREIGN KEY(assigned_to) REFERENCES users(id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT,
            severity TEXT DEFAULT 'INFO',
            is_read BOOLEAN DEFAULT 0,
            created_at TEXT NOT NULL,
            related_id INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            browser TEXT,
            os TEXT,
            ip_address TEXT,
            created_at TEXT NOT NULL,
            last_activity TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS model_registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            status TEXT DEFAULT 'ACTIVE',
            purpose TEXT,
            training_date TEXT,
            dataset TEXT,
            feature_count INTEGER,
            hyperparameters TEXT,
            metrics TEXT,
            file_path TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_type TEXT NOT NULL,
            title TEXT NOT NULL,
            generated_by INTEGER,
            created_at TEXT NOT NULL,
            parameters TEXT,
            content TEXT NOT NULL,
            FOREIGN KEY(generated_by) REFERENCES users(id)
        )
    ''')
    conn.commit()
    conn.close()

def insert_prediction(prediction, attack_type, risk_score, severity, confidence, source="Simulation", metadata=None):
    if metadata is None:
        metadata = {}
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    timestamp = datetime.now().isoformat()
    
    cursor.execute('''
        INSERT INTO predictions (timestamp, prediction, attack_type, risk_score, severity, confidence, source, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (timestamp, prediction, attack_type, risk_score, severity, confidence, source, json.dumps(metadata)))
    
    pred_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return pred_id

def get_predictions(limit=100):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM predictions ORDER BY timestamp DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    
    conn.close()
    return [dict(row) for row in rows]

def insert_alert(prediction_id, severity, title, description, risk_score):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    timestamp = datetime.now().isoformat()
    
    cursor.execute('''
        INSERT INTO alerts (prediction_id, severity, title, description, risk_score, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (prediction_id, severity, title, description, risk_score, 'NEW', timestamp))
    
    conn.commit()
    conn.close()
