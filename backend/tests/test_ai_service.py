from io import BytesIO

import numpy as np
import pytest
from PIL import Image

import ai_service
from ai_service import (
    ModelConfigurationError,
    get_configured_confidence_threshold,
    load_labels,
    load_model,
    postprocess_prediction,
    preprocess_image,
    run_inference,
)


EXPECTED_LABELS = [
    "Casuarina_equisetifolia",
    "Swietenia_Macrophylla",
    "Tectona_Grandis",
]


def create_image(mode="RGB", image_format="PNG"):
    if mode == "RGBA":
        colour = (20, 120, 60, 180)
    elif mode == "L":
        colour = 128
    else:
        colour = (20, 120, 60)

    image = Image.new(mode, (40, 60), colour)
    output = BytesIO()
    image.save(output, format=image_format)
    output.seek(0)
    return output


def test_load_labels_returns_verified_order(tmp_path):
    labels_file = tmp_path / "class_labels.txt"
    labels_file.write_text(
        "0:Casuarina_equisetifolia\n"
        "1:Swietenia_Macrophylla\n"
        "2:Tectona_Grandis\n",
        encoding="utf-8",
    )

    assert load_labels(labels_file) == EXPECTED_LABELS


@pytest.mark.parametrize(
    "contents",
    [
        "invalid entry\n",
        "0:\n",
        "1:Tectona_Grandis\n",
        "0:Casuarina\n0:Tectona\n",
    ],
)
def test_load_labels_rejects_invalid_configuration(
    tmp_path,
    contents,
):
    labels_file = tmp_path / "class_labels.txt"
    labels_file.write_text(contents, encoding="utf-8")

    with pytest.raises(ModelConfigurationError):
        load_labels(labels_file)


@pytest.mark.parametrize("mode", ["RGB", "L", "RGBA"])
def test_preprocess_image_creates_expected_batch(mode):
    batch = preprocess_image(create_image(mode=mode))

    assert batch.shape == (1, 224, 224, 3)
    assert batch.dtype == np.float32
    assert float(batch.min()) >= 0.0
    assert float(batch.max()) <= 1.0


def test_preprocess_image_rejects_corrupted_data():
    with pytest.raises(Exception):
        preprocess_image(BytesIO(b"not an image"))


class FakeModel:
    input_shape = (None, 224, 224, 3)
    output_shape = (None, 3)

    def __init__(self, predictions):
        self.predictions = np.asarray(
            [predictions],
            dtype=np.float32,
        )

    def predict(self, image_batch, verbose=0):
        return self.predictions


def test_run_inference_returns_three_probabilities():
    model = FakeModel([0.1, 0.2, 0.7])
    image_batch = np.zeros(
        (1, 224, 224, 3),
        dtype=np.float32,
    )

    probabilities = run_inference(model, image_batch)

    assert probabilities.shape == (3,)
    assert probabilities.tolist() == pytest.approx(
        [0.1, 0.2, 0.7]
    )


def test_postprocess_returns_successful_prediction():
    probabilities = np.asarray(
        [0.1, 0.2, 0.7],
        dtype=np.float32,
    )

    result = postprocess_prediction(
        probabilities,
        EXPECTED_LABELS,
        confidence_threshold=0.70,
    )

    assert result["class_index"] == 2
    assert result["species_label"] == "Tectona_Grandis"
    assert result["confidence"] == pytest.approx(0.7)
    assert result["uncertain"] is False


def test_postprocess_returns_uncertain_prediction():
    probabilities = np.asarray(
        [0.4, 0.35, 0.25],
        dtype=np.float32,
    )

    result = postprocess_prediction(
        probabilities,
        EXPECTED_LABELS,
        confidence_threshold=0.70,
    )

    assert result["class_index"] == 0
    assert result["confidence"] == pytest.approx(0.4)
    assert result["uncertain"] is True


def test_postprocess_rejects_label_count_mismatch():
    probabilities = np.asarray(
        [0.4, 0.35, 0.25],
        dtype=np.float32,
    )

    with pytest.raises(ModelConfigurationError):
        postprocess_prediction(
            probabilities,
            ["Only_one_label"],
        )


def test_load_model_rejects_unexpected_input_shape(
    monkeypatch,
):
    fake_model = FakeModel([0.1, 0.2, 0.7])
    fake_model.input_shape = (None, 128, 128, 3)

    monkeypatch.setattr(
        ai_service.tf.keras.models,
        "load_model",
        lambda *args, **kwargs: fake_model,
    )

    with pytest.raises(
        ModelConfigurationError,
        match="Unexpected model input shape",
    ):
        load_model("fake_model.h5", expected_label_count=3)


def test_load_model_rejects_label_count_mismatch(
    monkeypatch,
):
    fake_model = FakeModel([0.1, 0.2, 0.7])

    monkeypatch.setattr(
        ai_service.tf.keras.models,
        "load_model",
        lambda *args, **kwargs: fake_model,
    )

    with pytest.raises(
        ModelConfigurationError,
        match="does not match",
    ):
        load_model("fake_model.h5", expected_label_count=2)


def test_default_confidence_threshold(monkeypatch):
    monkeypatch.delenv(
        "AI_CONFIDENCE_THRESHOLD",
        raising=False,
    )

    assert get_configured_confidence_threshold() == 0.95


def test_custom_confidence_threshold(monkeypatch):
    monkeypatch.setenv(
        "AI_CONFIDENCE_THRESHOLD",
        "0.85",
    )

    assert get_configured_confidence_threshold() == 0.85


@pytest.mark.parametrize(
    "value",
    ["not-a-number", "-0.1", "1.1"],
)
def test_invalid_confidence_threshold(value, monkeypatch):
    monkeypatch.setenv(
        "AI_CONFIDENCE_THRESHOLD",
        value,
    )

    with pytest.raises(ModelConfigurationError):
        get_configured_confidence_threshold()