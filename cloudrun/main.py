import base64
import csv
import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Tuple
from uuid import uuid4

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from google.cloud import bigquery, firestore, storage
import firebase_admin
from firebase_admin import credentials
from google.oauth2 import service_account

load_dotenv()

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("syncgaze.ingestor")

app = Flask(__name__)


def initialize_firebase() -> firebase_admin.App:
    if firebase_admin._apps:  # type: ignore[attr-defined]
        return firebase_admin.get_app()

    service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    cred: credentials.Certificate | credentials.ApplicationDefault
    if service_account_json:
        cred = credentials.Certificate(json.loads(service_account_json))
        logger.info("Initializing Firebase app from FIREBASE_SERVICE_ACCOUNT_JSON")
    else:
        logger.info("Initializing Firebase app using Application Default Credentials")
        cred = credentials.ApplicationDefault()

    return firebase_admin.initialize_app(
        cred,
        {
            "projectId": os.environ.get("GOOGLE_CLOUD_PROJECT"),
            "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET"),
        },
    )


firebase_app = initialize_firebase()

# .env에서 JSON 키를 가져와서 Google Cloud 인증 객체 생성
service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
gcp_creds = None
if service_account_json:
    gcp_creds = service_account.Credentials.from_service_account_info(
        json.loads(service_account_json)
    )

# 인증 객체를 전달하여 클라이언트 초기화 (로컬에서는 gcp_creds 사용, 배포 시엔 None이어도 자동 처리됨)
db = firestore.Client(credentials=gcp_creds)
storage_client = storage.Client(credentials=gcp_creds)
bq_client = bigquery.Client(credentials=gcp_creds)


SUMMARY_COLLECTION = os.environ.get("FS_SUMMARY_COLLECTION", "sessionSummaries")
PROFILE_PATH_TEMPLATE = os.environ.get("FS_PROFILE_PATH", "users/{uid}")
SURVEY_PATH_TEMPLATE = os.environ.get("FS_SURVEY_PATH", "sessions/{sessionId}/survey")
CONSENT_PATH_TEMPLATE = os.environ.get("FS_CONSENT_PATH", "sessions/{sessionId}/consent")
CALIB_PATH_TEMPLATE = os.environ.get(
    "FS_CALIBRATION_PATH", "sessions/{sessionId}/calibration"
)
SUMMARY_TARGETS = os.environ.get("SUMMARY_TARGETS", "firestore").split(",")
BQ_DATASET = os.environ.get("BIGQUERY_DATASET")
BQ_TABLE = os.environ.get("BIGQUERY_TABLE", "joinedData")


class BadRequestError(Exception):
    """Raised when the incoming request cannot be processed."""


def _apply_path_template(template: str, uid: str, session_id: str) -> firestore.DocumentReference:
    path = template.format(uid=uid, sessionId=session_id)
    parts = [segment for segment in path.split("/") if segment]
    if not parts or len(parts) % 2 != 0:
        raise ValueError(
            f"Firestore path template must resolve to a document (collection/doc/...): {template} -> {path}"
        )

    ref: Any = db.collection(parts[0])
    for index in range(1, len(parts), 2):
        ref = ref.document(parts[index])
        if index + 1 < len(parts):
            ref = ref.collection(parts[index + 1])
    return ref


def fetch_firestore_document(template: str, uid: str, session_id: str) -> Dict[str, Any]:
    try:
        doc = _apply_path_template(template, uid, session_id).get()
        return doc.to_dict() or {}
    except Exception as exc:  # pragma: no cover - defensive logging path
        logger.warning("Failed to fetch Firestore document %s: %s", template, exc)
        return {}


def decode_pubsub_message(payload: Dict[str, Any]) -> Tuple[str, str, Dict[str, Any]]:
    message = payload.get("message", payload)
    attributes = message.get("attributes", {}) or {}
    data = message.get("data")
    decoded: Dict[str, Any] = {}

    if data:
        decoded = json.loads(base64.b64decode(data).decode("utf-8"))

    bucket = decoded.get("bucket") or attributes.get("bucket") or payload.get("bucket")
    name = decoded.get("name") or attributes.get("name") or payload.get("name")
    if not bucket or not name:
        raise BadRequestError("Pub/Sub payload must include bucket and name attributes.")

    session_id = (
        decoded.get("sessionId")
        or attributes.get("sessionId")
        or _session_from_path(name)
    )
    uid = decoded.get("uid") or attributes.get("uid") or _uid_from_path(name)

    return bucket, name, {**attributes, **decoded, "uid": uid, "sessionId": session_id}


def _session_from_path(path: str) -> str | None:
    segments = [segment for segment in path.replace(".csv", "").split("/") if segment]
    return segments[-2] if len(segments) >= 2 else None


def _uid_from_path(path: str) -> str | None:
    segments = [segment for segment in path.replace(".csv", "").split("/") if segment]
    return segments[-1] if segments else None


def download_csv_rows(bucket_name: str, object_name: str) -> List[Dict[str, Any]]:
    blob = storage_client.bucket(bucket_name).blob(object_name)
    if not blob.exists():
        raise FileNotFoundError(f"Object gs://{bucket_name}/{object_name} not found")

    logger.info("Downloading CSV from gs://%s/%s", bucket_name, object_name)
    text = blob.download_as_text()
    reader = csv.DictReader(text.splitlines())
    return [row for row in reader]


def analyze_csv(rows: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    rows = list(rows)
    if not rows:
        return {"rowCount": 0, "columns": [], "numericAverages": {}}

    numeric_totals: Dict[str, float] = {}
    numeric_counts: Dict[str, int] = {}

    for row in rows:
        for key, value in row.items():
            try:
                number = float(value)
            except (TypeError, ValueError):
                continue
            numeric_totals[key] = numeric_totals.get(key, 0.0) + number
            numeric_counts[key] = numeric_counts.get(key, 0) + 1

    averages = {
        key: numeric_totals[key] / numeric_counts[key]
        for key in numeric_totals
        if numeric_counts.get(key)
    }

    return {
        "rowCount": len(rows),
        "columns": list(rows[0].keys()),
        "numericAverages": averages,
        "sample": rows[: min(3, len(rows))],
    }


def build_joined_record(
    uid: str | None,
    session_id: str | None,
    bucket: str,
    name: str,
    csv_rows: List[Dict[str, Any]],
    extra_attributes: Dict[str, Any],
) -> Dict[str, Any]:
    analysis = analyze_csv(csv_rows)
    joined = {
        "ingestionId": str(uuid4()),
        "uid": uid,
        "sessionId": session_id,
        "sourceObject": f"gs://{bucket}/{name}",
        "ingestedAt": datetime.now(timezone.utc).isoformat(),
        "csvAnalysis": analysis,
        "csvRowCount": analysis.get("rowCount"),
        "attributes": extra_attributes,
    }

    if uid and session_id:
        joined["profile"] = fetch_firestore_document(PROFILE_PATH_TEMPLATE, uid, session_id)
        joined["survey"] = fetch_firestore_document(SURVEY_PATH_TEMPLATE, uid, session_id)
        joined["consent"] = fetch_firestore_document(CONSENT_PATH_TEMPLATE, uid, session_id)
        joined["calibration"] = fetch_firestore_document(CALIB_PATH_TEMPLATE, uid, session_id)

    return joined


def store_in_firestore(session_id: str | None, payload: Dict[str, Any]) -> None:
    if not session_id:
        raise ValueError("sessionId is required to store summary in Firestore")

    db.collection(SUMMARY_COLLECTION).document(session_id).set(payload, merge=True)
    logger.info("Stored session summary in Firestore collection '%s'", SUMMARY_COLLECTION)


def store_in_bigquery(payload: Dict[str, Any]) -> None:
    if not BQ_DATASET:
        raise ValueError("BIGQUERY_DATASET environment variable is required for BigQuery writes")

    table_id = f"{BQ_DATASET}.{BQ_TABLE}"
    payload = {**payload, "ingestedAt": payload.get("ingestedAt") or datetime.now(timezone.utc).isoformat()}
    errors = bq_client.insert_rows_json(table_id, [payload])
    if errors:
        raise RuntimeError(f"Failed to insert rows into {table_id}: {errors}")

    logger.info("Inserted joined record into BigQuery %s", table_id)


def record_failure(session_id: str | None, details: Dict[str, Any]) -> None:
    if not session_id:
        logger.error("Unable to record failure without sessionId: %s", details)
        return

    error_payload = {
        **details,
        "status": "error",
        "failedAt": datetime.now(timezone.utc).isoformat(),
    }
    db.collection(SUMMARY_COLLECTION).document(session_id).set(error_payload, merge=True)
    logger.info("Recorded failure for session %s", session_id)


@app.route("/healthz", methods=["GET"])
def healthcheck():
    return jsonify({"status": "ok"})


@app.route("/ingest", methods=["POST"])
def ingest_pubsub():
    try:
        payload = request.get_json(force=True, silent=False)
        if payload is None:
            raise BadRequestError("Request body must be JSON")

        bucket, name, attributes = decode_pubsub_message(payload)
        csv_rows = download_csv_rows(bucket, name)
        joined_record = build_joined_record(
            uid=attributes.get("uid"),
            session_id=attributes.get("sessionId"),
            bucket=bucket,
            name=name,
            csv_rows=csv_rows,
            extra_attributes=attributes,
        )

        joined_record.update({"status": "success", "processedAt": datetime.now(timezone.utc).isoformat()})

        targets = {target.strip().lower() for target in SUMMARY_TARGETS if target.strip()}
        if "firestore" in targets:
            store_in_firestore(joined_record.get("sessionId"), joined_record)
        if "bigquery" in targets:
            store_in_bigquery(joined_record)

        return jsonify({"ok": True, "sessionId": joined_record.get("sessionId")}), 200
    except BadRequestError as exc:
        logger.warning("Bad request: %s", exc)
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover - runtime path
        logger.exception("Failed to process Pub/Sub message")
        session_id = None
        try:
            _, _, attributes = decode_pubsub_message(request.get_json(force=True, silent=True) or {})
            session_id = attributes.get("sessionId")
        except Exception:
            pass
        record_failure(session_id, {"error": str(exc)})
        return jsonify({"error": "Internal Server Error"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")))
