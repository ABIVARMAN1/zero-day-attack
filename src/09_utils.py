"""
Step 14: Code Quality - Utils

Contains reusable logging setup and configuration loading.
"""

import json
import os
import logging
from typing import Dict, Any

def load_config(config_path: str = "config.json") -> Dict[str, Any]:
    """
    Loads project configuration from a JSON file.
    
    Args:
        config_path (str): The path to the configuration file.
        
    Returns:
        Dict[str, Any]: The configuration dictionary.
    """
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        full_path = os.path.join(base_dir, config_path)
        with open(full_path, 'r') as f:
            config = json.load(f)
        return config
    except FileNotFoundError:
        print(f"Warning: Configuration file not found at {full_path}. Using defaults.")
        return {}
    except Exception as e:
        print(f"Error loading configuration: {e}")
        return {}

def setup_logger(name: str) -> logging.Logger:
    """
    Sets up a reusable logger for the project.
    
    Args:
        name (str): The name of the logger (usually __name__).
        
    Returns:
        logging.Logger: Configured logger instance.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
        
        ch = logging.StreamHandler()
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
    return logger
