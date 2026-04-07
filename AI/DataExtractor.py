import os
import requests
import pandas as pd
from urllib.parse import urlparse
from pathlib import Path
import random

# ===================== CONFIG =====================
CSV_PATH = "plants.csv"
OUTPUT_DIR = "dataset"
TIMEOUT = 10

TARGET_SPECIES = {
    "Casuarina equisetifolia": 5000,
    "Swietenia Macrophylla": 5000,
    "Tectona Grandis": 5000
}
# ==================================================

os.makedirs(OUTPUT_DIR, exist_ok=True)

df = pd.read_csv(CSV_PATH)
df = df[['photo_url', 'scientific_name']].dropna()

def sanitize_folder_name(name: str) -> str:
    return (
        name.strip()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("\\", "_")
    )

def download_image(url: str, save_path: Path):
    try:
        response = requests.get(url, timeout=TIMEOUT)
        response.raise_for_status()
        with open(save_path, "wb") as f:
            f.write(response.content)
        return True
    except Exception:
        return False

# ===================== MAIN LOGIC =====================
for species, max_images in TARGET_SPECIES.items():
    print(f"\n🔍 Processing species: {species}")

    species_rows = df[df["scientific_name"] == species]

    if species_rows.empty:
        print("❌ No rows found in CSV, skipping.")
        continue

    urls = species_rows["photo_url"].tolist()
    random.shuffle(urls)  # prevent bias

    species_dir = Path(OUTPUT_DIR) / sanitize_folder_name(species)
    species_dir.mkdir(parents=True, exist_ok=True)

    downloaded = 0
    attempted = 0

    for url in urls:
        if downloaded >= max_images:
            break

        attempted += 1

        parsed_url = urlparse(url)
        ext = os.path.splitext(parsed_url.path)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            ext = ".jpg"

        image_path = species_dir / f"{downloaded}{ext}"

        if download_image(url, image_path):
            downloaded += 1

    # ===================== HARD CHECK =====================
    if downloaded < max_images:
        raise RuntimeError(
            f"\n❌ INSUFFICIENT VALID IMAGES FOR {species}\n"
            f"Requested: {max_images}\n"
            f"Downloaded: {downloaded}\n"
            f"Total URLs tried: {attempted}\n"
            f"Action required: reduce target or add more valid URLs.\n"
        )

    print(f"✅ Successfully downloaded {downloaded}/{max_images} images.")

print("\n🎉 ALL SPECIES DOWNLOADED SUCCESSFULLY.")
