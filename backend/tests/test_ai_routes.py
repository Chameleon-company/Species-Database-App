from io import BytesIO

import pytest
from flask import Flask
from PIL import Image

import ai_routes
from ai_routes import register_ai_routes
from ai_service import ModelConfigurationError


LABELS = [
    "Casuarina_equisetifolia",
    "Swietenia_Macrophylla",
    "Tectona_Grandis",
]


class MockService:
    labels = LABELS

    def __init__(self, prediction=None):
        self.prediction = prediction or {
            "class_index": 2,
            "species_label": "Tectona_Grandis",
            "confidence": 0.91,
            "uncertain": False,
        }
        self.call_count = 0

    def identify(self, image_source):
        self.call_count += 1
        return self.prediction


class FailingService:
    labels = LABELS

    def identify(self, image_source):
        raise RuntimeError("Private model failure detail")


def create_image(
    mode="RGB",
    image_format="PNG",
):
    if mode == "RGBA":
        colour = (20, 120, 60, 180)
    elif mode == "L":
        colour = 128
    else:
        colour = (20, 120, 60)

    image = Image.new(mode, (32, 32), colour)
    output = BytesIO()
    image.save(output, format=image_format)
    output.seek(0)
    return output


def create_test_app(
    service,
    max_upload_bytes=10 * 1024 * 1024,
):
    app = Flask(__name__)
    app.config["TESTING"] = True

    register_ai_routes(
        app,
        service=service,
        max_upload_bytes=max_upload_bytes,
    )

    return app


@pytest.fixture
def service():
    return MockService()


@pytest.fixture
def client(service):
    app = create_test_app(service)

    with app.test_client() as test_client:
        yield test_client


@pytest.mark.parametrize(
    ("image_format", "filename"),
    [
        ("JPEG", "plant.jpg"),
        ("PNG", "plant.png"),
        ("PNG", "PLANT.PNG"),
        ("PNG", "plant.txt"),
    ],
)
def test_valid_images_return_prediction(
    client,
    service,
    image_format,
    filename,
):
    response = client.post(
        "/api/ai/identify",
        data={
            "image": (
                create_image(image_format=image_format),
                filename,
            )
        },
        content_type="multipart/form-data",
    )

    body = response.get_json()

    assert response.status_code == 200
    assert response.content_type == "application/json"
    assert body["status"] == "success"
    assert body["prediction"]["class_index"] == 2
    assert body["prediction"]["species_label"] == "Tectona_Grandis"
    assert body["prediction"]["confidence"] == pytest.approx(0.91)
    assert body["prediction"]["uncertain"] is False
    assert body["supported_species_count"] == 3
    assert service.call_count == 1


def test_missing_image_returns_400(client):
    response = client.post(
        "/api/ai/identify",
        data={},
        content_type="multipart/form-data",
    )

    body = response.get_json()

    assert response.status_code == 400
    assert body["status"] == "error"
    assert body["error"]["code"] == "missing_image"


def test_empty_image_returns_400(client):
    response = client.post(
        "/api/ai/identify",
        data={
            "image": (
                BytesIO(b""),
                "empty.jpg",
            )
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "empty_image"


def test_missing_filename_returns_400(client):
    response = client.post(
        "/api/ai/identify",
        data={
            "image": (
                create_image(),
                "",
            )
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "empty_image"


def test_corrupted_image_returns_400(client):
    response = client.post(
        "/api/ai/identify",
        data={
            "image": (
                BytesIO(b"not a real image"),
                "corrupted.jpg",
            )
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "invalid_image"


def test_unsupported_decoded_format_returns_415(client):
    response = client.post(
        "/api/ai/identify",
        data={
            "image": (
                create_image(image_format="GIF"),
                "misleading-name.jpg",
            )
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 415
    assert (
        response.get_json()["error"]["code"]
        == "unsupported_image_type"
    )


def test_oversized_upload_returns_413():
    app = create_test_app(
        MockService(),
        max_upload_bytes=32,
    )

    with app.test_client() as client:
        response = client.post(
            "/api/ai/identify",
            data={
                "image": (
                    BytesIO(b"x" * 33),
                    "large.jpg",
                )
            },
            content_type="multipart/form-data",
        )

    assert response.status_code == 413
    assert response.get_json()["error"]["code"] == "image_too_large"


@pytest.mark.parametrize("mode", ["L", "RGBA"])
def test_non_rgb_images_are_accepted(client, mode):
    response = client.post(
        "/api/ai/identify",
        data={
            "image": (
                create_image(mode=mode),
                "plant.png",
            )
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    assert response.get_json()["status"] == "success"


def test_uncertain_prediction_returns_message():
    uncertain_service = MockService({
        "class_index": 0,
        "species_label": "Casuarina_equisetifolia",
        "confidence": 0.42,
        "uncertain": True,
    })
    app = create_test_app(uncertain_service)

    with app.test_client() as client:
        response = client.post(
            "/api/ai/identify",
            data={
                "image": (
                    create_image(),
                    "plant.png",
                )
            },
            content_type="multipart/form-data",
        )

    body = response.get_json()

    assert response.status_code == 200
    assert body["status"] == "uncertain"
    assert body["prediction"]["uncertain"] is True
    assert body["prediction"]["confidence"] == pytest.approx(0.42)
    assert body["message"] == (
        "The image could not be identified reliably."
    )


def test_inference_failure_returns_safe_500():
    app = create_test_app(FailingService())

    with app.test_client() as client:
        response = client.post(
            "/api/ai/identify",
            data={
                "image": (
                    create_image(),
                    "plant.png",
                )
            },
            content_type="multipart/form-data",
        )

    body = response.get_json()

    assert response.status_code == 500
    assert body["error"]["code"] == "inference_failed"
    assert "Private model failure detail" not in str(body)


def test_model_unavailable_returns_safe_503(monkeypatch):
    def fail_to_load_service():
        raise ModelConfigurationError(
            "Private startup configuration detail"
        )

    monkeypatch.setattr(
        ai_routes,
        "get_species_identification_service",
        fail_to_load_service,
    )

    app = Flask("unavailable_test")
    app.config["TESTING"] = True
    register_ai_routes(app)

    with app.test_client() as client:
        response = client.post("/api/ai/identify")

    body = response.get_json()

    assert response.status_code == 503
    assert body["error"]["code"] == "model_unavailable"
    assert "Private startup configuration detail" not in str(body)