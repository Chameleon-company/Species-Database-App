from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import BinaryIO, Union
import os

import numpy as np
from ai_edge_litert.interpreter import Interpreter
from PIL import Image, ImageOps


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MODEL_PATH = PROJECT_ROOT / "ml" / "training" / "species_detector_mobilenetv2.tflite"
DEFAULT_LABELS_PATH = PROJECT_ROOT / "ml" / "training" / "class_labels.txt"

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
) -> Interpreter:
    """Load the LiteRT model and check its input and output shapes."""
    interpreter = Interpreter(model_path=str(model_path))
    interpreter.allocate_tensors()

    input_shape = tuple(int(size) for size in interpreter.get_input_details()[0]["shape"])
    expected_input_shape = (1, IMAGE_HEIGHT, IMAGE_WIDTH, IMAGE_CHANNELS)

    if input_shape != expected_input_shape:
        raise ModelConfigurationError(
            f"Unexpected model input shape: {input_shape}."
        )

    output_count = int(interpreter.get_output_details()[0]["shape"][-1])

    if expected_label_count is not None and output_count != expected_label_count:
        raise ModelConfigurationError(
            "Model output count does not match the verified label count."
        )

    return interpreter


def resize_bilinear(image: np.ndarray, height: int, width: int) -> np.ndarray:
    """Resize an HxWxC array the way tf.image.resize(method="bilinear") does.

    The model was trained on images resized by TensorFlow, which samples at
    half-pixel centres and does not antialias. Pillow's bilinear resize
    antialiases when it shrinks an image, which changes the pixels enough to
    flip some predictions, so this reproduces TensorFlow's sampling instead.
    Only the source rows and columns that are sampled are converted to float,
    so a large photo stays in memory as uint8.
    """
    source_height, source_width = image.shape[:2]

    rows = np.clip((np.arange(height) + 0.5) * (source_height / height) - 0.5, 0, source_height - 1)
    cols = np.clip((np.arange(width) + 0.5) * (source_width / width) - 0.5, 0, source_width - 1)

    top = np.floor(rows).astype(np.intp)
    left = np.floor(cols).astype(np.intp)
    bottom = np.minimum(top + 1, source_height - 1)
    right = np.minimum(left + 1, source_width - 1)

    row_weight = (rows - top)[:, None, None]
    col_weight = (cols - left)[None, :, None]

    def sample(row_index, col_index):
        return image[row_index][:, col_index].astype(np.float64)

    upper = sample(top, left) * (1 - col_weight) + sample(top, right) * col_weight
    lower = sample(bottom, left) * (1 - col_weight) + sample(bottom, right) * col_weight

    return (upper * (1 - row_weight) + lower * row_weight).astype(np.float32)


def preprocess_image(image_source: ImageSource) -> np.ndarray:
    """Decode, orient, convert and normalise an image for MobileNetV2.

    The image is rotated in place and only converted when it is not already
    RGB, so a 12 megapixel phone photo is not copied several times over.
    """
    with Image.open(image_source) as opened_image:
        opened_image.load()
        ImageOps.exif_transpose(opened_image, in_place=True)
        rgb_image = opened_image if opened_image.mode == "RGB" else opened_image.convert("RGB")
        image_array = np.asarray(rgb_image, dtype=np.uint8)

    resized_image = resize_bilinear(image_array, IMAGE_HEIGHT, IMAGE_WIDTH)
    normalised_image = resized_image / np.float32(255.0)

    return normalised_image[np.newaxis, ...].astype(np.float32)


def run_inference(interpreter: Interpreter, image_batch: np.ndarray) -> np.ndarray:
    """Run one preprocessed image through the model."""
    input_index = interpreter.get_input_details()[0]["index"]
    output_details = interpreter.get_output_details()[0]

    interpreter.set_tensor(input_index, image_batch)
    interpreter.invoke()
    predictions = np.asarray(interpreter.get_tensor(output_details["index"]))

    if predictions.shape != (1, int(output_details["shape"][-1])):
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
        self._inference_lock = Lock()

    def identify(self, image_source: ImageSource) -> dict:
        """Identify the species in one image.

        A LiteRT interpreter is not safe to share between threads, so a lock
        serialises inference when the API runs with threaded workers.
        """
        image_batch = preprocess_image(image_source)

        with self._inference_lock:
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