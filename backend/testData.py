import pandas as pd

ROWS = 500  #rows to generate

data = {
    "scientific_name": [f"testSpecies_{i}" for i in range(ROWS)],
    "common_name": [f"common name {i}" for i in range(ROWS)],
    "etymology": [f"sample etymology text for row {i}" for i in range(ROWS)],
    "habitat": [f"habitat description for row {i}" for i in range(ROWS)],
    "identification_character": [f"id notes for row {i}" for i in range(ROWS)],
    "leaf_type": [f"leaf type example {i}" for i in range(ROWS)],
    "fruit_type": [f"fruit type example {i}" for i in range(ROWS)],
    "phenology": [f"phenology info for row {i}" for i in range(ROWS)],
    "seed_germination": [f"germination details for row {i}" for i in range(ROWS)],
    "pest": [f"Pest notes for row {i}" for i in range(ROWS)],
}

df = pd.DataFrame(data)

df.to_excel("testData.xlsx", index=False)

print("created testData with 500 rows")
