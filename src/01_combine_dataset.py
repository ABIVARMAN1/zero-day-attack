"""
Step 1: Combine Dataset

This script reads all specified parquet files from the dataset directory,
merges them into a single pandas DataFrame, and saves it as 'combined_dataset.parquet'.
It prints the number of files processed, total rows, total columns, and memory usage.
"""

import os
import glob
import logging
from typing import List
import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

def get_parquet_files(dataset_dir: str) -> List[str]:
    """
    Retrieve all parquet files in the specified directory.
    
    Args:
        dataset_dir (str): Path to the dataset directory.
        
    Returns:
        List[str]: List of file paths.
    """
    search_pattern = os.path.join(dataset_dir, "*.parquet")
    files = glob.glob(search_pattern)
    # Exclude the combined dataset if it already exists to prevent duplication
    ignore_list = [
        "combined_dataset", 
        "cleaned_dataset", 
        "processed_dataset", 
        "X_", 
        "y_"
    ]
    files = [f for f in files if not any(ignore in os.path.basename(f) for ignore in ignore_list)]
    return files

def combine_parquet_files(files: List[str]) -> pd.DataFrame:
    """
    Read and concatenate multiple parquet files into a single DataFrame.
    
    Args:
        files (List[str]): List of parquet file paths.
        
    Returns:
        pd.DataFrame: Combined DataFrame.
    """
    dataframes = []
    for file in files:
        try:
            logging.info(f"Reading file: {file}")
            df = pd.read_parquet(file)
            dataframes.append(df)
        except Exception as e:
            logging.error(f"Error reading {file}: {e}")
            raise
    
    if not dataframes:
        raise ValueError("No dataframes to combine. Check if the dataset folder contains parquet files.")
        
    logging.info("Concatenating dataframes...")
    combined_df = pd.concat(dataframes, ignore_index=True)
    return combined_df

def print_dataset_stats(df: pd.DataFrame, num_files: int) -> None:
    """
    Print statistics of the combined dataset.
    
    Args:
        df (pd.DataFrame): The combined DataFrame.
        num_files (int): Number of files combined.
    """
    rows, columns = df.shape
    # Memory usage in MB
    memory_usage = df.memory_usage(deep=True).sum() / (1024 ** 2)
    
    print("="*50)
    print("DATASET COMBINATION COMPLETE")
    print("="*50)
    print(f"Number of files processed: {num_files}")
    print(f"Total Rows: {rows:,}")
    print(f"Total Columns: {columns}")
    print(f"Memory Usage: {memory_usage:.2f} MB")
    print("="*50)

def main() -> None:
    """
    Main function to execute the dataset combination workflow.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "dataset")
    output_file = os.path.join(dataset_dir, "combined_dataset.parquet")
    
    try:
        files = get_parquet_files(dataset_dir)
        if not files:
            logging.warning(f"No parquet files found in {dataset_dir}")
            return
            
        combined_df = combine_parquet_files(files)
        print_dataset_stats(combined_df, len(files))
        
        logging.info(f"Saving combined dataset to {output_file}")
        combined_df.to_parquet(output_file, index=False)
        logging.info("Save complete.")
        
    except Exception as e:
        logging.error(f"An error occurred during dataset combination: {e}")

if __name__ == "__main__":
    main()
