"""Convert the trained Keras model into the LiteRT model that the API serves.

The API runs the model with LiteRT, which needs about 110 MB of memory
instead of the 750 MB that TensorFlow needs, so it fits a 512 MB instance.
The conversion keeps float32 weights, which give the same probabilities as
the Keras model. Dynamic-range quantization shifted probabilities by up to
0.27 on real field photos, so it is not used.

Run it from the repo root after every retraining, with the packages in
ml/training/requirements.txt installed:

    python ml/training/convert_to_litert.py
"""

from pathlib import Path

import tensorflow as tf


TRAINING_DIR = Path(__file__).resolve().parent
KERAS_MODEL_PATH = TRAINING_DIR / "species_detector_mobilenetv2.h5"
LITERT_MODEL_PATH = TRAINING_DIR / "species_detector_mobilenetv2.tflite"


def main() -> None:
    model = tf.keras.models.load_model(KERAS_MODEL_PATH, compile=False)
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    LITERT_MODEL_PATH.write_bytes(converter.convert())
    print(f"Wrote {LITERT_MODEL_PATH.relative_to(TRAINING_DIR.parents[1])}")


if __name__ == "__main__":
    main()
