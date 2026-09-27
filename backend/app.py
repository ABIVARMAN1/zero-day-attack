import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from backend.database.db import init_db, insert_prediction, get_predictions, insert_alert
import sys
import importlib.util
import pandas as pd

# Add src to path to import predictor
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(base_dir, 'src'))

# Handle the fact that script name starts with number
spec = importlib.util.spec_from_file_location("ZeroDayPredictor", os.path.join(base_dir, "src", "09_prediction.py"))
pred_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pred_module)
ZeroDayPredictor = pred_module.ZeroDayPredictor

from backend.auth_routes import auth_bp
from backend.api_routes import api_bp
from backend.auth import require_auth, hash_password
from backend.database.auth_db import create_user, get_db_connection

app = Flask(__name__)
# Enable CORS for credentials (cookies)
CORS(app, supports_credentials=True)

# Initialize Limiter for brute-force protection
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["100000 per day", "50000 per hour"],
    storage_uri="memory://"
)

# Apply rate limits to auth routes
limiter.limit("60 per minute")(auth_bp)

app.register_blueprint(auth_bp)
app.register_blueprint(api_bp, url_prefix='/api')

# Initialize Predictor
models_dir = os.path.join(base_dir, "models")
predictor = None

def get_predictor():
    global predictor
    if predictor is None:
        predictor = ZeroDayPredictor(models_dir)
    return predictor

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Backend is running!"})

@app.route('/dashboard', methods=['GET'])
@app.route('/api/statistics', methods=['GET'])
@app.route('/api/model-performance', methods=['GET'])
@require_auth
def dashboard():
    # Provide mock or aggregate data for the dashboard
    history = get_predictions(1000)
    total = max(len(history), 100) # prevent zero
    normal = sum(1 for p in history if p['prediction'] == 'NORMAL')
    attacks = sum(1 for p in history if p['prediction'] != 'NORMAL' and p['attack_type'] != 'Zero-Day/Unknown Anomaly')
    zero_day = sum(1 for p in history if p['prediction'] != 'NORMAL' and p['attack_type'] == 'Zero-Day/Unknown Anomaly')
    high_risk = sum(1 for p in history if p['risk_score'] > 70)
    
    if not history:
        return jsonify({
            "total_packets": 12543,
            "normal_traffic": 11023,
            "detected_attacks": 1450,
            "zero_day_attacks": 70,
            "high_risk_alerts": 320,
            "threat_level": "MEDIUM",
            "attack_distribution": {"DDoS": 800, "Botnet": 400, "PortScan": 250}
        })

    dist = {}
    for p in history:
        if p['prediction'] != 'NORMAL':
            dist[p['attack_type']] = dist.get(p['attack_type'], 0) + 1

    threat_level = "LOW"
    if high_risk > 50: threat_level = "CRITICAL"
    elif high_risk > 10: threat_level = "HIGH"
    elif attacks > 0 or zero_day > 0: threat_level = "MEDIUM"

    return jsonify({
        "total_packets": total,
        "normal_traffic": normal,
        "detected_attacks": attacks,
        "zero_day_attacks": zero_day,
        "high_risk_alerts": high_risk,
        "threat_level": threat_level,
        "attack_distribution": dist
    })

@app.route('/history', methods=['GET'])
@app.route('/api/history', methods=['GET'])
@require_auth
def history():
    limit = int(request.args.get('limit', 100))
    hist = get_predictions(limit)
    return jsonify({"success": True, "history": hist})

@app.route('/upload', methods=['POST'])
@app.route('/api/predict', methods=['POST'])
@require_auth
def upload():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if not file.filename.lower().endswith('.csv'):
        return jsonify({"error": "Invalid file type. Only CSV allowed."}), 400
    
    try:
        try:
            df = pd.read_csv(file, on_bad_lines='error')
            if df.empty or len(df.columns) < 2:
                raise ValueError()
        except Exception:
            return jsonify({"error": "Malformed CSV file"}), 400
        if len(df) > 1000:
            df = df.sample(1000)
            
        p = get_predictor()
        results = p.predict(df)
        
        for res in results[:50]:
            meta = {
                "anomaly_score": res.get("anomaly_score", 0.0),
                "shap_values": res.get("shap_values", [])
            }
            
            pred_id = insert_prediction(
                prediction=res['prediction'],
                attack_type=res['attack_type'],
                risk_score=res['risk_score'],
                severity=res['severity'],
                confidence=res['confidence'],
                source="CSV Upload",
                metadata=meta
            )
            
            # Generate alert for High/Critical risks (Phase 1)
            if res['severity'] in ['HIGH', 'CRITICAL'] or res['risk_score'] >= 75:
                title = f"{res['severity']} Threat: {res['attack_type']}"
                desc = f"Detected anomalous traffic classified as {res['attack_type']} with risk score {res['risk_score']}"
                insert_alert(pred_id, res['severity'], title, desc, res['risk_score'])

        formatted = []
        for r in results:
            status = 'Normal'
            if r['prediction'] != 'NORMAL':
                status = 'Zero-Day' if r['attack_type'] == 'Zero-Day/Unknown Anomaly' else 'Known Attack'
            
            formatted.append({
                "status": status,
                "attack_type": r['attack_type'],
                "confidence": r['confidence'],
                "risk_score": r['risk_score'],
                "anomaly_score": r.get('anomaly_score', 0.0),
                "shap_values": r.get('shap_values', [])
            })
            
        return jsonify({
            "total_records": len(results),
            "results": formatted
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def seed_admin_user():
    conn = get_db_connection()
    user = conn.execute("SELECT id FROM users LIMIT 1").fetchone()
    conn.close()
    
    if not user:
        print("No users found. Creating default admin user...")
        pwd_hash = hash_password("Admin123!")
        create_user("admin", "admin@soc.local", pwd_hash, name="System Admin", role="admin")
        print("Created admin@soc.local with password 'Admin123!'")

if __name__ == '__main__':
    init_db()
    seed_admin_user()
    app.run(debug=True, port=5000, host='0.0.0.0')

