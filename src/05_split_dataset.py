"""
Step 5: Train / Test Split & Scaling

This script creates two distinct evaluation setups:
1. XGBoost Setup (Supervised Classification):
   - Standard 80/20 stratified split.
   - Fits StandardScaler on train, transforms train and test.
2. Isolation Forest Setup (Zero-Day / Novelty Detection):
   - Trains ONLY on BENIGN (Normal) traffic.
   - Evaluates on a mix of normal traffic and the held-out novel attacks.
"""

import os
import logging
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

def ensure_dir(directory: str) -> None:
    if not os.path.exists(directory):
        os.makedirs(directory)

def main() -> None:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "dataset")
    models_dir = os.path.join(base_dir, "models")
    x_input = os.path.join(dataset_dir, "X_engineered.parquet")
    y_input = os.path.join(dataset_dir, "y_engineered.parquet")
    encoder_path = os.path.join(models_dir, "label_encoder.pkl")
    
    try:
        logging.info(f"Loading engineered data...")
        X = pd.read_parquet(x_input)
        y = pd.read_parquet(y_input)['Label']
        
        encoder = joblib.load(encoder_path)
        
        # -----------------------------------------------------
        # 1. XGBoost Data Split (Supervised)
        # -----------------------------------------------------
        logging.info("Performing 80/20 Stratified Split for XGBoost...")
        X_train_xgb, X_test_xgb, y_train_xgb, y_test_xgb = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )
        
        # Scale Data
        logging.info("Fitting StandardScaler on XGBoost Training Data...")
        scaler = StandardScaler()
        # Transform ensuring float32
        X_train_xgb_scaled = pd.DataFrame(
            scaler.fit_transform(X_train_xgb.astype(np.float32)), 
            columns=X_train_xgb.columns
        )
        X_test_xgb_scaled = pd.DataFrame(
            scaler.transform(X_test_xgb.astype(np.float32)), 
            columns=X_test_xgb.columns
        )
        
        joblib.dump(scaler, os.path.join(models_dir, "scaler.pkl"))
        
        # Save XGBoost data
        logging.info("Saving XGBoost train/test datasets...")
        X_train_xgb_scaled.to_parquet(os.path.join(dataset_dir, "X_train_xgb.parquet"), index=False)
        X_test_xgb_scaled.to_parquet(os.path.join(dataset_dir, "X_test_xgb.parquet"), index=False)
        pd.DataFrame({'Label': y_train_xgb}).to_parquet(os.path.join(dataset_dir, "y_train_xgb.parquet"), index=False)
        pd.DataFrame({'Label': y_test_xgb}).to_parquet(os.path.join(dataset_dir, "y_test_xgb.parquet"), index=False)
        
        # -----------------------------------------------------
        # 2. Isolation Forest Split (Zero-Day Setup)
        # -----------------------------------------------------
        logging.info("Setting up Isolation Forest Zero-Day evaluation...")
        
        # We need to identify 'BENIGN' label. Let's find its encoded value.
        benign_label = None
        classes = encoder.classes_
        for i, c in enumerate(classes):
            if c.upper() == 'BENIGN':
                benign_label = i
                break
                
        if benign_label is None:
            logging.warning("BENIGN label not found. Defaulting to 0.")
            benign_label = 0
            
        benign_mask = (y == benign_label)
        X_benign = X[benign_mask]
        
        # Train IF on 80% of Benign data
        X_train_if, X_test_benign_if = train_test_split(
            X_benign, test_size=0.20, random_state=42
        )
        
        # Test IF on the 20% Benign data + ALL Attack data
        X_attack = X[~benign_mask]
        y_attack = y[~benign_mask]
        
        # Combine test set
        X_test_if = pd.concat([X_test_benign_if, X_attack], ignore_index=True)
        y_test_if = pd.concat([
            pd.Series([benign_label]*len(X_test_benign_if)), 
            y_attack
        ], ignore_index=True)
        
        logging.info("Scaling Isolation Forest Data using the existing scaler...")
        X_train_if_scaled = pd.DataFrame(
            scaler.transform(X_train_if.astype(np.float32)), 
            columns=X_train_if.columns
        )
        X_test_if_scaled = pd.DataFrame(
            scaler.transform(X_test_if.astype(np.float32)), 
            columns=X_test_if.columns
        )
        
        logging.info("Saving Isolation Forest datasets...")
        X_train_if_scaled.to_parquet(os.path.join(dataset_dir, "X_train_if.parquet"), index=False)
        X_test_if_scaled.to_parquet(os.path.join(dataset_dir, "X_test_if.parquet"), index=False)
        pd.DataFrame({'Label': y_test_if}).to_parquet(os.path.join(dataset_dir, "y_test_if.parquet"), index=False)
        
        logging.info("Train/Test split complete.")
        
    except Exception as e:
        logging.error(f"An error occurred during train/test split: {e}")

if __name__ == "__main__":
    main()
