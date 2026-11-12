from functools import lru_cache
from pathlib import Path
from typing import BinaryIO, Union
import os

import numpy as np
import tensorflow as tf
from PIL import Image, ImageOps


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = PROJECT_ROOT / "AI" / "species_detector_mobilenetv2.h5"
DEFAULT_LABELS_PATH = PROJECT_ROOT / "AI" / "class_labels.txt"

IMAGE_HEIGHT = 224
IMAGE_WIDTH = 224
IMAGE_CHANNELS = 3
DEFAULT_CONFIDENCE_THRESHOLD = 0.95
CONFIDENCE_COMPARISON_TOLERANCE = 1e-7

ImageSource = Union[str, Path, BinaryIO]


class ModelConfigurationError(RuntimeError):
    """Raised when the model and label configuration are incompatible."""


def load_labels(labels_path: Path = DEFAULT_LABELS_PATH) -> list[str]:
    """Load an ordered index-to-label mapping from the label file."""
    indexed_labels: dict[int, str] = {}

    with Path(labels_path).open("r", encoding="utf-8") as label_file:
        for line_number, raw_line in enumerate(label_file, start=1):
            line = raw_line.strip()

            if not line:
                continue

            try:
                raw_index, raw_label = line.split(":", maxsplit=1)
                index = int(raw_index)
                label = raw_label.strip()
            except ValueError as exc:
                raise ModelConfigurationError(
                    f"Invalid label entry on line {line_number}."
                ) from exc

            if index < 0 or not label:
                raise ModelConfigurationError(
                    f"Invalid label entry on line {line_number}."
                )

            if index in indexed_labels:
                raise ModelConfigurationError(
                    f"Duplicate class index {index} in label file."
                )

            indexed_labels[index] = label

    expected_indices = list(range(len(indexed_labels)))
    actual_indices = sorted(indexed_labels)

    if not indexed_labels or actual_indices != expected_indices:
        raise ModelConfigurationError(
            "Label indices must be consecutive and begin at zero."
        )

    return [indexed_labels[index] for index in expected_indices]


def load_model(
    model_path: Path = DEFAULT_MODEL_PATH,
    expected_label_count: int | None = None,
) -> tf.keras.Model:
    """Load and structurally validate the Keras classification model."""
    model = tf.keras.models.load_model(Path(model_path), compile=False)

    expected_input_shape = (
        None,
        IMAGE_HEIGHT,
        IMAGE_WIDTH,
        IMAGE_CHANNELS,
    )

    if tuple(model.input_shape) != expected_input_shape:
        raise ModelConfigurationError(
            f"Unexpected model input shape: {model.input_shape}."
        )

    output_count = int(model.output_shape[-1])

    if expected_label_count is not None and output_count != expected_label_count:
        raise ModelConfigurationError(
            "Model output count does not match the verified label count."
        )

    return model


def preprocess_image(image_source: ImageSource) -> np.ndarray:
    """Decode, orient, convert and normalise an image for MobileNetV2."""
    with Image.open(image_source) as opened_image:
        oriented_image = ImageOps.exif_transpose(opened_image)
        rgb_image = oriented_image.convert("RGB")
        image_array = np.asarray(rgb_image, dtype=np.float32)

    resized_image = tf.image.resize(
        image_array,
        [IMAGE_HEIGHT, IMAGE_WIDTH],
        method="bilinear",
    )

    normalised_image = resized_image / 255.0
    batch = tf.expand_dims(normalised_image, axis=0)

    return batch.numpy().astype(np.float32)


def run_inference(model: tf.keras.Model, image_batch: np.ndarray) -> np.ndarray:
    """Run one preprocessed image through the model."""
    predictions = np.asarray(model.predict(image_batch, verbose=0))

    if predictions.shape != (1, int(model.output_shape[-1])):
        raise RuntimeError(
            f"Unexpected prediction shape: {predictions.shape}."
        )

    return predictions[0]


def postprocess_prediction(
    probabilities: np.ndarray,
    labels: list[str],
    confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
) -> dict:
    """Convert model probabilities into the API prediction structure."""
    if len(probabilities) != len(labels):
        raise ModelConfigurationError(
            "Prediction count does not match the verified label count."
        )

    class_index = int(np.argmax(probabilities))
    confidence = float(probabilities[class_index])
    uncertain = (
    confidence
    < confidence_threshold - CONFIDENCE_COMPARISON_TOLERANCE
)

    return {
        "class_index": class_index,
        "species_label": labels[class_index],
        "confidence": confidence,
        "uncertain": uncertain,
    }


def get_configured_confidence_threshold() -> float:
    """Read and validate the configured confidence threshold."""
    raw_threshold = os.getenv(
        "AI_CONFIDENCE_THRESHOLD",
        str(DEFAULT_CONFIDENCE_THRESHOLD),
    )

    try:
        threshold = float(raw_threshold)
    except ValueError as exc:
        raise ModelConfigurationError(
            "AI_CONFIDENCE_THRESHOLD must be a number."
        ) from exc

    if not 0.0 <= threshold <= 1.0:
        raise ModelConfigurationError(
            "AI_CONFIDENCE_THRESHOLD must be between 0 and 1."
        )

    return threshold

class SpeciesIdentificationService:
    """Reusable model service that loads its model and labels once."""

    def __init__(
        self,
        model_path: Path = DEFAULT_MODEL_PATH,
        labels_path: Path = DEFAULT_LABELS_PATH,
        confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
    ) -> None:
        self.labels = load_labels(labels_path)
        self.model = load_model(
            model_path,
            expected_label_count=len(self.labels),
        )
        self.confidence_threshold = confidence_threshold

    def identify(self, image_source: ImageSource) -> dict:
        image_batch = preprocess_image(image_source)
        probabilities = run_inference(self.model, image_batch)

        return postprocess_prediction(
            probabilities,
            self.labels,
            self.confidence_threshold,
        )


@lru_cache(maxsize=1)
def get_species_identification_service() -> SpeciesIdentificationService:
    """Return the single shared inference service for this process."""
    return SpeciesIdentificationService(
        confidence_threshold=get_configured_confidence_threshold(),
    )