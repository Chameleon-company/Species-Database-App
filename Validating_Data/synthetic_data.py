# synthetic_data.py
import random
import uuid
from faker import Faker

fake = Faker()

FRUIT_TYPES = ["Drupe", "Capsule", "Follicle", "Pod"]
LEAF_TYPES = [
    "Simple",
    "Pinnately compound (single)",
    "Pinnately compound (double)",
    "Pinnately compound (triple)",
    "Palmately compound"
]

def generate_synthetic_species(n=10):
    records = []
    for _ in range(n):
        fruit_type = random.choice(FRUIT_TYPES)
        leaf_type = random.choice(LEAF_TYPES)
        videos = [
            {"type": "Introduction", "url": "https://example.com/video.mp4", "language": "en"}
        ] if random.random() < 0.5 else []
        records.append({
            "id": str(uuid.uuid4()),
            "sr_no": random.randint(1000, 9999),
            "language": "en",
            "scientific_name": fake.unique.word().capitalize(),
            "common_name": fake.word().capitalize(),
            "etymology": fake.sentence(),
            "habitat": fake.word(),
            "phenology": fake.sentence(),
            "identification_characters": fake.sentence(),
            "leaf_type": leaf_type,
            "fruit_type": fruit_type,
            "seed_germination": fake.sentence() if fruit_type == "Drupe" else "",
            "pest": "",
            "image_urls": ["https://via.placeholder.com/300"],
            "videos": videos
        })
    return records
