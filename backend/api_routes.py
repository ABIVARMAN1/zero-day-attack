import os
import json
import sqlite3
from flask import Blueprint, jsonify, request, send_file
from datetime import datetime
from reportlab.pdfgen import canvas
from backend.auth import require_auth, require_role
from backend.database.db import DB_PATH

api_bp = Blueprint('api_bp', __name__)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@api_bp.route('/alerts', methods=['GET'])
@require_auth
def get_alerts():
    conn = get_db()
    cursor = conn.cursor()
    
    # Filters
    status = request.args.get('status')
    severity = request.args.get('severity')
    
    query = "SELECT * FROM alerts"
    params = []
    
    conditions = []
    if status:
        conditions.append("status = ?")
        params.append(status)
    if severity:
        conditions.append("severity = ?")
        params.append(severity)
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    query += " ORDER BY created_at DESC LIMIT 100"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return jsonify({"success": True, "alerts": [dict(r) for r in rows]})

@api_bp.route('/alerts/<int:alert_id>', methods=['PATCH'])
@require_role(['admin', 'analyst'])
def update_alert(alert_id):
    data = request.json
    status = data.get('status')
    
    if not status:
        return jsonify({"error": "Status is required"}), 400
        
    conn = get_db()
    cursor = conn.cursor()
    
    if status == 'RESOLVED':
        cursor.execute("UPDATE alerts SET status = ?, resolved_at = datetime('now') WHERE id = ?", (status, alert_id))
    elif status == 'ACKNOWLEDGED':
        cursor.execute("UPDATE alerts SET status = ?, acknowledged_at = datetime('now') WHERE id = ?", (status, alert_id))
    else:
        cursor.execute("UPDATE alerts SET status = ? WHERE id = ?", (status, alert_id))
        
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "message": "Alert updated"})

@api_bp.route('/investigations', methods=['GET', 'POST'])
@require_role(['admin', 'analyst'])
def investigations():
    conn = get_db()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute("SELECT * FROM investigations ORDER BY created_at DESC LIMIT 50")
        rows = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "investigations": [dict(r) for r in rows]})
        
    elif request.method == 'POST':
        data = request.json
        alert_id = data.get('alert_id')
        notes = data.get('notes', '')
        
        if not alert_id:
            return jsonify({"error": "alert_id is required"}), 400
            
        cursor.execute('''
            INSERT INTO investigations (alert_id, assigned_to, notes, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
        ''', (alert_id, request.user_id, notes))
        
        # Also update alert status
        cursor.execute("UPDATE alerts SET status = 'INVESTIGATING' WHERE id = ?", (alert_id,))
        
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Investigation created"})

@api_bp.route('/investigations/<int:inv_id>', methods=['PATCH'])
@require_role(['admin', 'analyst'])
def update_investigation(inv_id):
    data = request.json
    status = data.get('status')
    notes = data.get('notes')
    
    conn = get_db()
    cursor = conn.cursor()
    
    if status == 'RESOLVED':
        cursor.execute("UPDATE investigations SET status = ?, notes = ?, updated_at = datetime('now'), resolved_at = datetime('now') WHERE id = ?", (status, notes, inv_id))
    else:
        cursor.execute("UPDATE investigations SET status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?", (status, notes, inv_id))
        
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "message": "Investigation updated"})

@api_bp.route('/models', methods=['GET'])
@require_auth
def get_models():
    # Return active models in registry or mock them based on loaded files
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM model_registry")
    rows = cursor.fetchall()
    
    models = [dict(r) for r in rows]
    
    # If empty, populate with defaults from the file system
    if not models:
        default_models = [
            {"name": "Isolation Forest", "version": "1.0", "status": "ACTIVE", "purpose": "Anomaly Detection", "dataset": "CICIDS2017"},
            {"name": "XGBoost", "version": "1.0", "status": "ACTIVE", "purpose": "Known Attack Classification", "dataset": "CICIDS2017"},
            {"name": "Scaler", "version": "1.0", "status": "ACTIVE", "purpose": "Preprocessing", "dataset": "CICIDS2017"},
            {"name": "Label Encoder", "version": "1.0", "status": "ACTIVE", "purpose": "Labeling", "dataset": "CICIDS2017"}
        ]
        
        for m in default_models:
            cursor.execute('''
                INSERT INTO model_registry (name, version, status, purpose, dataset, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            ''', (m['name'], m['version'], m['status'], m['purpose'], m['dataset']))
            
        conn.commit()
        
        cursor.execute("SELECT * FROM model_registry")
        models = [dict(r) for r in cursor.fetchall()]
        
    conn.close()
    
    return jsonify({"success": True, "models": models})

@api_bp.route('/reports', methods=['GET'])
@require_role(['admin', 'analyst'])
def get_reports():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports ORDER BY created_at DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    return jsonify({"success": True, "reports": [dict(r) for r in rows]})

@api_bp.route('/reports', methods=['POST'])
@require_role(['admin', 'analyst'])
def generate_report():
    data = request.json or {}
    report_type = data.get('report_type')
    timeframe = data.get('timeframe')
    
    if not report_type or not timeframe:
        return jsonify({"error": "report_type and timeframe are required"}), 400
        
    title = f"{report_type} - {timeframe}"
    
    import uuid
    reports_dir = os.path.join(os.path.dirname(__file__), 'reports', 'generated')
    os.makedirs(reports_dir, exist_ok=True)
    
    filename = f"report_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(reports_dir, filename)
    
    try:
        c = canvas.Canvas(filepath)
        c.drawString(100, 750, f"ZeroDayAI - {title}")
        c.drawString(100, 730, f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        c.drawString(100, 700, "This is an automatically generated SOC report.")
        c.save()
    except Exception as e:
        print(f"PDF error: {e}")
        return jsonify({"error": "REPORT_GENERATION_FAILED", "message": "PDF generation service unavailable."}), 500

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO reports (report_type, title, generated_by, created_at, parameters, content)
        VALUES (?, ?, ?, datetime('now'), ?, ?)
    ''', (report_type, title, request.user_id, timeframe, filepath))
    conn.commit()
    report_id = cursor.lastrowid
    conn.close()
    
    return jsonify({"success": True, "message": "Report generated successfully", "report_id": report_id})

@api_bp.route('/reports/<int:report_id>/download', methods=['GET'])
@require_auth
def download_report(report_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return jsonify({"error": "Report not found"}), 404
        
    filepath = row['content']
    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "Report file not found"}), 404
        
    # Prevent path traversal
    reports_dir = os.path.join(os.path.dirname(__file__), 'reports', 'generated')
    if not os.path.abspath(filepath).startswith(os.path.abspath(reports_dir)):
        return jsonify({"error": "Invalid file path"}), 400
        
    safe_filename = row['title'].replace(' ', '_').replace('/', '_') + ".pdf"
    return send_file(filepath, as_attachment=True, download_name=safe_filename)

@api_bp.route('/notifications', methods=['GET'])
@require_auth
def get_notifications():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", (request.user_id,))
    rows = cursor.fetchall()
    conn.close()
    return jsonify({"success": True, "notifications": [dict(r) for r in rows]})

@api_bp.route('/search', methods=['GET'])
@require_auth
def search():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({"success": True, "results": []})
        
    conn = get_db()
    cursor = conn.cursor()
    
    results = []
    like_query = f"%{query}%"
    
    # 1. Search Alerts
    cursor.execute('''
        SELECT id, title, description, severity, status 
        FROM alerts 
        WHERE id LIKE ? OR title LIKE ? OR description LIKE ? OR severity LIKE ? OR status LIKE ?
        LIMIT 10
    ''', (like_query, like_query, like_query, like_query, like_query))
    
    for row in cursor.fetchall():
        results.append({
            "type": "alert",
            "id": f"ALT-{row['id']}",
            "title": row['title'],
            "description": row['description'],
            "severity": row['severity'],
            "route": "/alerts"
        })
        
    # 2. Search Investigations
    cursor.execute('''
        SELECT id, alert_id, notes, status 
        FROM investigations 
        WHERE id LIKE ? OR alert_id LIKE ? OR notes LIKE ? OR status LIKE ?
        LIMIT 10
    ''', (like_query, like_query, like_query, like_query))
    
    for row in cursor.fetchall():
        notes = row['notes'] if row['notes'] else ''
        desc = notes[:100] + '...' if len(notes) > 100 else notes
        results.append({
            "type": "investigation",
            "id": f"INV-{row['id']}",
            "title": f"Investigation for Alert ALT-{row['alert_id']}",
            "description": desc,
            "route": "/investigations"
        })
        
    # 3. Search Predictions
    cursor.execute('''
        SELECT id, attack_type, risk_score, severity, metadata
        FROM predictions
        WHERE id LIKE ? OR attack_type LIKE ? OR severity LIKE ? OR metadata LIKE ?
        LIMIT 10
    ''', (like_query, like_query, like_query, like_query))
    
    for row in cursor.fetchall():
        results.append({
            "type": "prediction",
            "id": f"PRD-{row['id']}",
            "title": f"Detection: {row['attack_type']}",
            "description": f"Risk Score: {row['risk_score']} | Severity: {row['severity']}",
            "severity": row['severity'],
            "route": "/upload"
        })
        
    conn.close()
    
    # Sort or format if needed, but returning up to 30 combined results
    return jsonify({"success": True, "results": results[:20]})

