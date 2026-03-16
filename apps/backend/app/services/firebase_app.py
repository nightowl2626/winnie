from __future__ import annotations

import json
import logging

import firebase_admin
from firebase_admin import credentials

from app.config import Settings

logger = logging.getLogger(__name__)


def ensure_firebase_app(settings: Settings):
    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    try:
        settings.apply_runtime_environment()
        options: dict[str, str] = {}
        if settings.firestore_project_id:
            options["projectId"] = settings.firestore_project_id
        if settings.firebase_storage_bucket:
            options["storageBucket"] = settings.firebase_storage_bucket.strip()
        if settings.firebase_credentials_json:
            cred_info = json.loads(settings.firebase_credentials_json)
            cred = credentials.Certificate(cred_info)
            return firebase_admin.initialize_app(cred, options=options or None)
        return firebase_admin.initialize_app(options=options or None)
    except Exception as exc:  # pragma: no cover - runtime environment dependent
        logger.warning("Firebase app initialization failed: %s", exc)
        return None
