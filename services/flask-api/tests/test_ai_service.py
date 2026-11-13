from io import BytesIO

import numpy as np
import pytest
from PIL import Image, UnidentifiedImageError

import ai_service
from ai_service import (
    ModelConfigurationError,
    SpeciesIdentificationService,
    get_configured_confidence_threshold,
    load_labels,
    load_model,
    postprocess_prediction,
    preprocess_image,
    resize_bilinear,
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
    if image_format == "MPO":
        image.save(output, format="MPO", save_all=True, append_images=[image])
    else:
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


def test_preprocess_image_reads_a_camera_jpeg_with_extra_frames():
    camera_jpeg = create_image(image_format="MPO")
    with Image.open(camera_jpeg) as opened:
        assert opened.format == "MPO"
        assert opened.n_frames > 1
    camera_jpeg.seek(0)

    np.testing.assert_allclose(
        preprocess_image(camera_jpeg),
        preprocess_image(create_image(image_format="JPEG")),
        atol=2 / 255,
    )


def test_preprocess_image_rejects_corrupted_data():
    with pytest.raises(UnidentifiedImageError):
        preprocess_image(BytesIO(b"not an image"))


TENSORFLOW_RESIZE_REFERENCE = [
    [[24.375, 27.375, 30.375], [40.125, 43.125, 46.125], [55.875, 58.875, 61.875], [71.625, 74.625, 77.625]],
    [[129.375, 132.375, 135.375], [145.125, 148.125, 151.125], [160.875, 163.875, 166.875], [176.625, 179.625, 182.625]],
    [[170.375, 173.375, 69.7084], [79.4584, 82.4584, 85.4584], [95.2084, 98.2084, 101.2084], [110.9584, 113.9584, 116.9584]],
]


def test_resize_matches_tensorflow_bilinear():
    image = ((np.arange(5 * 7 * 3).reshape(5, 7, 3) * 3) % 256).astype(np.uint8)

    resized = resize_bilinear(image, 3, 4)

    assert resized.dtype == np.float32
    assert resized == pytest.approx(np.array(TENSORFLOW_RESIZE_REFERENCE), abs=1e-3)


class FakeInterpreter:
    def __init__(self, predictions, input_shape=(1, 224, 224, 3)):
        self.predictions = np.asarray([predictions], dtype=np.float32)
        self.input_shape = input_shape
        self.received = None

    def allocate_tensors(self):
        pass

    def get_input_details(self):
        return [{"index": 0, "shape": np.array(self.input_shape)}]

    def get_output_details(self):
        return [{"index": 1, "shape": np.array(self.predictions.shape)}]

    def set_tensor(self, index, value):
        self.received = value

    def invoke(self):
        pass

    def get_tensor(self, index):
        return self.predictions


def test_run_inference_returns_three_probabilities():
    model = FakeInterpreter([0.1, 0.2, 0.7])
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
    fake_model = FakeInterpreter([0.1, 0.2, 0.7], input_shape=(1, 128, 128, 3))

    monkeypatch.setattr(
        ai_service,
        "Interpreter",
        lambda *args, **kwargs: fake_model,
    )

    with pytest.raises(
        ModelConfigurationError,
        match="Unexpected model input shape",
    ):
        load_model("fake_model.tflite", expected_label_count=3)


def test_load_model_rejects_label_count_mismatch(
    monkeypatch,
):
    fake_model = FakeInterpreter([0.1, 0.2, 0.7])

    monkeypatch.setattr(
        ai_service,
        "Interpreter",
        lambda *args, **kwargs: fake_model,
    )

    with pytest.raises(
        ModelConfigurationError,
        match="does not match",
    ):
        load_model("fake_model.tflite", expected_label_count=2)


def test_served_model_loads_and_identifies_an_image():
    service = SpeciesIdentificationService()

    result = service.identify(create_image())

    assert result["species_label"] in EXPECTED_LABELS
    assert 0.0 <= result["confidence"] <= 1.0
    assert isinstance(result["uncertain"], bool)


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