import os
import pandas as pd
import requests
import json
from googletrans import Translator
from dotenv import load_dotenv
import time

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
        result = await translator.translate(text, dest="tet")
        translated = result.text

        if translated.strip().lower() == text.strip().lower():
            retry_result = await translator.translate(text, dest="tet")
            return retry_result.text

        return translated

    except Exception as e:
        print("Translation failed:", e)
        return ""


def normalize(col):
    return col.strip().lower().replace(" ", "_")

REQUEST_TIMEOUT = 30


def _headers(prefer):
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }


def _table_url(table):
    return f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}"


def _read_rows(file_path):
    if file_path.lower().endswith(".csv"):
        for enc in ["utf-8", "latin-1", "cp1252"]:
            try:
                return pd.read_csv(file_path, dtype=str, encoding=enc).fillna("")
            except Exception:
                continue
        raise Exception("Could not read the CSV file")
    return pd.read_excel(file_path, dtype=str).fillna("")


async def process_file(file_path: str):
    """
    Insert each file row into species_en, then its Tetum translation into
    species_tet with the species_id that the species_en insert returned.

    Stops at the first failing row. When the species_tet insert fails, deletes
    the species_en row of that file row. Raises Exception before any insert
    when a required column is missing.

    Returns {"rows_inserted": int, "error": str | None}.
    """
    df = _read_rows(file_path)
    normalized_cols = {normalize(c): c for c in df.columns}

    missing_cols = [col for col in db_cols if normalize(col) not in normalized_cols]
    if missing_cols:
        raise Exception(
            f"Missing required columns in uploaded file: {missing_cols}. "
            f"Please check the column names and try again."
        )

    inserted = 0
    for idx in range(len(df)):
        row_en = {
            col: str(df.at[idx, normalized_cols[normalize(col)]])
            for col in db_cols
        }

        response = requests.post(
            _table_url("species_en"), headers=_headers("return=representation"),
            data=json.dumps(row_en), timeout=REQUEST_TIMEOUT,
        )
        if response.status_code >= 300:
            return {"rows_inserted": inserted, "error": f"Upload error at row {idx+1} (English): {response.text}"}
        species_id = response.json()[0]["species_id"]

        try:
            row_tet = {"species_id": species_id}
            for col in db_cols:
                if col == "scientific_name":
                    row_tet[col] = row_en[col]
                else:
                    row_tet[col] = await translate_to_tetum(row_en[col])
                time.sleep(0.2)
            response = requests.post(
                _table_url("species_tet"), headers=_headers("return=minimal"),
                data=json.dumps(row_tet), timeout=REQUEST_TIMEOUT,
            )
            if response.status_code >= 300:
                raise Exception(response.text)
        except Exception as e:
            requests.delete(
                _table_url("species_en"), headers=_headers("return=minimal"),
                params={"species_id": f"eq.{species_id}"}, timeout=REQUEST_TIMEOUT,
            )
            return {"rows_inserted": inserted, "error": f"Upload error at row {idx+1} (Tetum): {e}"}

        inserted += 1

    return {"rows_inserted": inserted, "error": None}
