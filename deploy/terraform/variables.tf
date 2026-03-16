variable "project_id" {
  description = "The GCP Project ID"
  type        = string
}

variable "project_number" {
  description = "The GCP Project Number"
  type        = string
  default     = ""
}

variable "region" {
  description = "The region to deploy to"
  type        = string
  default     = "us-central1"
}

variable "gemini_api_key" {
  description = "Gemini API Key"
  type        = string
  sensitive   = true
}

variable "google_places_api_key" {
  description = "Google Places API Key"
  type        = string
  sensitive   = true
}

variable "google_maps_api_key" {
  description = "Google Maps API Key"
  type        = string
  sensitive   = true
}

variable "firebase_credentials_json" {
  description = "Firebase Service Account JSON"
  type        = string
  default     = ""
  sensitive   = true
}
