import os
import json

images_dir = "Assets/Images"
output_file = "data/images.json"

images_data = {}

for species_images in os.listdir(images_dir):
    species_image_path = os.path.join(images_dir, species_images)
    if os.path.isdir(species_image_path):
        images = []
        for f in os.listdir(species_image_path):
            if f.lower().endswith((".png",".jpg")):
                images.append(f"Assets/Images/{species_images}/{f}")
        images_data[species_images] = images

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(images_data, f, indent=4)

print(f"images.json")