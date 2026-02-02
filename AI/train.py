import os
import tensorflow as tf
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam

# -----------------------------
# Configuration
# -----------------------------
DATASET_DIR = "dataset"
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 15
FINE_TUNE_EPOCHS = 10
LEARNING_RATE = 1e-4

TRAIN_RATIO = 0.7
VAL_RATIO = 0.2
TEST_RATIO = 0.1
SEED = 42

VALID_EXTENSIONS = (".jpg", ".jpeg", ".png")

# -----------------------------
# Load Image Paths & Labels
# -----------------------------
class_names = sorted([
    d for d in os.listdir(DATASET_DIR)
    if os.path.isdir(os.path.join(DATASET_DIR, d))
])

class_to_index = {name: idx for idx, name in enumerate(class_names)}

image_paths = []
labels = []

for class_name in class_names:
    class_dir = os.path.join(DATASET_DIR, class_name)
    for file in os.listdir(class_dir):
        if file.lower().endswith(VALID_EXTENSIONS):
            image_paths.append(os.path.join(class_dir, file))
            labels.append(class_to_index[class_name])

image_paths = np.array(image_paths)
labels = np.array(labels)

# -----------------------------
# Stratified Split
# -----------------------------
X_train, X_temp, y_train, y_temp = train_test_split(
    image_paths,
    labels,
    test_size=(1.0 - TRAIN_RATIO),
    stratify=labels,
    random_state=SEED
)

val_size = VAL_RATIO / (VAL_RATIO + TEST_RATIO)

X_val, X_test, y_val, y_test = train_test_split(
    X_temp,
    y_temp,
    test_size=(1.0 - val_size),
    stratify=y_temp,
    random_state=SEED
)

# -----------------------------
# Save Split Files (AUDITABLE)
# -----------------------------
def save_split(name, paths, labels):
    with open(f"{name}_files.txt", "w") as f:
        for p, l in zip(paths, labels):
            f.write(f"{p}\t{class_names[l]}\n")

save_split("train", X_train, y_train)
save_split("val", X_val, y_val)
save_split("test", X_test, y_test)

print("Saved train_files.txt, val_files.txt, test_files.txt")

# -----------------------------
# TF Dataset Builder
# -----------------------------
def parse_image(path, label):
    image = tf.io.read_file(path)
    image = tf.image.decode_jpeg(image, channels=3)
    image = tf.image.resize(image, IMAGE_SIZE)
    image = image / 255.0
    return image, tf.one_hot(label, len(class_names))

def build_dataset(paths, labels, training=False):
    ds = tf.data.Dataset.from_tensor_slices((paths, labels))
    ds = ds.map(parse_image, num_parallel_calls=tf.data.AUTOTUNE)
    if training:
        ds = ds.shuffle(1000)
    ds = ds.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)
    return ds

train_ds = build_dataset(X_train, y_train, training=True)
val_ds = build_dataset(X_val, y_val)
test_ds = build_dataset(X_test, y_test)

# -----------------------------
# Model
# -----------------------------
base_model = MobileNetV2(
    weights="imagenet",
    include_top=False,
    input_shape=(224, 224, 3)
)

base_model.trainable = False

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation="relu")(x)
x = Dropout(0.5)(x)
outputs = Dense(len(class_names), activation="softmax")(x)

model = Model(inputs=base_model.input, outputs=outputs)

model.compile(
    optimizer=Adam(learning_rate=LEARNING_RATE),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()

# -----------------------------
# Training
# -----------------------------
model.fit(
    train_ds,
    epochs=EPOCHS,
    validation_data=val_ds
)

# -----------------------------
# Fine-Tuning
# -----------------------------
base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=Adam(learning_rate=LEARNING_RATE / 10),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

model.fit(
    train_ds,
    epochs=FINE_TUNE_EPOCHS,
    validation_data=val_ds
)

# -----------------------------
# Test Evaluation (Per-Class)
# -----------------------------
test_loss, test_accuracy = model.evaluate(test_ds)
print(f"\nTest Accuracy: {test_accuracy:.4f}")
print(f"Test Loss: {test_loss:.4f}")

# Collect predictions
y_pred_probs = model.predict(test_ds)
y_pred = np.argmax(y_pred_probs, axis=1)

y_true = np.concatenate([y for _, y in test_ds], axis=0)
y_true = np.argmax(y_true, axis=1)

print("\nClassification Report:")
print(classification_report(y_true, y_pred, target_names=class_names))

print("\nConfusion Matrix:")
print(confusion_matrix(y_true, y_pred))

# -----------------------------
# Save Model & Labels
# -----------------------------
model.save("species_detector_mobilenetv2.h5")

with open("class_labels.txt", "w") as f:
    for idx, label in enumerate(class_names):
        f.write(f"{idx}:{label}\n")
