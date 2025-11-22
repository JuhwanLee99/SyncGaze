#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT in the environment}" 
: "${REGION:=us-central1}" 
: "${SERVICE_NAME:=syncgaze-ingestor}" 
IMAGE="gcr.io/${GOOGLE_CLOUD_PROJECT}/${SERVICE_NAME}"

printf "\nBuilding container image %s...\n" "$IMAGE"
gcloud builds submit --tag "$IMAGE" .

printf "\nDeploying service %s to region %s...\n" "$SERVICE_NAME" "$REGION"
gcloud run deploy "$SERVICE_NAME" \
  --project="$GOOGLE_CLOUD_PROJECT" \
  --region="$REGION" \
  --image="$IMAGE" \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT},FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET:-},SUMMARY_TARGETS=${SUMMARY_TARGETS:-firestore},FS_SUMMARY_COLLECTION=${FS_SUMMARY_COLLECTION:-sessionSummaries},FS_PROFILE_PATH=${FS_PROFILE_PATH:-users/{uid}},FS_SURVEY_PATH=${FS_SURVEY_PATH:-sessions/{sessionId}/survey},FS_CONSENT_PATH=${FS_CONSENT_PATH:-sessions/{sessionId}/consent},FS_CALIBRATION_PATH=${FS_CALIBRATION_PATH:-sessions/{sessionId}/calibration},BIGQUERY_DATASET=${BIGQUERY_DATASET:-},BIGQUERY_TABLE=${BIGQUERY_TABLE:-joinedData}"

printf "\nDeployment complete. Configure a Cloud Storage notification -> Pub/Sub -> Cloud Run trigger targeting /ingest.\n"
