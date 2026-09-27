"""
Step 6: Train Isolation Forest (Zero-Day Detection)

This script:
1. Loads the prepared Isolation Forest training data (`X_train_if.parquet`).
2. Trains an Isolation Forest model to learn normal behavior.
3. Saves the trained model to 'models/isolation_forest.pkl'.
"""

import os
import logging
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

def main() -> None:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "dataset")
    models_dir = os.path.join(base_dir, "models")
    input_file = os.path.join(dataset_dir, "X_train_if.parquet")
    
    try:
        logging.info(f"Loading Isolation Forest training data from {input_file}...")
        X_train_if = pd.read_parquet(input_file)
        
        logging.info("Training Isolation Forest on BENIGN traffic (this might take a while)...")
        # Initialize Isolation Forest. 
        iso_forest = IsolationForest(
            n_estimators=100, 
            max_samples='auto', 
            contamination=0.01, # Expecting 1% noise/outliers in the training data
            random_state=42,
            n_jobs=-1
        )
        
        iso_forest.fit(X_train_if)
        
        model_path = os.path.join(models_dir, "isolation_forest.pkl")
        joblib.dump(iso_forest, model_path)
        logging.info(f"Isolation Forest model saved to {model_path}")
        
    except Exception as e:
        logging.error(f"An error occurred during Isolation Forest Training: {e}")

if __name__ == "__main__":
    main()
