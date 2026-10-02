import os
import json
import sqlite3
from flask import Blueprint, jsonify, request, send_file
from datetime import datetime
from backend.auth import require_auth, require_role
from backend.database.db import DB_PATH

# Determine if using MongoDB
_USE_MONGO = bool(os.environ.get("MONGODB_URI"))

if _USE_MONGO:
    from backend.database.mongo import (
        get_alerts_collection,
        get_investigations_collection,
        get_model_registry_collection,
        get_reports_collection,
        get_notifications_collection,
        get_predictions_collection,
    )

api_bp = Blueprint('api_bp', __name__)

def get_db():
    """Get SQLite connection (local dev only)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@api_bp.route('/alerts', methods=['GET'])
@require_auth
def get_alerts():
    status_filter = request.args.get('status')
    severity_filter = request.args.get('severity')
    
    if _USE_MONGO:
        coll = get_alerts_collection()
        query = {}
        if status_filter:
            query["status"] = status_filter
        if severity_filter:
            query["severity"] = severity_filter
        docs = list(coll.find(query).sort("created_at", -1).limit(100))
        alerts = []
        for doc in docs:
            doc["id"] = str(doc.pop("_id"))
            alerts.append(doc)
        return jsonify({"success": True, "alerts": alerts})
    else:
        conn = get_db()
        cursor = conn.cursor()
        query = "SELECT * FROM alerts"
        params = []
        conditions = []
        if status_filter:
            conditions.append("status = ?")
            params.append(status_filter)
        if severity_filter:
            conditions.append("severity = ?")
            params.append(severity_filter)
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY created_at DESC LIMIT 100"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "alerts": [dict(r) for r in rows]})

@api_bp.route('/alerts/<alert_id>', methods=['PATCH'])
@require_role(['admin', 'analyst'])
def update_alert(alert_id):
    data = request.json
    status = data.get('status')
    
    if not status:
        return jsonify({"error": "Status is required"}), 400
    
    if _USE_MONGO:
        from bson import ObjectId
        coll = get_alerts_collection()
        update = {"$set": {"status": status}}
        now = datetime.now().isoformat()
        if status == 'RESOLVED':
            update["$set"]["resolved_at"] = now
        elif status == 'ACKNOWLEDGED':
            update["$set"]["acknowledged_at"] = now
        try:
            coll.update_one({"_id": ObjectId(alert_id)}, update)
        except Exception:
            coll.update_one({"_id": alert_id}, update)
    else:
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
    if request.method == 'GET':
        if _USE_MONGO:
            coll = get_investigations_collection()
            docs = list(coll.find().sort("created_at", -1).limit(50))
            investigations_list = []
            for doc in docs:
                doc["id"] = str(doc.pop("_id"))
                investigations_list.append(doc)
            return jsonify({"success": True, "investigations": investigations_list})
        else:
            conn = get_db()
            cursor = conn.cursor()
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
        
        now = datetime.now().isoformat()
        
        if _USE_MONGO:
            from bson import ObjectId
            coll = get_investigations_collection()
            coll.insert_one({
                "alert_id": str(alert_id),
                "assigned_to": str(request.user_id),
                "status": "OPEN",
                "notes": notes,
                "created_at": now,
                "updated_at": now,
                "resolved_at": None,
            })
            # Update alert status
            alerts = get_alerts_collection()
            try:
                alerts.update_one({"_id": ObjectId(alert_id)}, {"$set": {"status": "INVESTIGATING"}})
            except Exception:
                alerts.update_one({"_id": alert_id}, {"$set": {"status": "INVESTIGATING"}})
        else:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO investigations (alert_id, assigned_to, notes, created_at, updated_at)
                VALUES (?, ?, ?, datetime('now'), datetime('now'))
            ''', (alert_id, request.user_id, notes))
            cursor.execute("UPDATE alerts SET status = 'INVESTIGATING' WHERE id = ?", (alert_id,))
            conn.commit()
            conn.close()
        
        return jsonify({"success": True, "message": "Investigation created"})

@api_bp.route('/investigations/<inv_id>', methods=['PATCH'])
@require_role(['admin', 'analyst'])
def update_investigation(inv_id):
    data = request.json
    status = data.get('status')
    notes = data.get('notes')
    
    now = datetime.now().isoformat()
    
    if _USE_MONGO:
        from bson import ObjectId
        coll = get_investigations_collection()
        update_fields = {"status": status, "notes": notes, "updated_at": now}
        if status == 'RESOLVED':
            update_fields["resolved_at"] = now
        try:
            coll.update_one({"_id": ObjectId(inv_id)}, {"$set": update_fields})
        except Exception:
            coll.update_one({"_id": inv_id}, {"$set": update_fields})
    else:
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
    if _USE_MONGO:
        coll = get_model_registry_collection()
        docs = list(coll.find())
        models = []
        for doc in docs:
            doc["id"] = str(doc.pop("_id"))
            models.append(doc)
        
        if not models:
            default_models = [
                {"name": "Isolation Forest", "version": "1.0", "status": "ACTIVE", "purpose": "Anomaly Detection", "dataset": "CICIDS2017"},
                {"name": "XGBoost", "version": "1.0", "status": "ACTIVE", "purpose": "Known Attack Classification", "dataset": "CICIDS2017"},
                {"name": "Scaler", "version": "1.0", "status": "ACTIVE", "purpose": "Preprocessing", "dataset": "CICIDS2017"},
                {"name": "Label Encoder", "version": "1.0", "status": "ACTIVE", "purpose": "Labeling", "dataset": "CICIDS2017"}
            ]
            now = datetime.now().isoformat()
            for m in default_models:
                m["created_at"] = now
            coll.insert_many(default_models)
            docs = list(coll.find())
            models = []
            for doc in docs:
                doc["id"] = str(doc.pop("_id"))
                models.append(doc)
        
        return jsonify({"success": True, "models": models})
    else:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM model_registry")
        rows = cursor.fetchall()
        models = [dict(r) for r in rows]
        
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
    if _USE_MONGO:
        coll = get_reports_collection()
        docs = list(coll.find().sort("created_at", -1).limit(50))
        reports = []
        for doc in docs:
            doc["id"] = str(doc.pop("_id"))
            reports.append(doc)
        return jsonify({"success": True, "reports": reports})
    else:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reports ORDER BY created_at DESC LIMIT 50")
        rows = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "reports": [dict(r) for r in rows]})

@api_bp.route('/reports', methods=['POST'])
@require_role(['admin', 'analyst'])
def generate_report():
    from reportlab.pdfgen import canvas
    
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

    now = datetime.now().isoformat()
    
    if _USE_MONGO:
        coll = get_reports_collection()
        result = coll.insert_one({
            "report_type": report_type,
            "title": title,
            "generated_by": str(request.user_id),
            "created_at": now,
            "parameters": timeframe,
            "content": filename,
        })
        report_id = str(result.inserted_id)
    else:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO reports (report_type, title, generated_by, created_at, parameters, content)
            VALUES (?, ?, ?, datetime('now'), ?, ?)
        ''', (report_type, title, request.user_id, timeframe, filename))
        conn.commit()
        report_id = cursor.lastrowid
        conn.close()
    
    return jsonify({"success": True, "message": "Report generated successfully", "report_id": report_id})

@api_bp.route('/reports/<report_id>/download', methods=['GET'])
@require_auth
def download_report(report_id):
    if _USE_MONGO:
        from bson import ObjectId
        coll = get_reports_collection()
        try:
            row = coll.find_one({"_id": ObjectId(report_id)})
        except Exception:
            row = coll.find_one({"_id": report_id})
        
        if not row:
            return jsonify({"error": "Report not found"}), 404
        
        # Handle both legacy absolute paths and new relative filenames
        stored_content = row.get('content', '') if _USE_MONGO else row['content']
        title = row.get('title', 'report') if _USE_MONGO else row['title']
        
        import os
        from pathlib import Path
        reports_dir = os.path.join(os.path.dirname(__file__), 'reports', 'generated')
        
        # If it's already an absolute path (legacy), we might try to extract the filename
        # A safer production approach: always extract filename and rebuild path locally
        filename = os.path.basename(stored_content)
        filepath = os.path.join(reports_dir, filename)
        
    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "Report file not found"}), 404
        
    # Prevent path traversal
    if not os.path.abspath(filepath).startswith(os.path.abspath(reports_dir)):
        return jsonify({"error": "Invalid file path"}), 400
        
    safe_filename = title.replace(' ', '_').replace('/', '_') + ".pdf"
    return send_file(filepath, as_attachment=True, download_name=safe_filename)

@api_bp.route('/notifications', methods=['GET'])
@require_auth
def get_notifications():
    if _USE_MONGO:
        coll = get_notifications_collection()
        docs = list(coll.find({"user_id": str(request.user_id)}).sort("created_at", -1).limit(50))
        notifications = []
        for doc in docs:
            doc["id"] = str(doc.pop("_id"))
            notifications.append(doc)
        return jsonify({"success": True, "notifications": notifications})
    else:
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
    
    results = []
    
    if _USE_MONGO:
        import re as regex_mod
        regex_pattern = regex_mod.compile(regex_mod.escape(query), regex_mod.IGNORECASE)
        
        # Search Alerts
        alerts = get_alerts_collection()
        for doc in alerts.find({"$or": [
            {"title": {"$regex": regex_pattern}},
            {"description": {"$regex": regex_pattern}},
            {"severity": {"$regex": regex_pattern}},
            {"status": {"$regex": regex_pattern}},
        ]}).limit(10):
            results.append({
                "type": "alert",
                "id": f"ALT-{str(doc['_id'])}",
                "title": doc.get("title", ""),
                "description": doc.get("description", ""),
                "severity": doc.get("severity", ""),
                "route": "/alerts"
            })
        
        # Search Investigations
        invs = get_investigations_collection()
        for doc in invs.find({"$or": [
            {"notes": {"$regex": regex_pattern}},
            {"status": {"$regex": regex_pattern}},
        ]}).limit(10):
            notes = doc.get("notes", "") or ""
            desc = notes[:100] + '...' if len(notes) > 100 else notes
            results.append({
                "type": "investigation",
                "id": f"INV-{str(doc['_id'])}",
                "title": f"Investigation for Alert ALT-{doc.get('alert_id', '?')}",
                "description": desc,
                "route": "/investigations"
            })
        
        # Search Predictions
        preds = get_predictions_collection()
        for doc in preds.find({"$or": [
            {"attack_type": {"$regex": regex_pattern}},
            {"severity": {"$regex": regex_pattern}},
        ]}).limit(10):
            results.append({
                "type": "prediction",
                "id": f"PRD-{str(doc['_id'])}",
                "title": f"Detection: {doc.get('attack_type', '?')}",
                "description": f"Risk Score: {doc.get('risk_score', '?')} | Severity: {doc.get('severity', '?')}",
                "severity": doc.get("severity", ""),
                "route": "/upload"
            })
    else:
        conn = get_db()
        cursor = conn.cursor()
        like_query = f"%{query}%"
        
        # Search Alerts
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
            
        # Search Investigations
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
            
        # Search Predictions
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
    
    return jsonify({"success": True, "results": results[:20]})
