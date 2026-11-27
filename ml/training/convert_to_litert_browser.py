
"""Create a fixed-batch LiteRT model for browser inference.

The original server model remains unchanged.
The browser model uses a fixed batch size of 1.
"""

from pathlib import Path

import tensorflow as tf


REPO_ROOT = Path(__file__).resolve().parents[2]
TRAINING_DIR = Path(__file__).resolve().parent

KERAS_MODEL_PATH = (
    TRAINING_DIR / "species_detector_mobilenetv2.h5"
)

OUTPUT_PATH = (
    REPO_ROOT
    / "apps"
    / "field"
    / "public"
    / "litert"
    / "species_detector_mobilenetv2_batch1.tflite"
)

IMAGE_SIZE = 224


def main() -> None:
    print("Loading original Keras model...")

    model = tf.keras.models.load_model(
        KERAS_MODEL_PATH,
        compile=False,
    )

    print("Original parameter count:", model.count_params())

    # Create a fixed-batch input and reuse the original trained model.
    fixed_input = tf.keras.Input(
        batch_shape=(1, IMAGE_SIZE, IMAGE_SIZE, 3),
        dtype=tf.float32,
        name="images",
    )

    fixed_output = model(fixed_input, training=False)

    fixed_model = tf.keras.Model(
        inputs=fixed_input,
        outputs=fixed_output,
    )

    print("Converting fixed-batch model...")

    converter = tf.lite.TFLiteConverter.from_keras_model(
        fixed_model
    )

    browser_model = converter.convert()

    # Verify the converted model.
    interpreter = tf.lite.Interpreter(
        model_content=browser_model
    )
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    input_shape = tuple(input_details[0]["shape"])
    input_signature = tuple(input_details[0]["shape_signature"])
    output_shape = tuple(output_details[0]["shape"])

    print("Browser input shape:", input_shape)
    print("Browser input signature:", input_signature)
    print("Browser output shape:", output_shape)

    if input_shape != (1, IMAGE_SIZE, IMAGE_SIZE, 3):
        raise RuntimeError(f"Unexpected input shape: {input_shape}")

    if input_signature != (1, IMAGE_SIZE, IMAGE_SIZE, 3):
        raise RuntimeError(
            f"Input signature is still dynamic: {input_signature}"
        )

    if output_shape != (1, 3):
        raise RuntimeError(f"Unexpected output shape: {output_shape}")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_bytes(browser_model)

    print("Browser model successfully created:")
    print(OUTPUT_PATH.relative_to(REPO_ROOT))
    print("Model size:", len(browser_model), "bytes")


if __name__ == "__main__":
    main()
