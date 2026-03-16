import os
import re
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "secondhand-agent-backend"
    api_port: int = 8080

    gcp_project_id: str = ""
    google_cloud_project: str = ""
    firestore_database: str = "(default)"
    use_in_memory_store: bool = True
    google_application_credentials: str = ""

    firebase_credentials_json: str = ""
    firebase_storage_bucket: str = ""
    fcm_enabled: bool = False
    require_auth: bool = False

    gemini_model: str = "gemini-2.5-pro"
    gemini_enhance_model: str = "gemini-2.5-flash-image"
    gemini_tryon_model: str = "gemini-3.1-flash-image-preview"
    gemini_live_model: str = "gemini-2.5-flash-native-audio-preview-12-2025"
    gemini_api_key: str = ""
    google_maps_api_key: str = ""
    google_places_api_key: str = ""
    admin_user_ids: str = ""
    shop_nearby_max_results: int = 60
    shop_directory_enrichment_batch_size: int = 3
    shop_directory_enrichment_batch_delay_seconds: float = 1.0
    cors_allow_origins: str = "http://localhost:19006,http://localhost:8081,http://localhost:8082,http://127.0.0.1:19006,http://127.0.0.1:8081,http://127.0.0.1:8082"
    cors_allow_credentials: bool = True
    cors_allow_methods: str = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    cors_allow_headers: str = "*"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @staticmethod
    def _split_csv(value: str) -> list[str]:
        return [item.strip() for item in value.split(",") if item.strip()]

    @property
    def cors_origins_list(self) -> list[str]:
        return self._split_csv(self.cors_allow_origins)

    @property
    def cors_methods_list(self) -> list[str]:
        return self._split_csv(self.cors_allow_methods)

    @property
    def cors_headers_list(self) -> list[str]:
        if self.cors_allow_headers.strip() == "*":
            return ["*"]
        return self._split_csv(self.cors_allow_headers)

    @property
    def admin_user_ids_list(self) -> list[str]:
        return self._split_csv(self.admin_user_ids)

    @staticmethod
    def _normalize_credential_path(value: str | None) -> str:
        candidate = (value or "").strip()
        if not candidate:
            return ""
        candidate = candidate.replace("\r", "").replace("\n", "").replace("\t", "")
        candidate = re.sub(r"^([A-Za-z]:)\s+\\", r"\1\\", candidate)
        return candidate.strip()

    @staticmethod
    def _normalize_project_identifier(value: str | None) -> str:
        candidate = (value or "").strip()
        if not candidate:
            return ""
        candidate = re.sub(r"\s+", "", candidate)
        return candidate

    @staticmethod
    def _normalize_firestore_database(value: str | None) -> str:
        candidate = (value or "").strip()
        if not candidate:
            return "(default)"
        return re.sub(r"\s+", "", candidate)

    @property
    def firestore_project_id(self) -> str:
        direct = self._normalize_project_identifier(self.gcp_project_id)
        if direct:
            return direct
        return self._normalize_project_identifier(self.google_cloud_project)

    @property
    def firestore_database_name(self) -> str:
        return self._normalize_firestore_database(self.firestore_database)

    @property
    def firestore_credentials_path(self) -> str:
        direct = self._normalize_credential_path(self.google_application_credentials)
        if direct:
            return direct
        return self._normalize_credential_path(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))

    def apply_runtime_environment(self) -> None:
        credentials_path = self.firestore_credentials_path
        if credentials_path:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
        project_id = self.firestore_project_id
        if project_id:
            os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
            os.environ["GCP_PROJECT_ID"] = project_id
            os.environ["GCLOUD_PROJECT"] = project_id


@lru_cache
def get_settings() -> Settings:
    return Settings()
