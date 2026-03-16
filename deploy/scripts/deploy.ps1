# Automated Deployment Script for Secondhand AI Shopping Agent (PowerShell - Full Stack)

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = gcloud config get-value project
$REGION = "us-central1"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Full Stack Deployment"
Write-Host "Project ID: $PROJECT_ID"
Write-Host "===========================================" -ForegroundColor Cyan

# 1. Build and Push Backend Image
Write-Host "📦 Building backend container..." -ForegroundColor Yellow
gcloud builds submit --tag gcr.io/$PROJECT_ID/secondhand-backend ./apps/backend

# 2. Build Frontend (Expo Web)
Write-Host "📦 Building frontend (Expo Web)..." -ForegroundColor Yellow
Set-Location apps/mobile
npm install
npx expo export --platform web
Set-Location ../..

# 3. Initialize and Apply Terraform (Infrastructure)
Write-Host "🏗️ Applying infrastructure changes (Terraform)..." -ForegroundColor Yellow
Set-Location deploy/terraform
terraform init
terraform apply -auto-approve
Set-Location ../..

# 4. Deploy to Firebase (Hosting + Firestore Rules)
Write-Host "🔥 Deploying to Firebase (Hosting & Firestore)..." -ForegroundColor Yellow
firebase deploy --only "hosting,firestore"

Write-Host "===========================================" -ForegroundColor Green
Write-Host "✅ Deployment Complete!"
Write-Host "===========================================" -ForegroundColor Green
Set-Location deploy/terraform
$backend_url = terraform output -raw backend_url
Write-Host "Backend URL: $backend_url"
Write-Host "Frontend is live at: https://$PROJECT_ID.web.app"
