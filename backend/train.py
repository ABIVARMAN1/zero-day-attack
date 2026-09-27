"""
Backend Training Script

This script programmatically triggers the full machine learning pipeline.
It runs:
1. Combine Dataset
2. Preprocessing
3. EDA
4. Feature Engineering
5 & 6. Train-Test Split & Isolation Forest
7. Train XGBoost
"""

import os
import sys
import logging
import subprocess

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

def run_script(script_path: str):
    """Run a python script as a subprocess and stream its output."""
    logging.info(f"--- Starting {os.path.basename(script_path)} ---")
    try:
        # Run process, redirecting stdout/stderr to the current terminal
        process = subprocess.Popen(
            [sys.executable, script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        
        # Print output in real-time
        for line in process.stdout:
            print(line, end="")
            
        process.wait()
        
        if process.returncode != 0:
            logging.error(f"Script {os.path.basename(script_path)} failed with exit code {process.returncode}")
            sys.exit(process.returncode)
        else:
            logging.info(f"--- Completed {os.path.basename(script_path)} ---\n")
            
    except Exception as e:
        logging.error(f"Failed to run {script_path}: {e}")
        sys.exit(1)

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_dir = os.path.join(base_dir, "src")
    
    scripts_to_run = [
        "01_combine_dataset.py",
        "02_preprocessing.py",
        "03_eda.py",
        "04_feature_engineering.py",
        "05_train_isolation_forest.py",
        "06_train_xgboost.py",
        "07_model_evaluation.py"
    ]
    
    logging.info("Starting Full Training Pipeline...")
    
    for script_name in scripts_to_run:
        script_path = os.path.join(src_dir, script_name)
        if os.path.exists(script_path):
            run_script(script_path)
        else:
            logging.error(f"Script not found: {script_path}")
            sys.exit(1)
            
    logging.info("ALL TRAINING PIPELINE STEPS COMPLETED SUCCESSFULLY.")

if __name__ == "__main__":
    main()
