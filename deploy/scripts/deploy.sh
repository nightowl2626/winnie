#!/bin/bash
# Automated Deployment Script for Secondhand AI Shopping Agent (Full Stack)

set -e

# Configuration
# Note: PROJECT_ID is also sourced from terraform.tfvars
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"

echo "==========================================="
echo "🚀 Starting Full Stack Deployment"
echo "Project ID: $PROJECT_ID"
echo "==========================================="

# 1. Build and Push Backend Image
echo "📦 Building backend container..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/secondhand-backend ./apps/backend

# 2. Build Frontend (Expo Web)
echo "📦 Building frontend (Expo Web)..."
cd apps/mobile
npm install
npx expo export --platform web
cd ../..

# 3. Initialize and Apply Terraform (Infrastructure)
echo "🏗️ Applying infrastructure changes (Terraform)..."
cd deploy/terraform
terraform init
terraform apply -auto-approve
cd ../..

# 4. Deploy to Firebase (Hosting + Firestore Rules)
echo "🔥 Deploying to Firebase (Hosting & Firestore)..."
firebase deploy --only hosting,firestore

echo "==========================================="
echo "✅ Deployment Complete!"
echo "==========================================="
cd deploy/terraform
terraform output backend_url
echo "Frontend is live at: https://$PROJECT_ID.web.app"
