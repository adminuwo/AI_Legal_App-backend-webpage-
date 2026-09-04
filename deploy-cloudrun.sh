#!/usr/bin/env bash
# ==============================================================================
# AI-Legal-App - GCP Cloud Run Unified Single-Service Deployment Script
# Deploys both React Frontend and Express Backend under one Cloud Run URL
# ==============================================================================

set -e

# Default Configurations
SERVICE_NAME=${SERVICE_NAME:-"ai-legal-app-backend"}
REGION=${REGION:-"asia-south1"}
MEMORY=${MEMORY:-"2Gi"}
CPU=${CPU:-"2"}
TIMEOUT=${TIMEOUT:-"900"}
MIN_INSTANCES=${MIN_INSTANCES:-"0"}
MAX_INSTANCES=${MAX_INSTANCES:-"10"}

echo "=========================================================="
echo "🚀 Deploying AI-Legal-App (Unified Service) to Cloud Run"
echo "=========================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: Google Cloud CLI (gcloud) is not installed or not in PATH."
    echo "   Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get current project ID
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$CURRENT_PROJECT" ] || [ "$CURRENT_PROJECT" = "(unset)" ]; then
    read -p "Enter your Google Cloud Project ID: " PROJECT_ID
    gcloud config set project "$PROJECT_ID"
else
    PROJECT_ID="$CURRENT_PROJECT"
fi

echo "🔹 Using Project: $PROJECT_ID"
echo "🔹 Target Service: $SERVICE_NAME"
echo "🔹 Region: $REGION"
echo ""

# Enable required GCP APIs
echo "📦 Ensuring required GCP APIs are enabled..."
gcloud services enable run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    --project="$PROJECT_ID"

echo ""
echo "🔨 Building and deploying unified container directly from source..."
echo "   (This builds the React Vite frontend and packages the Express backend)"
echo ""

# Run single-command Cloud Run deployment from root source
gcloud run deploy "$SERVICE_NAME" \
    --source . \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --cpu "$CPU" \
    --memory "$MEMORY" \
    --timeout "$TIMEOUT" \
    --min-instances "$MIN_INSTANCES" \
    --max-instances "$MAX_INSTANCES"

echo ""
echo "=========================================================="
echo "✅ Deployment complete!"
echo "You can now visit your single unified link printed above for"
echo "both frontend navigation and backend API endpoints (/api/*)."
echo "=========================================================="
