from __future__ import annotations

import argparse
import csv
import json
from enum import Enum
from pathlib import Path
from typing import List, Optional, Any, Dict

from pydantic import BaseModel, Field, ValidationError, model_validator


# 1) Strict enums (Requested)
class ImageType(str, Enum):
    LEAF = "Leaf"
    FLOWER = "Flower"
    SEED = "Seed"
    HABITAT = "Habitat"
    BARK = "Bark"
    # If later you add video, you can extend enum safely (no need now)
    # VIDEO = "Video"


class ImageStatus(str, Enum):
    AVAILABLE = "Available"
    MISSING = "Missing"


# 2) Expected media object format (Skeleton)

class ImageItem(BaseModel):
    type: ImageType = Field(..., description="Image type: Leaf/Flower/Seed/Habitat/Bark")
    file: str = Field(..., description="Filename or '-' if missing")
    status: ImageStatus = Field(..., description="Available/Missing")

    @model_validator(mode="after")
    def check_cross_field_consistency(self):
        file_clean = (self.file or "").strip()

        # Rule 1: Available must have a real filename (not '-', not empty)
        if self.status == ImageStatus.AVAILABLE and file_clean in ["", "-", "None"]:
            raise ValueError(f"{self.type}: status is 'Available' but file is missing")

        # Rule 2: Missing must NOT have a real filename (should be '-' or empty)
        if self.status == ImageStatus.MISSING and file_clean not in ["", "-", "None"]:
            raise ValueError(f"{self.type}: status is 'Missing' but file is provided")

        # Optional rule (recommended): enforce allowed image extensions when Available
        if self.status == ImageStatus.AVAILABLE:
            allowed_ext = (".jpg", ".jpeg", ".png", ".webp")
            if not file_clean.lower().endswith(allowed_ext):
                raise ValueError(f"{self.type}: unsupported file extension (allowed: {allowed_ext})")

        return self


class SpeciesEntry(BaseModel):
    species: str = Field(..., description="Species identifier (slug)")
    images: List[ImageItem] = Field(default_factory=list, description="List of image items")



# 3) Table-style report generation 

def validate_manifest(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    rows: List[Dict[str, Any]] = []
    species_with_errors = set()

    for idx, entry in enumerate(data):
        species_name = entry.get("species", f"(unknown_species_{idx})")

        # If entry loads fine, we add PASS rows per image item
        try:
            validated = SpeciesEntry(**entry)

            for img in validated.images:
                rows.append({
                    "species": species_name,
                    "type": img.type.value,
                    "status": img.status.value,
                    "file": img.file,
                    "result": "PASS",
                    "notes": ""
                })

        except ValidationError as ve:
            species_with_errors.add(species_name)

            # Try to still show raw image rows if present 
            raw_images = entry.get("images", [])
            if isinstance(raw_images, list) and raw_images:
                for raw in raw_images:
                    rows.append({
                        "species": species_name,
                        "type": str(raw.get("type", "")),
                        "status": str(raw.get("status", "")),
                        "file": str(raw.get("file", "")),
                        "result": "FAIL",
                        "notes": "ValidationError (see details below)"
                    })
            else:
                rows.append({
                    "species": species_name,
                    "type": "",
                    "status": "",
                    "file": "",
                    "result": "FAIL",
                    "notes": "ValidationError: invalid species entry structure"
                })

            # Add error detail rows
            for err in ve.errors():
                loc = " -> ".join(str(x) for x in err.get("loc", []))
                msg = err.get("msg", "validation error")
                rows.append({
                    "species": species_name,
                    "type": "",
                    "status": "",
                    "file": "",
                    "result": "FAIL",
                    "notes": f"{loc}: {msg}"
                })

        except Exception as e:
            species_with_errors.add(species_name)
            rows.append({
                "species": species_name,
                "type": "",
                "status": "",
                "file": "",
                "result": "FAIL",
                "notes": str(e)
            })

    return {
        "ok": len(species_with_errors) == 0,
        "species_error_count": len(species_with_errors),
        "rows": rows
    }


def print_markdown_table(rows: List[Dict[str, Any]], max_rows: int = 200) -> None:
    headers = ["species", "type", "status", "file", "result", "notes"]

    def esc(v: Any) -> str:
        s = "" if v is None else str(v)
        return s.replace("\n", " ").replace("|", "\\|")

    shown = rows[:max_rows]

    print("| " + " | ".join(headers) + " |")
    print("| " + " | ".join(["---"] * len(headers)) + " |")
    for r in shown:
        print("| " + " | ".join(esc(r.get(h, "")) for h in headers) + " |")

    if len(rows) > max_rows:
        print(f"\n... ({len(rows) - max_rows} more rows not shown)")


def save_csv(rows: List[Dict[str, Any]], csv_path: Path) -> None:
    headers = ["species", "type", "status", "file", "result", "notes"]
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        for r in rows:
            w.writerow({h: r.get(h, "") for h in headers})



# 4) Run sample manifest through validator

def main():
    parser = argparse.ArgumentParser(description="Media Manifest Validator Skeleton (image_mapping.json)")
    parser.add_argument("--input", required=True, help="Path to image_mapping.json")
    parser.add_argument("--csv", default="", help="Optional output CSV path")
    parser.add_argument("--show", type=int, default=200, help="Max rows to show in console table")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    with input_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("Manifest root must be a LIST (starts with '[')")

    result = validate_manifest(data)

    print("\n# Media Manifest Validation Report\n")
    print_markdown_table(result["rows"], max_rows=args.show)

    if args.csv:
        save_csv(result["rows"], Path(args.csv))
        print(f"\nSaved CSV report to: {args.csv}")

    if result["ok"]:
        print("\nNo cross-field consistency errors found.")
    else:
        print(f"\nValidation finished with errors. Species entries with issues: {result['species_error_count']}")


if __name__ == "__main__":
    main()
