# Terraform Configuration for Secondhand AI Shopping Agent

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required services
resource "google_project_service" "services" {
  for_each = toset([
    "run.googleapis.com",
    "firestore.googleapis.com",
    "cloudbuild.googleapis.com",
    "iam.googleapis.com",
    "aiplatform.googleapis.com"
  ])
  service            = each.key
  disable_on_destroy = false
}

# Cloud Run service for the Backend
resource "google_cloud_run_v2_service" "backend" {
  name     = "secondhand-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "gcr.io/${var.project_id}/secondhand-backend:latest"
      
      env {
        name  = "APP_ENV"
        value = "production"
      }
      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GEMINI_API_KEY"
        value = var.gemini_api_key
      }
      env {
        name  = "GOOGLE_PLACES_API_KEY"
        value = var.google_places_api_key
      }
      env {
        name  = "GOOGLE_MAPS_API_KEY"
        value = var.google_maps_api_key
      }
      env {
        name  = "FIREBASE_CREDENTIALS_JSON"
        value = var.firebase_credentials_json
      }
      env {
        name  = "CORS_ALLOW_ORIGINS"
        value = "https://${var.project_id}.web.app,https://${var.project_id}.firebaseapp.com"
      }
      env {
        name  = "USE_IN_MEMORY_STORE"
        value = "false"
      }
    }
  }

  depends_on = [google_project_service.services]
}

# Allow unauthenticated access to the backend (MVP only)
resource "google_cloud_run_v2_service_iam_member" "noauth" {
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

