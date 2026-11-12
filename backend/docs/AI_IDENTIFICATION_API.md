# AI Species Identification API Contract

## Status

Day 1 contract for the backend MVP. The Flask route will be implemented on Day 2.

## Endpoint

`POST /api/ai/identify`

The endpoint accepts one plant image and returns a predicted class index, verified species label, confidence score, and uncertainty status.

## Request

Content type:

`multipart/form-data`

Required form field:

| Field | Type | Description |
|---|---|---|
| `image` | File | One plant image for identification |

Planned supported formats are JPEG and PNG. WebP support will be enabled only if validation confirms reliable decoding.

The planned default maximum upload size is 10 MiB and will be configurable.

## Successful prediction

HTTP status: `200 OK`

```json
{
  "status": "success",
  "prediction": {
    "class_index": 0,
    "species_label": "Casuarina_equisetifolia",
    "confidence": 0.9234,
    "uncertain": false
  },
  "supported_species_count": 3
}


## Uncertain prediction

A low-confidence or unsuitable input must not be presented as a reliable identification.

HTTP status: `200 OK`

```json
{
  "status": "uncertain",
  "prediction": {
    "class_index": 0,
    "species_label": "Casuarina_equisetifolia",
    "confidence": 0.4123,
    "uncertain": true
  },
  "message": "The image could not be identified reliably.",
  "supported_species_count": 3
}
```

The confidence threshold will be configurable and selected after representative testing. Confidence alone is not proof that an image belongs to a supported species.
The backend reads the threshold from the `AI_CONFIDENCE_THRESHOLD` environment variable. Its temporary MVP default is `0.70`. The configured value must be between `0.0` and `1.0`.

## Validation error

HTTP status:

- `400 Bad Request` for a missing, empty, or corrupted image
- `413 Content Too Large` for an oversized upload
- `415 Unsupported Media Type` for an unsupported decoded image format

```json
{
  "status": "error",
  "error": {
    "code": "invalid_image",
    "message": "The uploaded file is not a valid image."
  }
}
```

Planned validation codes:

- `missing_image`
- `empty_image`
- `invalid_image`
- `unsupported_image_type`
- `image_too_large`

## Server error

HTTP status:

- `500 Internal Server Error` for an unexpected preprocessing or inference failure
- `503 Service Unavailable` when the model or verified labels are unavailable

```json
{
  "status": "error",
  "error": {
    "code": "model_unavailable",
    "message": "Species identification is temporarily unavailable."
  }
}
```

Internal exception details, local file paths, and model implementation details must not be returned to the client.

## Verified class mapping

| Class index | Species label |
|---:|---|
| 0 | `Casuarina_equisetifolia` |
| 1 | `Swietenia_Macrophylla` |
| 2 | `Tectona_Grandis` |

The mapping is stored in `AI/class_labels.txt`. The service must fail during startup if the number of labels does not match the model output size.

## Frontend requirements

- Submit the image using `multipart/form-data`.
- Use the form field name `image`.
- Do not manually set the multipart boundary.
- Treat `status: "uncertain"` differently from a successful identification.
- Display the uncertainty message instead of presenting the candidate as confirmed.
- Handle validation and service errors using `error.code`.
- Inform users that the MVP recognises only three supported species.

## Current limitation

The model recognises only three species. During Day 1 testing, a blank synthetic input produced approximately 98.57% confidence for class index 0. The frontend and backend must therefore avoid treating softmax confidence as proof that an uploaded image contains a supported plant.