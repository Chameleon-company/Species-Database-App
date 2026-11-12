import csv
import sys
from pathlib import Path


AI_TESTING_DIR = Path(__file__).resolve().parent
TESTING_DIR = AI_TESTING_DIR.parent
BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(__file__).resolve().parents[2]

sys.path.insert(0, str(BACKEND_DIR))

from ai_service import get_species_identification_service


EVALUATION_ROOT = (
    PROJECT_ROOT
    / "TESTING"
    / "AI"
    / "evaluation"
)

OUTPUT_FILE = (
    PROJECT_ROOT
    / "TESTING"
    / "AI"
    / "evaluation_results.csv"
)

SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
}

UNRELATED_FOLDER = "unrelated"


def collect_images():
    images = []

    for expected_folder in sorted(EVALUATION_ROOT.iterdir()):
        if not expected_folder.is_dir():
            continue

        for image_path in sorted(expected_folder.iterdir()):
            if (
                image_path.is_file()
                and image_path.suffix.lower() in SUPPORTED_EXTENSIONS
            ):
                images.append((
                    expected_folder.name,
                    image_path,
                ))

    return images


def evaluate():
    service = get_species_identification_service()
    image_entries = collect_images()

    if not image_entries:
        raise RuntimeError(
            f"No evaluation images found in {EVALUATION_ROOT}"
        )

    rows = []

    for expected_label, image_path in image_entries:
        try:
            prediction = service.identify(image_path)

            predicted_label = prediction["species_label"]
            confidence = prediction["confidence"]
            uncertain = prediction["uncertain"]

            is_supported_example = (
                expected_label != UNRELATED_FOLDER
            )

            correct_label = (
                is_supported_example
                and predicted_label == expected_label
            )

            if is_supported_example:
                appropriate_outcome = (
                    correct_label and not uncertain
                )
            else:
                appropriate_outcome = uncertain

            row = {
                "file_name": image_path.name,
                "expected_label": expected_label,
                "predicted_index": prediction["class_index"],
                "predicted_label": predicted_label,
                "confidence": f"{confidence:.6f}",
                "uncertain": uncertain,
                "correct_label": correct_label,
                "appropriate_outcome": appropriate_outcome,
                "error": "",
            }

        except Exception as exc:
            row = {
                "file_name": image_path.name,
                "expected_label": expected_label,
                "predicted_index": "",
                "predicted_label": "",
                "confidence": "",
                "uncertain": "",
                "correct_label": False,
                "appropriate_outcome": False,
                "error": type(exc).__name__,
            }

        rows.append(row)

        print(
            f"{row['file_name']}: "
            f"expected={row['expected_label']}, "
            f"predicted={row['predicted_label']}, "
            f"confidence={row['confidence']}, "
            f"uncertain={row['uncertain']}, "
            f"appropriate={row['appropriate_outcome']}"
        )

    fieldnames = [
        "file_name",
        "expected_label",
        "predicted_index",
        "predicted_label",
        "confidence",
        "uncertain",
        "correct_label",
        "appropriate_outcome",
        "error",
    ]

    with OUTPUT_FILE.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as output:
        writer = csv.DictWriter(
            output,
            fieldnames=fieldnames,
        )
        writer.writeheader()
        writer.writerows(rows)

    supported_rows = [
        row
        for row in rows
        if row["expected_label"] != UNRELATED_FOLDER
    ]

    unrelated_rows = [
        row
        for row in rows
        if row["expected_label"] == UNRELATED_FOLDER
    ]

    supported_correct = sum(
        bool(row["correct_label"])
        for row in supported_rows
    )

    unrelated_uncertain = sum(
        row["uncertain"] is True
        for row in unrelated_rows
    )

    high_confidence_incorrect = sum(
        bool(row["confidence"])
        and float(row["confidence"]) >= service.confidence_threshold
        and not bool(row["correct_label"])
        for row in rows
    )

    print()
    print("EVALUATION SUMMARY")
    print("Total images:", len(rows))
    print(
        "Supported-class accuracy:",
        f"{supported_correct}/{len(supported_rows)}",
    )
    print(
        "Unrelated images marked uncertain:",
        f"{unrelated_uncertain}/{len(unrelated_rows)}",
    )
    print(
        "High-confidence incorrect/unsuitable results:",
        high_confidence_incorrect,
    )
    print("Threshold:", service.confidence_threshold)
    print("Results file:", OUTPUT_FILE)


if __name__ == "__main__":
    evaluate()