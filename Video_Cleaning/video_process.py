import os
import cv2
import json
import numpy as np
from moviepy import VideoFileClip

# ----------------------------------------------------
# CONFIG
# ----------------------------------------------------
input_folder = "raw_videos"
output_folder = "cleaned_videos"
json_path = "../Validating_Data/out/cleaned_species.json"

target_height = 1080
trim_start = 0
trim_end = None

enable_blur_detection = True
blur_threshold = 100.0

os.makedirs(output_folder, exist_ok=True)

# ----------------------------------------------------
# NORMALIZE FUNCTION
# ----------------------------------------------------
def normalize(text):
    return (
        text.lower()
        .replace("_", " ")
        .replace("-", " ")
        .replace(".", " ")
    )

# ----------------------------------------------------
# LOAD JSON DATA
# ----------------------------------------------------
with open(json_path, "r", encoding="utf-8") as f:
    json_data = json.load(f)

entries = json_data.get("cleaned_data", [])

# ----------------------------------------------------
# BUILD SPECIES MAP
# scientific_name → (sr_no, scientific_name)
# ----------------------------------------------------
species_map = {}

for item in entries:
    sr_no = item.get("sr_no")
    scientific_name = item.get("scientific_name")

    if not scientific_name:
        continue

    key = normalize(scientific_name)
    species_map[key] = (sr_no, scientific_name)

# ----------------------------------------------------
# BLUR DETECTION FUNCTION
# ----------------------------------------------------
def calculate_blur_score(video_path, sample_frames=20):
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if total_frames == 0:
        return 0

    frame_ids = np.linspace(0, total_frames - 1, sample_frames).astype(int)
    scores = []

    for fid in frame_ids:
        cap.set(cv2.CAP_PROP_POS_FRAMES, fid)
        ret, frame = cap.read()
        if not ret:
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        score = cv2.Laplacian(gray, cv2.CV_64F).var()
        scores.append(score)

    cap.release()
    return np.mean(scores) if scores else 0

# ----------------------------------------------------
# PROCESS VIDEOS
# ----------------------------------------------------
blur_results = []

print("\n================= PROCESSING VIDEOS =================\n")

for filename in os.listdir(input_folder):
    if not filename.lower().endswith((".mp4", ".mov", ".avi", ".mkv")):
        continue

    normalized_filename = normalize(filename)

    # ---- MATCH SCIENTIFIC NAME FROM FILENAME ----
    matched = None
    for sci_key, data in species_map.items():
        if sci_key in normalized_filename:
            matched = data
            break

    if not matched:
        print(f" ⚠️  No scientific name found in filename — skipping {filename}.")
        continue

    sr_no, scientific_name = matched

    # ---- CHECK IF ALREADY CLEANED ----
    cleaned_name = f"{sr_no}_{scientific_name.replace(' ', '_')}_cleaned.mp4"
    output_path = os.path.join(output_folder, cleaned_name)

    if os.path.exists(output_path):
        print(f"✔ Already cleaned: {cleaned_name} — skipping.")
        continue

    print(f"\nProcessing: {filename}..")
    input_path = os.path.join(input_folder, filename)

    # ---- BLUR DETECTION ----
    blur_score = 0
    is_blurry = False

    if enable_blur_detection:
        blur_score = calculate_blur_score(input_path)
        is_blurry = blur_score < blur_threshold

        print(f" Blur Score = {blur_score:.2f}   (Threshold = {blur_threshold})")
        print(" Status:", "BLURRY ❌" if is_blurry else "CLEAR ✔")

    blur_results.append((filename, sr_no, scientific_name, blur_score, is_blurry))

    # ---- LOAD VIDEO ----
    clip = VideoFileClip(input_path)

    # Trim
    end_time = trim_end if trim_end is not None else clip.duration
    clip = clip.subclipped(trim_start, end_time)

    # Resize
    clip = clip.resized(height=target_height)

    # ---- SAVE VIDEO ----
    clip.write_videofile(
        output_path,
        codec="libx264",
        audio_codec="aac",
        fps=24,
        preset="medium",
        threads=4
    )

    clip.close()

print("\n✔ All videos processed.")

# ----------------------------------------------------
# PRINT BLUR REPORT
# ----------------------------------------------------
print("\n==================== BLUR REPORT ====================")
print(f"{'Filename':35} {'Sr_No':6} {'Scientific Name':22} {'Blur Score':12} {'Blurry'}")
print("------------------------------------------------------")

for row in blur_results:
    print(f"{row[0]:35} {row[1]:6} {row[2]:22} {row[3]:12.2f} {row[4]}")

print("======================================================")
