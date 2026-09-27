# AI-Driven Zero-Day Attack Detection System

## 1. Project Title
AI-Driven Zero-Day Attack Detection System

## 2. Abstract
The increasing frequency and sophistication of cyberattacks, particularly zero-day exploits, present a significant challenge to modern network security. Traditional signature-based intrusion detection systems (IDS) fail to identify previously unseen attacks. This project presents a hybrid AI-driven cybersecurity system that leverages an Unsupervised Learning model (Isolation Forest) for Anomaly/Novelty Detection (Zero-Day attacks) and a Supervised Learning model (XGBoost) for Known Attack Classification. It is equipped with a Flask API backend, a comprehensive React dashboard for real-time monitoring and historical analysis, and SQLite for persistence.

## 3. Problem Statement
Network administrators struggle to identify novel zero-day attacks because traditional signature-based security systems rely on known threat databases. When an attacker utilizes a previously unseen methodology, the traffic bypasses these defenses. A solution is required that models "normal" baseline behavior and flags significant deviations as potential threats, before classifying known attacks for faster response.

## 4. Objectives
- To build a robust data preprocessing and feature engineering pipeline for network traffic logs.
- To detect novel/unknown (zero-day) attacks using anomaly detection algorithms.
- To classify known network intrusions into specific categories (e.g., DDoS, Botnet, Web Attack).
- To compute a dynamic Risk Score (0-100) and severity level for detected threats.
- To provide an interactive cybersecurity dashboard for analysis.

## 5. Existing System
Existing IDS platforms are heavily reliant on deep packet inspection and signature matching. While highly effective against known malware and DDoS patterns, their primary limitation is zero-day vulnerability detection. They also often lack Explainable AI (XAI) features, leaving administrators guessing why an alert was triggered.

## 6. Proposed System
The proposed system uses a dual-engine machine learning pipeline:
1. **Isolation Forest Engine:** Learns strictly from normal (Benign) traffic to define a baseline. Any significant deviation is flagged as an anomaly.
2. **XGBoost Engine:** A multi-class supervised model trained on known attack patterns to classify the specific type of attack (e.g., DoS, Brute Force).
3. **Risk Scoring System:** Synthesizes the confidence of XGBoost and the anomaly score of the Isolation Forest to output a unified Risk Score.

## 7. System Architecture
```text
[Network Traffic Data] -> [Data Preprocessing] -> [Standard Scaler] -> [Isolation Forest (Anomaly Check)]
                                                                                |
                                                  (If Suspicious/Known) -> [XGBoost (Classification)]
                                                                                |
[React Dashboard] <- [Flask API Backend] <- [SQLite Database] <- [Risk Scorer (LOW/MEDIUM/HIGH)]
```

## 8. Workflow
1. **Data Ingestion:** CICIDS2017 parquet files are merged.
2. **Cleaning:** Duplicates and non-numeric fields are removed; NaNs handled.
3. **Feature Engineering:** Categorical labels encoded, zero-variance features dropped.
4. **Zero-Day Split:** Isolation forest trained only on benign data.
5. **Prediction:** Input -> Isolation Forest -> XGBoost -> Database -> Dashboard.

## 9. Dataset
The **CICIDS2017** dataset is utilized, containing benign and the most up-to-date common attacks, resembling true real-world data (PCAPs). The dataset includes classes like Bot, DDoS, DoS GoldenEye, DoS Hulk, DoS Slowhttptest, DoS slowloris, FTP-Patator, Heartbleed, Infiltration, PortScan, SSH-Patator, and Web Attacks.

## 10. Data Preprocessing
- Removal of 82,000+ duplicate rows.
- Dropping irrelevant identifiers (Flow ID, IPs, Timestamp) to prevent data leakage.
- Downcasting numerical datatypes (`int64` -> `int8/16/32`) to optimize memory footprint by over 70%.

## 11. Feature Engineering
- Standardization using `StandardScaler` applied strictly post-split.
- Categorical target encoded using `LabelEncoder`.
- Zero-variance (constant) features removed to reduce dimensionality.

## 12. Isolation Forest (Anomaly Detection)
Acts as the zero-day detector. It is trained entirely on normal (Benign) traffic with a contamination parameter of 0.01. During evaluation, it successfully identified hold-out attacks (novelties) with an extremely low False Positive Rate (~0.009).

## 13. XGBoost (Attack Classification)
Acts as the supervised classifier. Configured with `multi:softmax` for 15 classes, it achieves >99% accuracy on the known attack test set.

## 14. Model Evaluation
Extensive evaluation metrics (Precision, Recall, F1-Score, FPR, FNR) were computed.
- **XGBoost:** Displayed near-perfect recall on known high-volume attacks (DDoS).
- **Isolation Forest:** Proved highly conservative, ensuring normal traffic is rarely interrupted (low False Positive Rate), while effectively flagging deep statistical anomalies.

## 15. Risk Scoring
- **0-30 (LOW):** Normal traffic or extremely low-confidence classification.
- **31-70 (MEDIUM):** Known attacks detected with moderate confidence, or borderline anomalies.
- **71-100 (HIGH):** High-confidence known attacks, or severe Zero-Day anomalies (where Isolation Forest flags strongly but XGBoost is confused).

## 16. Explainable AI (XAI)
A script (`src/10_model_explainability.py`) is included to generate SHAP (SHapley Additive exPlanations) values to interpret XGBoost's decisions globally and locally.

## 17. Backend (Flask)
- Provides RESTful API endpoints (`/api/predict`, `/api/history`, `/api/health`).
- Serves as the bridge between the ML models (`09_prediction.py`) and the React UI.

## 18. Frontend (React)
- A modern UI built with Vite, React Router, and Plotly.
- Features real-time simulation capabilities, historical threat timelines, and interactive charts.

## 19. Database (SQLite)
- Stores all predictions in a `predictions` table for historical auditing and timeline generation.

## 20. Installation & Execution

**1. Install Python Dependencies**
```bash
pip install -r requirements.txt
```

**2. Setup React Frontend**
```bash
cd frontend
npm install
```

**3. Start Backend Server**
```bash
python backend/app.py
```

**4. Start Frontend Dashboard**
Open a new terminal:
```bash
cd frontend
npm run dev
```

## 21. API Documentation
- `GET /api/health` - Check backend status.
- `POST /api/predict` - Requires `{"features": { ... }}` JSON payload. Returns predicted `risk_score`, `severity`, and `attack_type`.
- `GET /api/history?limit=100` - Returns prediction log history.

## 22. Project Structure
Core ML scripts are numbered sequentially in `src/` (01 to 10) to reflect the pipeline timeline, while the API is located in `backend/app.py`. Models and scalers are saved in `models/`.

## 23. Results
The hybrid model successfully bridges the gap between traditional supervised IDS and theoretical zero-day detection, reducing false positives while maintaining high accuracy on known threats.

## 24. Limitations
- Isolation Forest struggles with attacks that perfectly mimic normal traffic distribution (low recall on specific subtle infiltrations).
- Pure anomaly detection can be sensitive to sudden legitimate shifts in network architecture.

## 25. Future Enhancement
- Implement online learning (incremental fitting) so the Isolation Forest adapts to changing "normal" baselines over time.
- Direct integration with PCAP packet sniffers (e.g., Zeek/Snort) for true live network ingestion.

## 26. Conclusion
This AI-Driven Zero-Day Attack Detection System demonstrates the viability of a dual-engine machine learning pipeline for robust, interpretable, and scalable network security monitoring.
