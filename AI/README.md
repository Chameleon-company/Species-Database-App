# Plant Species Image Classifier

A complete, end‑to‑end pipeline for building a plant species image classifier. This project covers **data extraction** , **dataset cleaning** , and **deep learning model training** using **MobileNetV2** for efficient and scalable species identification.

The workflow is designed to be repeatable and extensible: by updating a single CSV file and a few configuration variables, the model can be retrained to recognize new plant species at scale.

The model shared in this repository is trained on the following species, with a decent performance [results shared as JPG file]:

- Casuarina equisetifolia
- Swietenia Macrophylla

- Tectona Grandis

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Dataset Description](#dataset-description)
4. [Data Acquisition](#1-data-acquisition)
5. [Data Cleaning](#2-data-cleaning)
6. [Model Training](#3-model-training)
7. [Outputs](#outputs)
8. [Scaling the Project](#scaling-the-project)

---

## Overview

This repository implements a structured pipeline to:

- Extract plant species image URLs from a CSV registry
- Download and organize high‑quality image datasets
- Enforce minimum dataset size requirements per class
- Train and fine‑tune a **MobileNetV2** convolutional neural network
- Produce a lightweight, deployable model suitable for mobile and edge devices

---

## Prerequisites

- Python **3.8+**
- pip package manager

Install the required Python dependencies:

```bash
pip install pandas requests tensorflow scikit-learn numpy
```

---

## Dataset Description

### `plants.csv`

Before running the pipeline, you must obtain the file **`plants.csv`** .

> **Important:** This file contains proprietary metadata and source URLs and **must be requested directly from the Project Owner (PO)** .

Expected CSV structure:

| Column Name       | Description                             |
| ----------------- | --------------------------------------- |
| `photo_url`       | Direct URL to the plant image           |
| `scientific_name` | Scientific name used as the class label |

---

## 1. Data Acquisition

**Script:** `DataExtractor.py`

This step downloads images from the URLs provided in `plants.csv` and organizes them by species.

### Functionality

- Filters the CSV by a predefined `TARGET_SPECIES` dictionary
- Randomly shuffles URLs to reduce sampling bias
- Downloads up to a specified number of images per species
- Organizes images into species‑specific folders under `dataset/`

### Safety Check

If the requested number of valid images cannot be found for any species, the script raises a `RuntimeError`. This prevents training on underpowered datasets.

### Run the script

```bash
python DataExtractor.py
```

---

## 2. Data Cleaning

**Script:** `Cleaning.py`

After image collection, the dataset is validated to ensure statistical robustness.

### Functionality

- Scans all class folders inside `dataset/`
- Counts the number of images per species
- Deletes any species folder with fewer than the minimum threshold

### Default Threshold

- **900 images per species**

This ensures that only data‑rich classes are used during training, reducing class imbalance and model bias.

### Run the script

```bash
python Cleaning.py
```

---

## 3. Model Training

**Script:** `train.py`

The training phase uses transfer learning with **MobileNetV2** , pre‑trained on ImageNet.

### Training Workflow

1. **Dataset Split**
   - Training: 70%
   - Validation: 20%
   - Test: 10%
2. **Phase 1 – Transfer Learning**
   - Freeze the MobileNetV2 base
   - Train only the custom classification head
   - 15 epochs
3. **Phase 2 – Fine‑Tuning**
   - Unfreeze the last 30 layers of MobileNetV2
   - Continue training for domain‑specific feature learning
   - 10 epochs

### Auditing & Reproducibility

The script automatically generates:

- `train_files.txt`
- `val_files.txt`
- `test_files.txt`

These files provide a transparent record of exactly which images were used in each split.

### Run the script

```bash
python train.py
```

---

## Outputs

After successful training, the following artifacts are produced:

### Model & Metadata

- **`species_detector_mobilenetv2.h5`** – Trained classification model
- **`class_labels.txt`** – Mapping of numeric class indices to scientific names

### Evaluation Metrics

- Confusion Matrix
- Classification Report (Precision, Recall, F1‑Score)

These metrics are printed directly to the console after training completes.

---

## Recommended Training & Knowledge Expansion Flow

This project is designed around **transfer learning** , which enables a collaborative and iterative training strategy across teams or organizations.

### Conceptual Workflow

1. **Foundation Training (Core Model Creation)**
   A primary contributor trains the model on a **large number of images for a limited set of species** . This results in a strong foundational model that has already learned:
   - General plant textures, shapes, and visual patterns
   - Robust low- and mid-level botanical features

   Because MobileNetV2 is pre-trained on ImageNet and further refined on plant imagery, this foundational model captures rich domain-specific knowledge.

2. **Model Sharing**
   The trained model (`species_detector_mobilenetv2.h5`) can then be shared with other researchers, teams, or institutions.
3. **Species Expansion by New Contributors**
   A recipient of the shared model can:
   - Extract an **entirely different set of plant species** using their own `plants.csv`
   - Reuse the existing trained weights as a starting point
   - Replace or extend the final classification layer to match their new species list

   This allows the new contributor to train effectively **with fewer images and fewer epochs** , since the model already understands botanical visual features.

4. **Incremental Knowledge Growth**
   Over time, this process enables:
   - Faster convergence on new species
   - Reduced computational cost
   - Progressive expansion of the model’s botanical knowledge

This workflow creates a practical path for **distributed learning and model evolution** , where each training cycle builds upon previous expertise rather than starting from scratch.

---

## Scaling the Project

This pipeline is designed to grow with your dataset.

### Step‑by‑Step Scaling Guide

1. **Add New Species**
   Edit the `TARGET_SPECIES` dictionary in `DataExtractor.py`:
   ```python
   TARGET_SPECIES = {
       "Tectona grandis": 5000,
       "New species name": 7000
   }
   ```
2. **Increase Image Volume**
   Adjust the numeric value to request more images per species.
3. **Verify Source Data**
   Ensure `plants.csv` contains enough unique URLs for each species. If not, the extractor will fail fast with a runtime error.
4. **Adjust Cleaning Thresholds**
   If image counts increase significantly, update `MIN_IMAGES` in `Cleaning.py` (e.g., from `900` to `1500`).
5. **Re‑run the Pipeline**
   Execute scripts in order:
   ```bash
   python DataExtractor.py
   python Cleaning.py
   python train.py
   ```

### Adaptive Training

The `train.py` script automatically:

- Detects the number of species folders in `dataset/`
- Adjusts the final classification layer accordingly

No manual reconfiguration is required when adding or removing species.

---

## Why This Matters

This project provides a scalable foundation for building botanical image recognition systems. By combining automated data validation with a lightweight CNN architecture, the resulting model is suitable for:

- Mobile applications
- Edge devices
- Field‑based species identification

With minimal configuration changes, the same pipeline can be reused to classify entirely different plant datasets.
