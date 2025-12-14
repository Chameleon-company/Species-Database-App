import os
import pandas as pd
import requests
import json
from googletrans import Translator
from dotenv import load_dotenv

load_dotenv()

db_cols = [
        "scientific_name",
        "common_name",
        "etymology",
        "habitat",
        "identification_character",
        "leaf_type",
        "fruit_type",
        "phenology",
        "seed_germination",
        "pest"
    ]

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

translator = Translator()

async def translate_to_tetum(text):
    if not text or text.strip() == "":
        return ""
    try:
        result = await translator.translate(text, dest='tet')
        return result.text
    except Exception:
        return text

def normalize(col):
    return col.strip().lower().replace(" ", "_")

async def process_file(file_path: str, translate: bool = True):
    """
    Process Excel/CSV file and upload translated or raw values.
    translate=True -> Tetum table
    translate=False -> English table
    """
    if file_path.lower().endswith(".csv"):
        encodings = ["utf-8", "latin-1", "cp1252"]
        for enc in encodings:
            try:
                df = pd.read_csv(file_path, dtype=str, encoding=enc).fillna("")
                break
            except:
                continue
    else:
        df = pd.read_excel(file_path, dtype=str).fillna("")
    
    if (translate):
        endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/species_tet"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
    else:
        endpoint = f"{SUPABASE_URL.rstrip('/')}/rest/v1/species_en"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }

    normalized_cols = {normalize(c): c for c in df.columns}

    missing_cols = [col for col in db_cols if normalize(col) not in normalized_cols]
    if missing_cols:
        raise Exception(
            f"❌ Missing required columns in uploaded file: {missing_cols}. "
            f"Please check the column names and try again."
        )

    for idx in range(len(df)):
        row_raw = {}

        for col in db_cols:
            key = normalize(col)
            src_col = normalized_cols.get(key)
            row_raw[col] = "" if not src_col else str(df.at[idx, src_col])

        if translate:
            row_data = {}
            for col in db_cols:
                if col == "scientific_name":
                    row_data[col] = row_raw[col]  
                else:
                    row_data[col] = await translate_to_tetum(row_raw[col])
        else:
            row_data = row_raw
        
        response = requests.post(endpoint, headers=headers, data=json.dumps(row_data))
        if response.status_code >= 300:
            raise Exception(f"Upload error at row {idx+1}: {response.text}")

    return "Upload complete"
