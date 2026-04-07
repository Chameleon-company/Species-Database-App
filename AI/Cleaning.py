import os
import shutil

# Configuration
DATASET_DIR = "dataset"
MIN_IMAGES = 900

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}


def count_images(folder_path):
    count = 0
    for root, _, files in os.walk(folder_path):
        for file in files:
            if os.path.splitext(file)[1].lower() in IMAGE_EXTENSIONS:
                count += 1
    return count


def main():
    if not os.path.isdir(DATASET_DIR):
        print(f"Error: '{DATASET_DIR}' directory not found.")
        return

    print("Scanning dataset folders...\n")

    for folder_name in sorted(os.listdir(DATASET_DIR)):
        folder_path = os.path.join(DATASET_DIR, folder_name)

        if not os.path.isdir(folder_path):
            continue

        image_count = count_images(folder_path)

        if image_count < MIN_IMAGES:
            shutil.rmtree(folder_path)
            print(f"❌ Removed '{folder_name}' ({image_count} images)")
        else:
            print(f"✅ Kept '{folder_name}' ({image_count} images)")


if __name__ == "__main__":
    main()
