# Species Database App

**Product Owner:** Amy Stephenson, CEO  
**Technical Advisor:** Maniruddin Dhabak (Community Forestry)  

---

## Overview

The **Species Database App** is developed for the Rai Matak Project to support field staff working across thousands of smallholder farms in Timor-Leste. The goal is to provide an **offline-capable, bilingual mobile application** that allows users to quickly identify and learn about approved tree species used in national reforestation programs.

By consolidating scattered PDFs, photos, and guides into one accessible platform, the app enhances species identification accuracy, streamlines nursery management, and saves valuable time in the field.

---

## Purpose

Field teams often operate in remote locations with unreliable connectivity, leading to inconsistent species identification and information loss. This app provides a **simple, searchable tool**, available in **English and Tetum**, that helps users identify species by:

- Scientific name  
- Common name  
- Leaf shape/type  
- Fruit type  

Users can also access key ecological and management information **offline**.

---

## Project Scope

The app includes comprehensive species profiles with:

- Scientific/Common names and etymology  
- Identification characteristics and habitat data  
- Local uses, seed germination SOPs (with tutorial videos)  
- Pests and diseases  
- Photo galleries (leaf, flower, fruit, seedling stages)  

The system is backed by a curated **Excel-based dataset**, normalized for import into the app.

---

## Validation & Data Integrity

Data validation is performed in three layers:

1. **JSON Schema Validation**: Ensures data structure matches expected schema.  
2. **Pydantic Validation**: Validates types, required fields, and custom rules via the `SpeciesRecord` model.  
3. **Duplicate Checking**: Detects duplicate scientific names to maintain dataset integrity.  

# Setup

```bash
python -m venv venv
venv\Scripts\activate        # on Windows
# For macOS/Linux use:
# source venv/bin/activate

pip install -r requirements.txt

#Run
python cli.py new_species_data.xlsx species_schema.json --audit


