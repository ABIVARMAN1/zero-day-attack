"""
Step 9: Prediction Module

This module handles making predictions on new data.
It provides a class `ZeroDayPredictor` that:
1. Loads the saved scaler, label encoder, Isolation Forest, and XGBoost models.
2. Preprocesses the input data (DataFrame).
3. Uses Isolation Forest to detect anomalies (Zero-Day attacks).
4. Uses XGBoost to classify known attack types.
5. Generates a 'Risk Score' and 'Severity' based on the output.
"""

import os
import logging
import joblib
import pandas as pd
import numpy as np
try:
    import shap
except ImportError:
    shap = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

class ZeroDayPredictor:
    def __init__(self, models_dir: str):
        logging.info("Initializing ZeroDayPredictor...")
        self.models_dir = models_dir
        
        try:
            self.scaler = joblib.load(os.path.join(models_dir, "scaler.pkl"))
            self.encoder = joblib.load(os.path.join(models_dir, "label_encoder.pkl"))
            self.iso_forest = joblib.load(os.path.join(models_dir, "isolation_forest.pkl"))
            self.xgb_model = joblib.load(os.path.join(models_dir, "xgboost.pkl"))
            
            # Identify Benign class
            self.benign_classes = [c for c in self.encoder.classes_ if 'benign' in str(c).lower() or 'normal' in str(c).lower()]
            self.benign_class = self.benign_classes[0] if self.benign_classes else 'Benign'
            
            # Initialize SHAP explainer if available
            self.explainer = None
            if shap is not None and self.xgb_model is not None:
                try:
                    self.explainer = shap.TreeExplainer(self.xgb_model)
                    logging.info("SHAP explainer initialized.")
                except Exception as e:
                    logging.warning(f"Could not initialize SHAP explainer: {e}")
                    
            logging.info("Models loaded successfully.")
        except Exception as e:
            logging.error(f"Failed to load models: {e}")
            raise

    def get_severity(self, risk_score: int) -> str:
        # Configurable thresholds
        thresholds = {
            "NORMAL": 24,
            "LOW": 49,
            "MEDIUM": 74,
            "HIGH": 89
        }
        
        if risk_score <= thresholds["NORMAL"]:
            return "NORMAL"
        elif risk_score <= thresholds["LOW"]:
            return "LOW"
        elif risk_score <= thresholds["MEDIUM"]:
            return "MEDIUM"
        elif risk_score <= thresholds["HIGH"]:
            return "HIGH"
        else:
            return "CRITICAL"

    def preprocess(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        if not df.empty and len(df.columns) > 0 and all(isinstance(c, str) for c in df.columns):
            df.columns = df.columns.str.strip()
        cols_to_drop = ["Flow ID", "Source IP", "Destination IP", "Timestamp", "Label"]
        actual_drop = [c for c in df.columns if c in cols_to_drop]
        if actual_drop:
            df = df.drop(columns=actual_drop)
        
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.fillna(0)
        
        # Ensure only numeric columns are left and match scaler
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df = df[numeric_cols]
        
        expected_cols = getattr(self.scaler, "feature_names_in_", None)
        if expected_cols is not None:
            df = df.reindex(columns=expected_cols, fill_value=0)
            
        return df

    def predict(self, df_input: pd.DataFrame) -> list:
        results = []
        df = self.preprocess(df_input)
        
        if len(df) == 0:
            return results
            
        logging.info("Scaling features...")
        X_scaled = self.scaler.transform(df.astype(np.float32))
        
        logging.info("Running Isolation Forest for anomaly detection...")
        # 1 = Normal, -1 = Anomaly
        anomaly_predictions = self.iso_forest.predict(X_scaled)
        # Lower score = more anomalous
        anomaly_scores = self.iso_forest.decision_function(X_scaled)
        
        logging.info("Running XGBoost classification...")
        xgb_predictions = self.xgb_model.predict(X_scaled)
        xgb_probabilities = self.xgb_model.predict_proba(X_scaled)
        
        for i in range(len(X_scaled)):
            is_anomaly = (anomaly_predictions[i] == -1)
            # Normalize anomaly score to 0-1 range (higher = more anomalous)
            # decision_function usually returns negative for anomalies, positive for normal
            # Let's map a heuristic score
            raw_iso_score = float(anomaly_scores[i])
            anomaly_score = max(0.0, min(1.0, 0.5 - raw_iso_score * 5.0)) 
            
            xgb_class_idx = xgb_predictions[i]
            xgb_class_name = self.encoder.inverse_transform([xgb_class_idx])[0]
            confidence = float(xgb_probabilities[i][xgb_class_idx])
            
            # SHAP Values (compute only for non-benign predictions to save time)
            shap_contributions = []
            if self.explainer is not None and (is_anomaly or xgb_class_name not in self.benign_classes):
                try:
                    # Calculate shap values for this specific row
                    shap_vals = self.explainer.shap_values(X_scaled[i:i+1])
                    if isinstance(shap_vals, list):
                        # Multi-class: get values for predicted class
                        sv = shap_vals[xgb_class_idx][0]
                    else:
                        sv = shap_vals[0]
                        
                    # Get top 5 features
                    feature_names = getattr(self.scaler, "feature_names_in_", [f"Feature {j}" for j in range(len(sv))])
                    
                    # Sort by absolute contribution
                    top_indices = np.argsort(np.abs(sv))[-5:][::-1]
                    for idx in top_indices:
                        shap_contributions.append({
                            "feature": str(feature_names[idx]),
                            "value": float(X_scaled[i][idx]),
                            "contribution": float(sv[idx]),
                            "direction": "POSITIVE" if sv[idx] > 0 else "NEGATIVE"
                        })
                except Exception as e:
                    logging.warning(f"Failed to calculate SHAP for row {i}: {e}")
            
            risk_score = 0
            prediction_status = "NORMAL"
            attack_type = "None"
            
            if is_anomaly:
                if xgb_class_name in self.benign_classes:
                    prediction_status = "SUSPICIOUS"
                    attack_type = "Zero-Day/Unknown Anomaly"
                    risk_score = 85 # High risk, novel anomaly
                else:
                    prediction_status = "SUSPICIOUS"
                    attack_type = xgb_class_name
                    risk_score = int(max(71, confidence * 100)) # Known attack, high risk
            else:
                if xgb_class_name in self.benign_classes:
                    prediction_status = "NORMAL"
                    risk_score = int((1.0 - confidence) * 30) # Low risk
                else:
                    prediction_status = "SUSPICIOUS"
                    attack_type = xgb_class_name
                    # Medium to High risk (XGBoost found it, but IF missed it)
                    risk_score = int(max(50, confidence * 80))
                    
            risk_score = max(0, min(100, risk_score))
            severity = self.get_severity(risk_score)
            
            results.append({
                "prediction": prediction_status,
                "attack_type": attack_type,
                "anomaly": is_anomaly,
                "anomaly_score": anomaly_score,
                "confidence": confidence,
                "risk_score": risk_score,
                "severity": severity,
                "shap_values": shap_contributions
            })
            
        return results

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, "models")
    predictor = ZeroDayPredictor(models_dir)
    print("ZeroDayPredictor initialized successfully.")
