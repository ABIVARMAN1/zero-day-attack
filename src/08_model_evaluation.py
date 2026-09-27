"""
Step 8: Model Evaluation Visualizations

This script:
1. Loads the XGBoost test data and model, and generates classification metrics, Confusion Matrix, and ROC Curve.
2. Loads the Isolation Forest test data (normal + all novel attacks) and model, and evaluates anomaly detection metrics (Precision, Recall, F1, FPR, FNR, Confusion Matrix).
3. Saves plots in the 'output/evaluation/' folder.
"""

import os
import logging
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from sklearn.metrics import confusion_matrix, roc_curve, auc, precision_score, recall_score, f1_score, classification_report, average_precision_score, precision_recall_curve
from sklearn.preprocessing import label_binarize

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

plt.style.use('dark_background')
sns.set_palette("viridis")

def ensure_dir(directory: str) -> None:
    if not os.path.exists(directory):
        os.makedirs(directory)

def main() -> None:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "dataset")
    models_dir = os.path.join(base_dir, "models")
    output_dir = os.path.join(base_dir, "output", "evaluation")
    
    ensure_dir(output_dir)
    
    try:
        # ---------------------------------------------------------
        # XGBOOST EVALUATION
        # ---------------------------------------------------------
        logging.info("--- EVALUATING XGBOOST ---")
        X_test_xgb = pd.read_parquet(os.path.join(dataset_dir, "X_test_xgb.parquet"))
        y_test_xgb = pd.read_parquet(os.path.join(dataset_dir, "y_test_xgb.parquet"))['Label']
        
        xgb_model = joblib.load(os.path.join(models_dir, "xgboost.pkl"))
        encoder = joblib.load(os.path.join(models_dir, "label_encoder.pkl"))
        classes = encoder.classes_
        
        y_pred_xgb = xgb_model.predict(X_test_xgb)
        y_prob_xgb = xgb_model.predict_proba(X_test_xgb)
        
        # XGBoost Metrics
        print("\n" + "="*50)
        print("XGBOOST EVALUATION METRICS SAVED TO FILE")
        print("="*50)
        report = classification_report(y_test_xgb, y_pred_xgb, target_names=classes, zero_division=0)
        with open(os.path.join(output_dir, 'xgboost_classification_report.txt'), 'w', encoding='utf-8') as f:
            f.write(report)
        
        # XGBoost Confusion Matrix
        logging.info("Generating XGBoost Confusion Matrix...")
        cm_xgb = confusion_matrix(y_test_xgb, y_pred_xgb)
        plt.figure(figsize=(14, 12))
        sns.heatmap(cm_xgb, annot=True, fmt='d', cmap='Blues', 
                    xticklabels=classes, yticklabels=classes)
        plt.title('XGBoost Confusion Matrix')
        plt.xlabel('Predicted Label')
        plt.ylabel('True Label')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'xgb_confusion_matrix.png'), dpi=300)
        plt.close()
        
        # XGBoost ROC Curve
        logging.info("Generating XGBoost ROC Curve...")
        n_classes = len(classes)
        y_test_bin = label_binarize(y_test_xgb, classes=range(n_classes))
        
        plt.figure(figsize=(12, 10))
        for i in range(n_classes):
            if np.sum(y_test_bin[:, i]) > 0:
                fpr_i, tpr_i, _ = roc_curve(y_test_bin[:, i], y_prob_xgb[:, i])
                roc_auc_i = auc(fpr_i, tpr_i)
                plt.plot(fpr_i, tpr_i, lw=2, label=f'{classes[i][:15]} (AUC = {roc_auc_i:.2f})')
                
        plt.plot([0, 1], [0, 1], 'k--', lw=2)
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('XGBoost ROC Curve (One-vs-Rest)')
        plt.legend(loc="center left", bbox_to_anchor=(1, 0.5), fontsize='small')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'xgb_roc_curve.png'), dpi=300)
        plt.close()
        
        # ---------------------------------------------------------
        # ISOLATION FOREST EVALUATION
        # ---------------------------------------------------------
        logging.info("--- EVALUATING ISOLATION FOREST ---")
        X_test_if = pd.read_parquet(os.path.join(dataset_dir, "X_test_if.parquet"))
        y_test_if = pd.read_parquet(os.path.join(dataset_dir, "y_test_if.parquet"))['Label']
        iso_forest = joblib.load(os.path.join(models_dir, "isolation_forest.pkl"))
        
        benign_label = None
        for i, c in enumerate(classes):
            if c.upper() == 'BENIGN':
                benign_label = i
                break
        
        # IF predictions: 1 = normal, -1 = anomaly
        if_preds_raw = iso_forest.predict(X_test_if)
        
        # Convert IF predictions to our format: 0 = normal, 1 = anomaly/attack
        y_pred_if_binary = np.where(if_preds_raw == 1, 0, 1)
        
        # Convert true labels to binary: 0 = benign, 1 = attack
        y_test_if_binary = np.where(y_test_if == benign_label, 0, 1)
        
        # IF Metrics
        acc_if = np.mean(y_pred_if_binary == y_test_if_binary)
        prec_if = precision_score(y_test_if_binary, y_pred_if_binary, zero_division=0)
        rec_if = recall_score(y_test_if_binary, y_pred_if_binary, zero_division=0)
        f1_if = f1_score(y_test_if_binary, y_pred_if_binary, zero_division=0)
        
        cm_if = confusion_matrix(y_test_if_binary, y_pred_if_binary)
        tn, fp, fn, tp = cm_if.ravel()
        fpr_if = fp / (fp + tn) if (fp + tn) > 0 else 0
        fnr_if = fn / (fn + tp) if (fn + tp) > 0 else 0
        
        print("\n" + "="*50)
        print("ISOLATION FOREST EVALUATION METRICS (Zero-Day Setup)")
        print("="*50)
        print(f"Accuracy:  {acc_if:.4f}")
        print(f"Precision: {prec_if:.4f}")
        print(f"Recall:    {rec_if:.4f}")
        print(f"F1 Score:  {f1_if:.4f}")
        print(f"False Positive Rate (FPR): {fpr_if:.4f}")
        print(f"False Negative Rate (FNR): {fnr_if:.4f}")
        print("="*50 + "\n")
        
        # IF Confusion Matrix
        logging.info("Generating Isolation Forest Confusion Matrix...")
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm_if, annot=True, fmt='d', cmap='OrRd', 
                    xticklabels=['Normal', 'Anomaly'], yticklabels=['Normal', 'Anomaly'])
        plt.title('Isolation Forest Confusion Matrix')
        plt.xlabel('Predicted Label')
        plt.ylabel('True Label')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'if_confusion_matrix.png'), dpi=300)
        plt.close()
        
        logging.info(f"All evaluation plots saved to {output_dir}")
        
    except Exception as e:
        logging.error(f"An error occurred during model evaluation: {e}")

if __name__ == "__main__":
    main()
