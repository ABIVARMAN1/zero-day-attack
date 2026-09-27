"""
Step 4: Feature Engineering

This script takes the cleaned dataset and applies transformations:
- Separates features (X) and target (y)
- Encodes the target categorical labels using LabelEncoder
- Saves the encoder to the 'models/' directory
- Does NOT scale yet to prevent data leakage (scaling is done after train/test split in Phase 6)
- Saves the transformed data as 'X_engineered.parquet' and 'y_engineered.parquet'
"""

import os
import logging
import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import LabelEncoder

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
    input_file = os.path.join(dataset_dir, "cleaned_dataset.parquet")
    output_x_file = os.path.join(dataset_dir, "X_engineered.parquet")
    output_y_file = os.path.join(dataset_dir, "y_engineered.parquet")
    
    ensure_dir(models_dir)
    
    try:
        logging.info(f"Loading cleaned dataset from {input_file}...")
        df = pd.read_parquet(input_file)
        
        target_col = 'Label'
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in the dataset.")
            
        logging.info("Separating features and target...")
        X = df.drop(columns=[target_col])
        y = df[target_col]
        
        # Encode labels
        logging.info("Encoding categorical labels...")
        encoder = LabelEncoder()
        y_encoded = encoder.fit_transform(y)
        
        # Save the encoder
        encoder_path = os.path.join(models_dir, "label_encoder.pkl")
        joblib.dump(encoder, encoder_path)
        logging.info(f"LabelEncoder saved to {encoder_path}")
        
        # Log class mapping for reference
        mapping = dict(zip(encoder.classes_, encoder.transform(encoder.classes_)))
        logging.info(f"Label Mapping: {mapping}")
        
        y_df = pd.DataFrame({target_col: y_encoded}, dtype=np.int32)
        
        logging.info(f"Saving engineered features to {output_x_file} and {output_y_file}...")
        X.to_parquet(output_x_file, index=False)
        y_df.to_parquet(output_y_file, index=False)
        logging.info("Feature Engineering complete.")
        
    except Exception as e:
        logging.error(f"An error occurred during feature engineering: {e}")

if __name__ == "__main__":
    main()
