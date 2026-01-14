import requests
import json
import os

SUPABASE_URL = "https://miwuxlsmwcsqgprtvcdm.supabase.co"
SUPABASE_KEY = "sb_publishable_Nffc0mLAzEW6PgeXQJ5JCw_NvTMiN_w"  
TABLES = ["species_en", "species_tet", "users"]  
OUTPUT_DIR = "supabase_json_exports"

os.makedirs(OUTPUT_DIR, exist_ok=True)

for table in TABLES:
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept": "application/json"
    }
    
    print(f"Fetching table: {table}")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        output_file = os.path.join(OUTPUT_DIR, f"{table}.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Saved {len(data)} records to {output_file}")
    else:
        print(f"Failed to fetch {table}: {response.status_code} - {response.text}")
