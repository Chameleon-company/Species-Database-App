FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY services/flask-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/flask-api ./services/flask-api
COPY ml/training/species_detector_mobilenetv2.tflite ml/training/class_labels.txt ./ml/training/

WORKDIR /app/services/flask-api

EXPOSE 5000

# same worker settings as render.yaml; see the comment there
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--worker-class", "gthread", "--workers", "1", "--threads", "8", "--timeout", "120", "app:app"]
