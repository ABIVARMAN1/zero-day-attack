import pandas as pd
import numpy as np
import pytest
import os
import importlib.util

def get_module(script_path, module_name):
    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
preprocessing = get_module(os.path.join(base_dir, "src", "02_preprocessing.py"), "preprocessing")

def test_clean_column_names():
    df = pd.DataFrame({" col1 ": [1], "col2\t": [2]})
    df_clean = preprocessing.clean_column_names(df)
    assert list(df_clean.columns) == ["col1", "col2"]

def test_drop_useless_columns():
    df = pd.DataFrame({
        "Flow ID": [1], "Source IP": ["1.1.1.1"], "Destination IP": ["2.2.2.2"], 
        "Timestamp": ["2023-01-01"], "KeepMe": [1]
    })
    df_dropped = preprocessing.drop_useless_columns(df)
    assert list(df_dropped.columns) == ["KeepMe"]

def test_handle_infinities_and_nans():
    df = pd.DataFrame({
        "col1": [1.0, np.inf, 3.0, np.nan],
        "col2": [10.0, 20.0, 30.0, 40.0]
    })
    df_handled = preprocessing.handle_infinities_and_nans(df)
    assert not np.isinf(df_handled["col1"]).any()
    assert not df_handled["col1"].isna().any()
    assert df_handled["col1"].iloc[1] == 2.0  # Median of 1 and 3

def test_optimize_datatypes():
    df = pd.DataFrame({
        "col1": np.array([1, 2, 3], dtype=np.int64),
        "col2": np.array([1.1, 2.2, 3.3], dtype=np.float64),
        "Label": ["A", "B", "C"]
    })
    df_opt = preprocessing.optimize_datatypes(df)
    assert df_opt["col1"].dtype == np.int8
    assert df_opt["col2"].dtype == np.float32
    assert str(df_opt["Label"].dtype) in ("object", "string", "string[python]", "string[pyarrow]", "str")

def test_feature_selection():
    df = pd.DataFrame({
        "var_col": [1, 2, 3],
        "zero_var_col": [5, 5, 5]
    })
    df_sel = preprocessing.feature_selection(df)
    assert "zero_var_col" not in df_sel.columns
    assert "var_col" in df_sel.columns
