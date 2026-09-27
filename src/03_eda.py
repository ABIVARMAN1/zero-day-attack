"""
Step 3: Exploratory Data Analysis

This script loads the cleaned dataset and generates several visualizations:
- Missing value graph
- Attack distribution
- Correlation heatmap (top 20 correlated features)
- Feature histogram (top 9 numerical features)
- Feature importance (using a quick Random Forest on a sample)
- Outlier detection (boxplots for top features)

All plots are saved in the 'output/' directory.
"""

import os
import logging
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

# Set style for plots
plt.style.use('dark_background') # Setting dark background for a cybersecurity vibe
sns.set_palette("viridis")

def ensure_dir(directory: str) -> None:
    if not os.path.exists(directory):
        os.makedirs(directory)

def plot_missing_values(df: pd.DataFrame, output_dir: str) -> None:
    logging.info("Generating Missing Value Graph...")
    plt.figure(figsize=(10, 6))
    missing = df.isna().sum()
    missing = missing[missing > 0]
    
    if len(missing) == 0:
        plt.text(0.5, 0.5, 'No Missing Values Found', horizontalalignment='center', verticalalignment='center', fontsize=20)
        plt.title('Missing Value Graph')
    else:
        sns.barplot(x=missing.values, y=missing.index)
        plt.title('Missing Values per Feature')
        plt.xlabel('Count')
        
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'missing_values.png'), dpi=300)
    plt.close()

def plot_attack_distribution(df: pd.DataFrame, output_dir: str) -> None:
    logging.info("Generating Attack Distribution Graph...")
    plt.figure(figsize=(12, 8))
    
    # Assuming the target column is named 'Label'
    target_col = 'Label'
    if target_col in df.columns:
        counts = df[target_col].value_counts()
        sns.barplot(x=counts.values, y=counts.index, palette="magma")
        plt.title('Attack Distribution')
        plt.xlabel('Number of Instances')
        plt.ylabel('Attack Type')
        plt.xscale('log') # Using log scale because benign is usually huge
    else:
        logging.warning("Target column 'Label' not found for attack distribution.")
        
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'attack_distribution.png'), dpi=300)
    plt.close()

def plot_correlation_heatmap(df: pd.DataFrame, output_dir: str) -> None:
    logging.info("Generating Correlation Heatmap (Top 20 features by variance)...")
    numeric_df = df.select_dtypes(include=[np.number])
    
    # Get top 20 features with highest variance to make heatmap readable
    variances = numeric_df.var().sort_values(ascending=False)
    top_features = variances.head(20).index
    
    corr = numeric_df[top_features].corr()
    
    plt.figure(figsize=(14, 12))
    sns.heatmap(corr, cmap="coolwarm", annot=False, fmt=".2f", linewidths=0.5)
    plt.title('Correlation Heatmap (Top 20 Variable Features)')
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'correlation_heatmap.png'), dpi=300)
    plt.close()

def plot_feature_histogram(df: pd.DataFrame, output_dir: str) -> None:
    logging.info("Generating Feature Histograms...")
    numeric_df = df.select_dtypes(include=[np.number])
    
    # Select first 9 numeric features
    features_to_plot = numeric_df.columns[:9]
    
    plt.figure(figsize=(15, 12))
    for i, col in enumerate(features_to_plot, 1):
        plt.subplot(3, 3, i)
        sns.histplot(df[col], bins=50, kde=True, color='cyan')
        plt.title(f'Histogram of {col[:20]}')
        plt.yscale('log')
        
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'feature_histograms.png'), dpi=300)
    plt.close()

def plot_feature_importance(df: pd.DataFrame, output_dir: str) -> None:
    logging.info("Generating Feature Importance (Quick RF on 100k sample)...")
    target_col = 'Label'
    if target_col not in df.columns:
        logging.warning("Target column 'Label' not found. Skipping feature importance.")
        return

    # Sample data to speed up the quick Random Forest
    sample_df = df.sample(n=min(100000, len(df)), random_state=42)
    
    X = sample_df.select_dtypes(include=[np.number])
    y_raw = sample_df[target_col]
    
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    
    rf = RandomForestClassifier(n_estimators=50, max_depth=10, n_jobs=-1, random_state=42)
    rf.fit(X, y)
    
    importances = pd.Series(rf.feature_importances_, index=X.columns)
    top_importances = importances.sort_values(ascending=False).head(15)
    
    plt.figure(figsize=(12, 8))
    sns.barplot(x=top_importances.values, y=top_importances.index, palette="viridis")
    plt.title('Top 15 Feature Importances (Random Forest)')
    plt.xlabel('Importance Score')
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'feature_importance.png'), dpi=300)
    plt.close()

def plot_outlier_detection(df: pd.DataFrame, output_dir: str) -> None:
    logging.info("Generating Outlier Detection (Boxplots)...")
    numeric_df = df.select_dtypes(include=[np.number])
    
    # Use standard deviation to pick features that likely have outliers
    stds = numeric_df.std().sort_values(ascending=False)
    top_features = stds.head(9).index
    
    plt.figure(figsize=(15, 12))
    for i, col in enumerate(top_features, 1):
        plt.subplot(3, 3, i)
        sns.boxplot(x=df[col], color='red')
        plt.title(f'Boxplot of {col[:20]}')
        plt.xscale('symlog')
        
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'outlier_detection.png'), dpi=300)
    plt.close()

def main() -> None:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "dataset")
    output_dir = os.path.join(base_dir, "output", "eda")
    input_file = os.path.join(dataset_dir, "cleaned_dataset.parquet")
    
    ensure_dir(output_dir)
    
    try:
        logging.info(f"Loading {input_file} for EDA...")
        df = pd.read_parquet(input_file)
        
        plot_missing_values(df, output_dir)
        plot_attack_distribution(df, output_dir)
        plot_correlation_heatmap(df, output_dir)
        plot_feature_histogram(df, output_dir)
        plot_feature_importance(df, output_dir)
        plot_outlier_detection(df, output_dir)
        
        logging.info(f"EDA complete. Graphs saved to {output_dir}")
        
    except Exception as e:
        logging.error(f"An error occurred during EDA: {e}")

if __name__ == "__main__":
    main()
