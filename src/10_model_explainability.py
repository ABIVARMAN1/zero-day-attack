"""
Step 13: Model Explainability (SHAP)

This script loads the trained XGBoost model and a sample of test data
to generate SHAP (SHapley Additive exPlanations) values. 
It creates a summary plot highlighting the most important features
for the model's decision-making process.
"""

import os
import logging
import pandas as pd
import joblib
import shap
import matplotlib.pyplot as plt

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

def ensure_dir(directory: str) -> None:
    if not os.path.exists(directory):
        os.makedirs(directory)

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "dataset")
    models_dir = os.path.join(base_dir, "models")
    output_dir = os.path.join(base_dir, "output")
    
    ensure_dir(output_dir)
    
    try:
        logging.info("Loading XGBoost model and test data...")
        xgb_model = joblib.load(os.path.join(models_dir, "xgboost.pkl"))
        X_test = pd.read_parquet(os.path.join(dataset_dir, "X_test.parquet"))
        
        # We use a smaller sample for SHAP because calculating SHAP values on 400k rows is very slow
        logging.info("Sampling test data for SHAP explanation (N=2000)...")
        X_sample = X_test.sample(n=min(2000, len(X_test)), random_state=42)
        
        logging.info("Initializing SHAP TreeExplainer...")
        explainer = shap.TreeExplainer(xgb_model)
        
        logging.info("Calculating SHAP values...")
        shap_values = explainer.shap_values(X_sample)
        
        logging.info("Generating SHAP Summary Plot...")
        plt.figure(figsize=(12, 10))
        # Since it's multi-class, shap_values is a list of arrays.
        # Plotting the summary plot for multi-class shows feature importance across classes
        shap.summary_plot(shap_values, X_sample, plot_type="bar", show=False)
        
        plt.title('SHAP Feature Importance (Top Features)')
        plt.tight_layout()
        
        output_path = os.path.join(output_dir, 'shap_summary_plot.png')
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logging.info(f"SHAP explanation plot saved to {output_path}")
        
    except Exception as e:
        logging.error(f"An error occurred during SHAP explanation generation: {e}")

if __name__ == "__main__":
    main()
