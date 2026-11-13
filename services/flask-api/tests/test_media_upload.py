from io import BytesIO
from types import SimpleNamespace

import pytest
from flask import Flask
from PIL import Image

import media


SPECIES = [{"species_id": 2, "scientific_name": "Tectona grandis"}]
MP4_BYTES = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64
MOV_BYTES = b"\x00\x00\x00\x14ftypqt  " + b"\x00" * 64
WEBM_BYTES = b"\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01\x42\x82\x84webm" + b"\x00" * 64
HEIC_BYTES = b"\x00\x00\x00\x18ftypheic" + b"\x00" * 64


class FakeQuery:
    def __init__(self, db, table):
        self.db = db
        self.table = table
        self.filter = None
        self.row = None

    def select(self, *args):
        return self

    def ilike(self, column, value):
        self.filter = (column, value)
        return self

    def limit(self, count):
        return self

    def insert(self, row):
        self.row = row
        return self

    def execute(self):
        if self.table == "species_en":
            column, value = self.filter
            rows = [r for r in SPECIES if r[column].lower() == value.lower()]
            return SimpleNamespace(data=rows)

        if self.db.fail_insert:
            raise RuntimeError("insert failed")
        self.db.inserted.append(self.row)
        return SimpleNamespace(data=[{"media_id": 101, **self.row}])


class FakeBucket:
    def __init__(self, db, name):
        self.db = db
        self.name = name

    def upload(self, path, data, options):
        if self.db.fail_upload:
            raise RuntimeError("storage down")
        self.db.uploads.append((self.name, path, data, options))

    def get_public_url(self, path):
        return f"https://example.supabase.co/storage/v1/object/public/{self.name}/{path}"

    def remove(self, paths):
        self.db.removed.append((self.name, paths))


class FakeSupabase:
    def __init__(self):
        self.inserted = []
        self.uploads = []
        self.removed = []
        self.fail_insert = False
        self.fail_upload = False
        self.storage = SimpleNamespace(from_=lambda name: FakeBucket(self, name))

    def table(self, name):
        return FakeQuery(self, name)


def create_image(image_format="PNG", size=(32, 32), mode="RGB"):
    output = BytesIO()
    image = Image.new(mode, size)
    if image_format == "MPO":
        preview = Image.new("RGB", (16, 24), (200, 10, 10))
        image.save(output, format="MPO", save_all=True, append_images=[preview])
    else:
        image.save(output, format=image_format)
    return output.getvalue()


@pytest.fixture
def db():
    return FakeSupabase()


@pytest.fixture
def changes(monkeypatch):
    logged = []
    monkeypatch.setattr(media, "get_admin_user", lambda supabase: ("admin-1", None))
    monkeypatch.setattr(
        media,
        "log_change",
        lambda supabase, entity, entity_id, op: logged.append((entity, entity_id, op)),
    )
    return logged


@pytest.fixture
def client(db, changes):
    app = Flask(__name__)
    app.config["TESTING"] = True
    media.register_media_routes(app, db)

    with app.test_client() as test_client:
        yield test_client


def upload(client, data, filename="upload.bin", media_type="image", species="tectona grandis"):
    return client.post(
        "/upload-media/file",
        data={
            "file": (BytesIO(data), filename),
            "species_name": species,
            "media_type": media_type,
            "alt_text": "  Teak leaves  ",
        },
        content_type="multipart/form-data",
    )


@pytest.mark.parametrize(
    ("image_format", "extension", "content_type"),
    [
        ("JPEG", "jpg", "image/jpeg"),
        ("MPO", "jpg", "image/jpeg"),
        ("PNG", "png", "image/png"),
        ("WEBP", "webp", "image/webp"),
        ("GIF", "gif", "image/gif"),
    ],
)
def test_image_is_stored_and_registered(client, db, changes, image_format, extension, content_type):
    data = create_image(image_format)

    response = upload(client, data, filename="photo.txt")

    body = response.get_json()
    bucket, path, stored, options = db.uploads[0]
    assert response.status_code == 201
    assert bucket == "species_images"
    assert path.startswith("Photos/Tectona_grandis/")
    assert path.endswith(f".{extension}")
    assert stored == data
    assert options == {"content-type": content_type}
    assert body["media_id"] == 101
    assert body["path"] == f"species_images/{path}"
    assert body["url"].endswith(f"/species_images/{path}")
    assert db.inserted == [{
        "species_id": 2,
        "species_name": "Tectona grandis",
        "media_type": "image",
        "download_link": body["url"],
        "streaming_link": body["url"],
        "alt_text": "Teak leaves",
        "storage_version": 1,
    }]
    assert changes == [("media", 101, "CREATE")]


@pytest.mark.parametrize(
    ("data", "extension", "content_type"),
    [
        (MP4_BYTES, "mp4", "video/mp4"),
        (MOV_BYTES, "mov", "video/quicktime"),
        (WEBM_BYTES, "webm", "video/webm"),
    ],
)
def test_video_is_stored_in_media_bucket(client, db, data, extension, content_type):
    response = upload(client, data, media_type="video")

    bucket, path, _, options = db.uploads[0]
    assert response.status_code == 201
    assert bucket == "media"
    assert path.startswith("videos/Tectona_grandis/")
    assert path.endswith(f".{extension}")
    assert options == {"content-type": content_type}
    assert db.inserted[0]["media_type"] == "video"


def test_two_uploads_never_share_a_path(client, db):
    upload(client, create_image())
    upload(client, create_image())

    assert db.uploads[0][1] != db.uploads[1][1]


@pytest.mark.parametrize(
    ("data", "media_type", "status_code"),
    [
        (b"not an image", "image", 400),
        (MP4_BYTES, "image", 400),
        (create_image("BMP"), "image", 415),
        (HEIC_BYTES, "video", 415),
        (create_image(), "video", 415),
    ],
)
def test_wrong_content_is_rejected(client, db, changes, data, media_type, status_code):
    response = upload(client, data, filename="photo.jpg", media_type=media_type)

    assert response.status_code == status_code
    assert db.uploads == []
    assert db.inserted == []
    assert changes == []


def test_image_over_byte_limit_returns_413(client, db, monkeypatch):
    monkeypatch.setitem(media.MAX_UPLOAD_BYTES, "image", 1024)

    response = upload(client, create_image(size=(512, 512), mode="RGB") + b"\x00" * 2048)

    assert response.status_code == 413
    assert db.uploads == []


def test_image_over_pixel_limit_returns_413(client, db):
    response = upload(client, create_image(size=(8000, 6000), mode="1"))

    assert response.status_code == 413
    assert db.uploads == []


def test_unknown_species_returns_400(client, db):
    response = upload(client, create_image(), species="Quercus robur")

    assert response.status_code == 400
    assert db.uploads == []


@pytest.mark.parametrize(
    "missing",
    ["file", "species_name", "media_type"],
)
def test_missing_field_returns_400(client, db, missing):
    form = {
        "file": (BytesIO(create_image()), "photo.png"),
        "species_name": "Tectona grandis",
        "media_type": "image",
    }
    del form[missing]

    response = client.post("/upload-media/file", data=form, content_type="multipart/form-data")

    assert response.status_code == 400
    assert db.uploads == []


def test_non_admin_is_refused(client, db, monkeypatch):
    monkeypatch.setattr(
        media,
        "get_admin_user",
        lambda supabase: (None, ("Unauthorized", 401)),
    )

    response = upload(client, create_image())

    assert response.status_code == 401
    assert db.uploads == []


def test_storage_failure_returns_502_without_a_media_row(client, db, changes):
    db.fail_upload = True

    response = upload(client, create_image())

    assert response.status_code == 502
    assert db.inserted == []
    assert changes == []


def test_failed_insert_removes_the_stored_file(client, db, changes):
    db.fail_insert = True

    with pytest.raises(RuntimeError):
        upload(client, create_image())

    assert db.removed == [("species_images", [db.uploads[0][1]])]
    assert changes == []
