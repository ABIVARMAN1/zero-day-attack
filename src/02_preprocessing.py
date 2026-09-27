"""
Step 2: Preprocessing

This script reads the combined dataset and performs data cleaning:
- Removes duplicate rows
- Replaces infinity values with NaN
- Handles missing values (imputation or removal)
- Removes useless columns (Flow ID, IPs, Timestamp)
- Handles datatype issues (optimizes memory)
- Converts categorical columns (if any, excluding target label which is encoded later)
- Performs basic feature selection (removes zero-variance columns)
- Saves the result to 'cleaned_dataset.parquet'
"""

import os
import logging
import numpy as np
import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

def clean_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Strip whitespace from column names to ensure consistent dropping."""
    df.columns = df.columns.str.strip()
    return df

def drop_useless_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Drop predefined columns that are not useful for machine learning."""
    cols_to_drop = ["Flow ID", "Source IP", "Destination IP", "Timestamp"]
    
    # Check if columns exist before dropping (case-insensitive or stripped)
    actual_cols_to_drop = [c for c in df.columns if c in cols_to_drop]
    if actual_cols_to_drop:
        logging.info(f"Dropping useless columns: {actual_cols_to_drop}")
        df = df.drop(columns=actual_cols_to_drop)
    else:
        logging.warning("No useless columns found to drop. Please check dataset schema.")
    return df

def handle_infinities_and_nans(df: pd.DataFrame) -> pd.DataFrame:
    """Replace infinities and handle missing values."""
    logging.info("Replacing infinity values with NaN...")
    df = df.replace([np.inf, -np.inf], np.nan)
    
    # Calculate missing values
    missing_before = df.isna().sum().sum()
    if missing_before > 0:
        logging.info(f"Found {missing_before} missing values. Filling numeric NaNs with median...")
        
        # We fill numeric columns with their median and categorical with mode
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df[col].isna().any():
                df[col] = df[col].fillna(df[col].median())
                
        # Drop any remaining rows with NaNs (e.g. in string columns)
        df = df.dropna()
        logging.info(f"Dropped remaining NaNs. New shape: {df.shape}")
    else:
        logging.info("No missing values found.")
        
    return df

def optimize_datatypes(df: pd.DataFrame) -> pd.DataFrame:
    """Downcast numerical columns to optimize memory usage."""
    logging.info("Optimizing datatypes to save memory...")
    
    for col in df.columns:
        # Skip the target label
        if col.lower() == 'label':
            continue
            
        col_type = df[col].dtype
        
        if col_type != object:
            c_min = df[col].min()
            c_max = df[col].max()
            if str(col_type)[:3] == 'int':
                if c_min > np.iinfo(np.int8).min and c_max < np.iinfo(np.int8).max:
                    df[col] = df[col].astype(np.int8)
                elif c_min > np.iinfo(np.int16).min and c_max < np.iinfo(np.int16).max:
                    df[col] = df[col].astype(np.int16)
                elif c_min > np.iinfo(np.int32).min and c_max < np.iinfo(np.int32).max:
                    df[col] = df[col].astype(np.int32)
                else:
                    df[col] = df[col].astype(np.int64)
            else:
                if c_min > np.finfo(np.float16).min and c_max < np.finfo(np.float16).max:
                    df[col] = df[col].astype(np.float32) # float16 can be problematic in some ML libs
                elif c_min > np.finfo(np.float32).min and c_max < np.finfo(np.float32).max:
                    df[col] = df[col].astype(np.float32)
                else:
                    df[col] = df[col].astype(np.float64)
    return df

def feature_selection(df: pd.DataFrame) -> pd.DataFrame:
    """Remove columns with zero variance (single unique value)."""
    logging.info("Performing basic feature selection (removing zero-variance columns)...")
    numeric_df = df.select_dtypes(include=[np.number])
    variances = numeric_df.var()
    
    zero_variance_cols = variances[variances == 0].index.tolist()
    if zero_variance_cols:
        logging.info(f"Dropping {len(zero_variance_cols)} columns with zero variance.")
        df = df.drop(columns=zero_variance_cols)
    else:
        logging.info("No zero-variance columns found.")
        
    return df

def main() -> None:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "dataset")
    input_file = os.path.join(dataset_dir, "combined_dataset.parquet")
    output_file = os.path.join(dataset_dir, "cleaned_dataset.parquet")
    
    try:
        logging.info(f"Loading {input_file}...")
        df = pd.read_parquet(input_file)
        
        initial_rows = len(df)
        logging.info(f"Initial shape: {df.shape}")
        
        # 1. Strip column names
        df = clean_column_names(df)
        
        # 2. Remove duplicates
        logging.info("Removing duplicate rows...")
        df = df.drop_duplicates()
        logging.info(f"Removed {initial_rows - len(df)} duplicate rows. New shape: {df.shape}")
        
        # 3. Drop useless columns
        df = drop_useless_columns(df)
        
        # 4. Handle infinities and missing values
        df = handle_infinities_and_nans(df)
        
        # 5. Optimize datatypes
        df = optimize_datatypes(df)
        
        # 6. Feature selection
        df = feature_selection(df)
        
        logging.info(f"Final cleaned dataset shape: {df.shape}")
        
        # Save output
        logging.info(f"Saving cleaned dataset to {output_file}...")
        df.to_parquet(output_file, index=False)
        logging.info("Preprocessing complete.")
        
    except Exception as e:
        logging.error(f"An error occurred during preprocessing: {e}")

if __name__ == "__main__":
    main()
