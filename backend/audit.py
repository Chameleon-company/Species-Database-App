# audit.py
import pandas as pd

DB_COLS = [
    "scientific_name",
    "common_name",
    "etymology",
    "habitat",
    "identification_characters",
    "leaf_type",
    "fruit_type",
    "phenology",
    "seed_germination",
    "pest",
]

# control values
LEAF_TYPES_ALLOWED = {
    "Simple",
    "Pinnately compound (single)",
    "Pinnately compound (double)",
    "Pinnately compound (triple)",
    "Palmately compound",
}

FRUIT_TYPES_ALLOWED = {
    "Drupe",
    "Capsule",
    "Follicle",
    "Pod",
}


def normalize(col: str) -> str:
    return str(col).strip().lower().replace(" ", "_")


def read_file_to_df(file_path: str) -> pd.DataFrame:
    """Reads CSV or XLSX"""
    if file_path.lower().endswith(".csv"):
        encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]
        last_err = None
        for enc in encodings:
            try:
                return pd.read_csv(file_path, dtype=str, encoding=enc).fillna("")
            except Exception as e:
                last_err = e
        raise Exception(f"CSV file couldn't be read. Last error: {last_err}")
    else:
        return pd.read_excel(file_path, dtype=str).fillna("")


def audit_dataframe(df: pd.DataFrame) -> dict:
    # normalized column name mapping
    normalized_cols = {normalize(c): c for c in df.columns}

    missing_required_cols = [c for c in DB_COLS if normalize(c) not in normalized_cols]

    # DF with DB_COLS
    data = {}
    for c in DB_COLS:
        key = normalize(c)
        if key in normalized_cols:
            data[c] = df[normalized_cols[key]].astype(str).fillna("").map(lambda x: x.strip())
        else:
            data[c] = [""] * len(df)

    clean = pd.DataFrame(data)

    # counts of missing/empty
    missing_by_col = {}
    for c in DB_COLS:
        missing_by_col[c] = int((clean[c].astype(str).str.strip() == "").sum())

    # duplicates: scientific_name
    sci = clean["scientific_name"].astype(str).str.strip()
    dup_mask = sci.duplicated(keep=False) & (sci != "")
    duplicate_scientific_names = sorted(set(sci[dup_mask].tolist()))

    # Controlled vocab checks
    leaf_vals = set(clean["leaf_type"].astype(str).str.strip())
    fruit_vals = set(clean["fruit_type"].astype(str).str.strip())

    leaf_invalid = sorted([v for v in leaf_vals if v and v not in LEAF_TYPES_ALLOWED])
    fruit_invalid = sorted([v for v in fruit_vals if v and v not in FRUIT_TYPES_ALLOWED])


    row_count = int(len(clean))
    empty_rows = int((clean.astype(str).apply(lambda r: all(x.strip() == "" for x in r), axis=1)).sum())

    # summary report
    total_missing = int(sum(missing_by_col.values()))
    has_blockers = (len(missing_required_cols) > 0)

    return {
        "rows": row_count,
        "empty_rows": empty_rows,
        "required_columns": DB_COLS,
        "missing_required_columns": missing_required_cols,
        "missing_values_by_column": missing_by_col,
        "total_missing_values": total_missing,
        "duplicate_scientific_names": duplicate_scientific_names,
        "duplicates_count": len(duplicate_scientific_names),
        "leaf_type_invalid_values": leaf_invalid,
        "fruit_type_invalid_values": fruit_invalid,
        "has_blockers": has_blockers,
        "notes": [
            "Fix the excel if missing_required_columns is not empty.",
            "If leaf type or fruit type vocbulary error check",
            " checking for scientific_name duplicates",
        ],
    }
