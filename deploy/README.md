# Cloud Deployment Automation (Full Stack)

This directory contains the infrastructure-as-code (IaC) and automation scripts required to deploy **Winnie** (both backend and frontend) to Google Cloud.

## Prerequisites

1.  **Google Cloud SDK:** Installed and authenticated (`gcloud auth login`).
2.  **Terraform:** Installed on your machine.
3.  **Firebase CLI:** Installed and logged in (`firebase login`).
4.  **Node.js & npm:** Required to build the Expo frontend.
5.  **A GCP Project:** Created and selected (`gcloud config set project <your-project-id>`).

## Architecture

*   **Cloud Run (Backend):** Hosts the FastAPI backend as a containerized service.
*   **Firebase Hosting (Frontend):** Serves the Expo-built Web application.
*   **Firestore:** NoSQL database for wardrobe, wishlist, and logs.
*   **Cloud Build:** Automates the building of Docker images.

## One-Click Deployment

We provide a single script that automates the entire process: building the backend, building the frontend web app, provisioning infrastructure, and deploying database rules.

### On Linux/macOS:
```bash
chmod +x deploy/scripts/deploy.sh
./deploy/scripts/deploy.sh
```

### On Windows (PowerShell):
```powershell
./deploy/scripts/deploy.ps1
```

## Local Configuration

The deployment uses a `terraform.tfvars` file located in `deploy/terraform/`. This file contains your specific project settings:

```hcl
project_id     = "your-gcp-project-id"
project_number = "your-project-number"
region         = "us-central1"
```

*Note: This file is excluded from git for security.*

## Manual Infrastructure Management

If you wish to manage the infrastructure manually using Terraform:

1.  Navigate to the terraform directory: `cd deploy/terraform`
2.  Initialize: `terraform init`
3.  Apply: `terraform apply`

## Build Outputs

*   **Backend:** `https://secondhand-backend-xxx-uc.a.run.app`
*   **Frontend:** `https://<your-project-id>.web.app`
