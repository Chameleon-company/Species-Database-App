# cleaning_data.py
import pandas as pd
import numpy as np
import random
from uuid import uuid4

def normalize_columns(df):
    df.columns = df.columns.str.strip().str.lower()
    return df

def generate_sr_no(df, min_val=1000, max_val=9999):
    df = df.copy()
    n = len(df)
    df["sr_no"] = random.sample(range(min_val, max_val + 1), n)
    return df

def handle_missing_data(df):
    required_fields = ["scientific_name", "common_name", "leaf_type", "fruit_type", "language"]
    for col in required_fields:
        if col in df.columns:
            df[col] = df[col].fillna("Unknown")

    optional_defaults = {
        "etymology": "",
        "habitat": "",
        "phenology": "",
        "identification_characters": "",
        "seed_germination": "",
        "pest": ""
    }

    for col, default in optional_defaults.items():
        if col in df.columns:
            df[col] = df[col].apply(lambda x: x if pd.notnull(x) else default)

    return df

def remove_duplicates(df):
    if "scientific_name" in df.columns:
        df = df.drop_duplicates(subset=["scientific_name"], keep="first")
    else:
        df = df.drop_duplicates(keep="first")
    return df
