# Cloud Run CSV ingestor (Python)

This service ingests CSV uploads from Cloud Storage (via Pub/Sub push), joins them with Firestore metadata, and stores a single session summary in Firestore and/or BigQuery.

## Features
- Initializes Firebase Admin SDK for authenticated Firestore/Storage access.
- Responds to Cloud Storage -> Pub/Sub events at `POST /ingest`.
- Downloads CSVs from the referenced bucket/object and produces a lightweight numeric summary.
- Fetches Firestore profile, survey, consent, and calibration documents using configurable path templates.
- Writes a joined record to Firestore `/sessionSummaries/{sessionId}` and/or BigQuery `joinedData`.
- Records error/retry states for observability and includes a `GET /healthz` endpoint.

## Configuration
Copy `.env.example` to `.env` (or set variables in Cloud Run):

- `GOOGLE_CLOUD_PROJECT` – target GCP project.
- `SERVICE_NAME` / `REGION` – used by `deploy.sh`.
- `FIREBASE_STORAGE_BUCKET` – bucket containing uploaded CSVs.
- `SUMMARY_TARGETS` – comma list of `firestore`, `bigquery`, or both.
- Firestore path templates:
  - `FS_SUMMARY_COLLECTION` (default `sessionSummaries`)
  - `FS_PROFILE_PATH` (default `users/{uid}`)
  - `FS_SURVEY_PATH` (default `sessions/{sessionId}/survey`)
  - `FS_CONSENT_PATH` (default `sessions/{sessionId}/consent`)
  - `FS_CALIBRATION_PATH` (default `sessions/{sessionId}/calibration`)
- BigQuery: `BIGQUERY_DATASET` (required for BigQuery writes) and `BIGQUERY_TABLE` (default `joinedData`).
- Authentication: provide `FIREBASE_SERVICE_ACCOUNT_JSON` or rely on ADC / Workload Identity.

Pub/Sub messages must include `bucket` and `name` fields either in the encoded data or message attributes. Optional `sessionId`/`uid` can be provided via attributes or inferred from the object path.

## Local development
```bash
cd cloudrun
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Send a test Pub/Sub payload:
```bash
curl -X POST http://localhost:8080/ingest \
  -H 'Content-Type: application/json' \
  -d '{"message": {"attributes": {"bucket": "my-bucket", "name": "session123/user456.csv", "sessionId": "session123", "uid": "user456"}}}'
```

## Deployment
`deploy.sh` builds and deploys to Cloud Run. Make sure `gcloud` is authenticated and the `BIGQUERY_DATASET` exists.
```bash
cd cloudrun
bash deploy.sh
```
