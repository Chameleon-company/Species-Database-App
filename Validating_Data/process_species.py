# process_species.py
from pathlib import Path
import pandas as pd
import json
from datetime import datetime
from uuid import uuid4

from cleaning_data import normalize_columns, generate_sr_no, handle_missing_data, remove_duplicates
from validation import validate_data
from audit_report import generate_txt_report

# Folders
INPUT_FOLDER = Path("input")
INPUT_SCHEMA_FOLDER = Path("schema")
OUT_FOLDER = Path("out")
OUT_FOLDER.mkdir(exist_ok=True)

def parse_json_list(cell):
    import json
    import pandas as pd
    if cell is None or (isinstance(cell, float) and pd.isna(cell)):
        return []
    if isinstance(cell, list):
        return cell
    if isinstance(cell, dict):
        return [cell]
    if isinstance(cell, str):
        try:
            parsed = json.loads(cell)
            if isinstance(parsed, list):
                return parsed
            elif isinstance(parsed, dict):
                return [parsed]
            else:
                return [parsed]
        except (json.JSONDecodeError, TypeError):
            return [cell]
    return [cell]

def main():
    import argparse

    parser = argparse.ArgumentParser(description="Species Dataset Processor")
    parser.add_argument("input_file", type=str, help="CSV or Excel filename inside input/")
    parser.add_argument("schema_file", type=str, help="JSON schema file inside input/")
    parser.add_argument("--output", type=str, default="cleaned_species.json", help="Output JSON filename in out/")
    args = parser.parse_args()

    input_path = INPUT_FOLDER / args.input_file
    schema_path = INPUT_SCHEMA_FOLDER / args.schema_file
    output_json = OUT_FOLDER / args.output
    output_audit = OUT_FOLDER / "audit_report.txt"

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")

    # Read CSV or Excel
    if input_path.suffix.lower() == ".csv":
        df = pd.read_csv(input_path)
    elif input_path.suffix.lower() in [".xlsx", ".xls"]:
        df = pd.read_excel(input_path)
    else:
        raise ValueError("Unsupported file type. Use CSV or Excel.")

    # REMOVE EMPTY ROWS
    # Drop rows where all cells are NA
    df = df.dropna(how='all')

    # Also drop rows where all columns are empty strings or whitespace
    df = df[~df.apply(lambda row: row.astype(str).str.strip().eq('').all(), axis=1)]

    # Map original columns to normalized snake_case columns expected by your pipeline
    column_mapping = {
        "Sr No": "sr_no",
        "Scientific name": "scientific_name",
        "Etymology": "etymology",
        "Common name": "common_name",
        "Habitat": "habitat",
        "Phenology": "phenology",
        "Identification Characters": "identification_characters",
        "Leaf type": "leaf_type",
        "Fruit Type": "fruit_type",
        "Seed Germination": "seed_germination",
        "Pest": "pest",
        "image_urls": "image_urls",
        "videos": "videos"
    }

    # Rename columns according to mapping
    df = df.rename(columns=column_mapping)

    # Normalize columns (to lowercase snake_case)
    df = normalize_columns(df)

    # Parse media columns
    df["image_urls"] = df.get("image_urls", pd.Series([[]]*len(df))).apply(parse_json_list)
    df["videos"] = df.get("videos", pd.Series([[]]*len(df))).apply(parse_json_list)

    # Generate sr_no if missing or empty
    if "sr_no" not in df.columns or df["sr_no"].isnull().all():
        df = generate_sr_no(df)

    # Cleaning
    df = handle_missing_data(df)
    df = remove_duplicates(df)

    # Ensure 'id' column
    if "id" not in df.columns:
        df["id"] = [str(uuid4()) for _ in range(len(df))]

    # Validation
    validation_passed, errors = validate_data(df, schema_path)

    # Final output JSON
    final_output = {
        "status": "pass" if validation_passed else "fail",
        "errors": errors,
        "cleaned_data": df.to_dict(orient="records") if validation_passed else []
    }

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(final_output, f, indent=2, ensure_ascii=False)

    print(f"Cleaned & validated data saved to {output_json}")

    # Generate audit report ALWAYS
    timestamp = datetime.now().isoformat()
    generate_txt_report(
        errors,
        cleaned_data=final_output["cleaned_data"],
        input_file=input_path.name,
        timestamp=timestamp,
        error_rows=len(errors),
        output_file=output_audit
    )
    print(f"Audit report generated: {output_audit}")


if __name__ == "__main__":
    main()
