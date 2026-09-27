"""
Step 7: Train XGBoost (Known Attack Classification)

This script:
1. Loads the supervised training data (`X_train_xgb.parquet`, `y_train_xgb.parquet`).
2. Trains an XGBoost classifier for multi-class attack classification.
3. Saves the trained model to 'models/xgboost.pkl'.
"""

import os
import logging
import pandas as pd
import joblib
import xgboost as xgb

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

def main() -> None:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "dataset")
    models_dir = os.path.join(base_dir, "models")
    
    X_train_file = os.path.join(dataset_dir, "X_train_xgb.parquet")
    y_train_file = os.path.join(dataset_dir, "y_train_xgb.parquet")
    
    try:
        logging.info("Loading XGBoost training data...")
        X_train = pd.read_parquet(X_train_file)
        y_train = pd.read_parquet(y_train_file)['Label']
        
        num_classes = len(y_train.unique())
        logging.info(f"Number of classes for training: {num_classes}")
        
        logging.info("Training XGBoost Classifier...")
        xgb_model = xgb.XGBClassifier(
            objective='multi:softmax',
            num_class=num_classes,
            n_estimators=100,
            learning_rate=0.1,
            max_depth=6,
            random_state=42,
            n_jobs=-1,
            tree_method='hist' # Faster for large datasets
        )
        
        xgb_model.fit(X_train, y_train)
        
        model_path = os.path.join(models_dir, "xgboost.pkl")
        joblib.dump(xgb_model, model_path)
        logging.info(f"XGBoost model saved to {model_path}")
        
    except Exception as e:
        logging.error(f"An error occurred during XGBoost training: {e}")

if __name__ == "__main__":
    main()
