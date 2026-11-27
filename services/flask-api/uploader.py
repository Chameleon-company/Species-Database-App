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
    return str(col).strip().lower().replace(" ", "_")


# Spreadsheet headers that mean a db column. English templates have used both
# "Identification Character" and "Identification Characters" (audit.py expects the
# plural); the Tetum sheet of the translation workbook uses Tetum headers.
HEADER_ALIASES = {
    "identification_characters": "identification_character",
    "naran_sientifiku": "scientific_name",
    "naran_babain": "common_name",
    "etimolojia": "etymology",
    "fenolojia": "phenology",
    "identifikasaun_karakteristika": "identification_character",
    "tipu_ai-tahan": "leaf_type",
    "tipu_ai-fuan": "fruit_type",
    "jerminasaun_fini": "seed_germination",
    "peste": "pest",
}

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


def _read_csv(file_path):
    last_error = None
    for enc in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
        try:
            return pd.read_csv(file_path, dtype=str, encoding=enc).fillna("")
        except Exception as e:
            last_error = e
    raise Exception(f"Could not read the CSV file: {last_error}")


def _read_sheets(file_path):
    """(English rows, Tetum rows or None). A workbook's first sheet is English; a
    later sheet whose name contains "tetum" holds the reviewed translation."""
    if file_path.lower().endswith(".csv"):
        return _read_csv(file_path), None
    sheets = pd.read_excel(file_path, dtype=str, sheet_name=None)
    names = list(sheets)
    english = sheets[names[0]].fillna("")
    tetum_names = [n for n in names[1:] if "tetum" in str(n).lower()]
    tetum = sheets[tetum_names[0]].fillna("") if tetum_names else None
    return english, tetum


def _column_map(df, sheet_label):
    """db column -> spreadsheet column. Raises when a required column is missing."""
    found = {}
    for col in df.columns:
        key = normalize(col)
        key = HEADER_ALIASES.get(key, key)
        if key in db_cols and key not in found:
            found[key] = col
    missing = [c for c in db_cols if c not in found]
    if missing:
        raise Exception(
            f"Missing required columns in the {sheet_label} sheet: {missing}. "
            f"Please check the column names and try again."
        )
    return found


def _records(df, sheet_label):
    """(spreadsheet row number, {db column: stripped text}) for each non-blank row."""
    cols = _column_map(df, sheet_label)
    rows = []
    for idx in range(len(df)):
        row = {c: str(df.at[idx, cols[c]]).strip() for c in db_cols}
        if not row["scientific_name"]:
            if any(row.values()):
                raise Exception(f"Row {idx + 2} of the {sheet_label} sheet has no scientific name.")
            continue
        rows.append((idx + 2, row))
    return rows


def _key(name):
    return " ".join(str(name).split()).lower()


def _get(table, select):
    response = requests.get(
        _table_url(table), headers=_headers("count=none"),
        params={"select": select}, timeout=REQUEST_TIMEOUT,
    )
    if response.status_code >= 300:
        raise Exception(response.text)
    return response.json()


def _patch(table, species_id, row):
    response = requests.patch(
        _table_url(table), headers=_headers("return=minimal"),
        params={"species_id": f"eq.{species_id}"}, data=json.dumps(row), timeout=REQUEST_TIMEOUT,
    )
    if response.status_code >= 300:
        raise Exception(response.text)


def _post(table, row, prefer="return=minimal"):
    response = requests.post(
        _table_url(table), headers=_headers(prefer),
        data=json.dumps(row), timeout=REQUEST_TIMEOUT,
    )
    if response.status_code >= 300:
        raise Exception(response.text)
    return response


def _remove_english_row(species_id):
    """Delete one species_en row. Returns None on success, else an error text."""
    try:
        response = requests.delete(
            _table_url("species_en"), headers=_headers("return=minimal"),
            params={"species_id": f"eq.{species_id}"}, timeout=REQUEST_TIMEOUT,
        )
    except Exception as e:
        return str(e)
    return None if response.status_code < 300 else response.text


async def _machine_translation(row_en):
    row_tet = {}
    for col in db_cols:
        if col == "scientific_name":
            row_tet[col] = row_en[col]
        else:
            row_tet[col] = await translate_to_tetum(row_en[col])
        time.sleep(0.2)
    return row_tet


def _check_names(english, tetum):
    """Raise before any write on duplicate names or Tetum rows with no English row.
    Returns {name key: Tetum row}."""
    seen = {}
    for line, row in english:
        k = _key(row["scientific_name"])
        if k in seen:
            raise Exception(f"{row['scientific_name']} appears twice in the English sheet (rows {seen[k]} and {line}).")
        seen[k] = line
    tetum_by_name = {}
    for line, row in tetum:
        k = _key(row["scientific_name"])
        if k in tetum_by_name:
            raise Exception(f"{row['scientific_name']} appears twice in the Tetum sheet.")
        if k not in seen:
            raise Exception(f"The Tetum sheet has {row['scientific_name']} (row {line}), which is not in the English sheet.")
        tetum_by_name[k] = row
    return tetum_by_name


async def process_file(file_path: str):
    """
    Import a species spreadsheet into species_en and species_tet.

    The first sheet (or the CSV) holds the English text. An .xlsx may also hold a
    sheet whose name contains "Tetum" with the reviewed translation, in the same
    columns under English or Tetum headers, matched to English rows by scientific
    name.

    A species whose scientific name already exists in species_en is updated in
    place: its English row, and its Tetum row when the file has one for it. A new
    species is inserted with the file's Tetum row, or with a machine translation
    when the file has none (listed in machine_translated for review). Existing
    Tetum text is never replaced by a machine translation.

    Checks the whole file before any write: required columns, blank names,
    duplicate names, Tetum rows with no English row. Stops at the first failing
    write. When a new species' Tetum insert fails, deletes its English row, and
    lists it in english_only if that delete fails too.

    Returns {"rows_inserted", "rows_updated", "english_only", "machine_translated", "error"}.
    """
    result = {"rows_inserted": 0, "rows_updated": 0, "english_only": [], "machine_translated": [], "error": None}

    english_df, tetum_df = _read_sheets(file_path)
    english = _records(english_df, "English")
    tetum = _records(tetum_df, "Tetum") if tetum_df is not None else []
    tetum_by_name = _check_names(english, tetum)
    file_names = {_key(row["scientific_name"]) for _, row in english}

    existing_en = {}
    for r in _get("species_en", "species_id,scientific_name"):
        existing_en.setdefault(_key(r["scientific_name"]), []).append(r["species_id"])
    ambiguous = sorted(name for name, ids in existing_en.items() if len(ids) > 1 and name in file_names)
    if ambiguous:
        raise Exception(f"These species exist more than once in the database, so the import cannot tell which to update: {ambiguous}")
    existing_tet = {r["species_id"] for r in _get("species_tet", "species_id")}

    for line, row_en in english:
        k = _key(row_en["scientific_name"])
        row_tet = tetum_by_name.get(k)
        if row_tet is not None:
            row_tet = dict(row_tet, scientific_name=row_en["scientific_name"])

        if k in existing_en:
            species_id = existing_en[k][0]
            try:
                _patch("species_en", species_id, row_en)
                if row_tet is not None:
                    if species_id in existing_tet:
                        _patch("species_tet", species_id, row_tet)
                    else:
                        _post("species_tet", dict(row_tet, species_id=species_id))
            except Exception as e:
                result["error"] = f"Update error at row {line} ({row_en['scientific_name']}): {e}"
                return result
            result["rows_updated"] += 1
            continue

        try:
            response = _post("species_en", row_en, prefer="return=representation")
            species_id = response.json()[0]["species_id"]
        except Exception as e:
            result["error"] = f"Upload error at row {line} (English): {e}"
            return result

        machine = row_tet is None
        try:
            if machine:
                row_tet = await _machine_translation(row_en)
            _post("species_tet", dict(row_tet, species_id=species_id))
        except Exception as e:
            error = f"Upload error at row {line} (Tetum): {e}"
            cleanup_error = _remove_english_row(species_id)
            if cleanup_error:
                error += f". The English row {species_id} could not be removed: {cleanup_error}"
                result["english_only"] = [species_id]
            result["error"] = error
            return result

        if machine:
            result["machine_translated"].append(row_en["scientific_name"])
        result["rows_inserted"] += 1

    return result
