# ==============================================================================
# AI-Legal-App - GCP Cloud Run Unified Single-Service Deployment Script (PowerShell)
# Deploys both React Frontend and Express Backend under one Cloud Run URL
# ==============================================================================

param (
    [string]$ServiceName = "ai-legal-app-backend",
    [string]$Region = "asia-south1",
    [string]$Memory = "2Gi",
    [string]$Cpu = "2",
    [string]$Timeout = "900",
    [string]$MinInstances = "0",
    [string]$MaxInstances = "10"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Deploying AI-Legal-App (Unified Service) to Cloud Run" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Google Cloud CLI (gcloud) is not installed or not in PATH." -ForegroundColor Red
    Write-Host "   Install it from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Get current project
$currentProject = (gcloud config get-value project 2>$null).Trim()
if ([string]::IsNullOrWhiteSpace($currentProject) -or $currentProject -eq "(unset)") {
    $projectId = Read-Host "Enter your Google Cloud Project ID"
    gcloud config set project $projectId
} else {
    $projectId = $currentProject
}

Write-Host "🔹 Using Project: $projectId" -ForegroundColor Green
Write-Host "🔹 Target Service: $ServiceName" -ForegroundColor Green
Write-Host "🔹 Region: $Region" -ForegroundColor Green
Write-Host ""

# Enable required GCP APIs
Write-Host "📦 Ensuring required GCP APIs are enabled..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com --project $projectId

Write-Host ""
Write-Host "🔨 Building and deploying unified container directly from source..." -ForegroundColor Yellow
Write-Host "   (This builds the React Vite frontend and packages the Express backend)"
Write-Host ""

# Deploy to Cloud Run from root source
gcloud run deploy $ServiceName `
    --source . `
    --project $projectId `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --port 8080 `
    --cpu $Cpu `
    --memory $Memory `
    --timeout $Timeout `
    --min-instances $MinInstances `
    --max-instances $MaxInstances

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "You can now visit your single unified link printed above for" -ForegroundColor Green
Write-Host "both frontend navigation and backend API endpoints (/api/*)." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
