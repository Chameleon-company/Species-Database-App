# Rai Matak Species Guide (English-Tetum)

An essential, offline field guide for the Rai Matak reforestation program in Timor-Leste.

---

## Project Overview

The **Rai Matak Species Guide** is a dedicated mobile application developed to support the field staff, botanists, and community partners involved in the Rai Matak reforestation efforts.

Designed specifically for the challenging remote environments of Timor-Leste, the app's core value is its complete **offline functionality**. It ensures that critical species identification, ecological data, and learning resources are accessible exactly when and where they are needed, regardless of internet connectivity.

---

## Rai Matak

*Rai Matak* translates to **"Green Land"** or **"Lush Earth"** in Tetum, reflecting the program's vital mission to restore Timor-Leste’s natural biodiversity and forest cover.

---

## Key Features

This application is built to be robust, intuitive, and highly functional in the field:

- **Bilingual Support (English & Tetum):**  
  All content, navigation, and species descriptions are available in both English and Tetum, ensuring accessibility for all staff.

- **100% Offline Access:**  
  Once the app is downloaded, all species data, photos, and identification keys are stored locally. No internet connection is required for day-to-day operation.

- **Species Identification:**  
  Detailed profiles for native and important endemic tree species relevant to the Rai Matak program.

- **Rich Data Fields:**  
  Each species profile includes:
  - Common and scientific names  
  - Tetum names (*Naran Tetum*)  
  - Detailed photographs (leaves, bark, fruit, flowers)  
  - Ecological notes (habitat, elevation, soil type)  
  - Propagation and management advice  

- **Intuitive Search and Filtering:**  
  Quickly locate species by name, characteristic, or habitat type.

  ## Command Line Interface (CLI)

The project includes a Python CLI for exploring the species database.

### Setup

```bash
python -m venv venv
venv\Scripts\activate        # on Windows
pip install -r requirements.txt

# General help
python -m species_cli.cli --help

# List species
python -m species_cli.cli list-all --limit 20

# Search
python -m species_cli.cli search --habitat "coastal"
python -m species_cli.cli search --common-name "oak"

# Show details for one species
python -m species_cli.cli show "Acacia mangium"
