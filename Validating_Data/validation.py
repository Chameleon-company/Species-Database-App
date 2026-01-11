# validation.py
import json
from jsonschema import Draft7Validator
from pydantic import ValidationError as PydanticValidationError
from models import SpeciesRecord

def validate_json(df, schema_path):
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)

    validator = Draft7Validator(schema)
    errors = []
    valid = True

    for idx, row in df.iterrows():
        for err in sorted(validator.iter_errors(row.to_dict()), key=lambda e: e.path):
            valid = False
            field = ".".join(map(str, err.path)) or "root"
            errors.append(f"[JSON Schema] Row {idx}: {field} - {err.message}")

    return valid, errors

def validate_pydantic(df):
    errors = []
    valid = True

    for idx, row in df.iterrows():
        row_dict = row.to_dict()

        if "videos" in row_dict and not isinstance(row_dict["videos"], list):
            row_dict["videos"] = []
        if "image_urls" in row_dict and not isinstance(row_dict["image_urls"], list):
            row_dict["image_urls"] = []

        try:
            SpeciesRecord(**row_dict)
        except PydanticValidationError as e:
            valid = False
            for err in e.errors():
                field = ".".join(map(str, err.get("loc", ["unknown"])))
                msg = err.get("msg")
                errors.append(f"[Pydantic] Row {idx}: {field} - {msg}")

        except ValueError as ve:
            valid = False
            errors.append(f"[Pydantic] Row {idx}: {ve}")

    return valid, errors

def check_duplicates(df):
    if "scientific_name" not in df.columns:
        return ["[Duplicate] Column 'scientific_name' missing"]
    dup_df = df[df.duplicated(subset=["scientific_name"], keep="first")]
    if dup_df.empty:
        return []
    return [
        f"[Duplicate] Duplicate scientific_name {dup_df['scientific_name'].tolist()} "
        f"at rows {dup_df.index.tolist()}"
    ]

def validate_data(df, schema_path):
    json_valid, json_errors = validate_json(df, schema_path)
    pydantic_valid, pydantic_errors = validate_pydantic(df)
    dup_errors = check_duplicates(df)

    all_errors = json_errors + pydantic_errors + dup_errors
    validation_passed = json_valid and pydantic_valid and len(dup_errors) == 0
    return validation_passed, all_errors
