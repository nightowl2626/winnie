from __future__ import annotations

import io
import json
import logging
import re
import base64
from functools import lru_cache
from datetime import datetime, timedelta, timezone
from typing import Any

from PIL import Image as PILImage
from PIL import ImageOps as PILImageOps

from firebase_admin import firestore as firebase_firestore
from firebase_admin import storage as firebase_storage

from app.config import Settings
from app.config import get_settings
from app.services.firebase_app import ensure_firebase_app

try:  # pragma: no cover - optional runtime dependency
    from google import genai
except Exception:  # pragma: no cover
    genai = None

logger = logging.getLogger(__name__)
UNKNOWN_VALUES = {"", "unknown", "n/a", "na", "none", "null", "unsure", "not sure"}
REQUIRED_CARD_FIELDS = ("category", "color", "material")
ALLOWED_CLOTHING_FIELDS = {
    "category",
    "color",
    "material",
    "brand",
    "condition",
    "extra_notes",
    "image_url",
}
ENHANCE_INPUT_MAX_SIDE = 1280
ENHANCE_OUTPUT_WIDTH = 768
ENHANCE_OUTPUT_HEIGHT = 1024
ENHANCE_OUTPUT_PADDING = 48


def _clean_b64(payload: str) -> str:
    cleaned = (payload or "").strip()
    for _ in range(3):
        if cleaned.startswith("data:") and "," in cleaned:
            cleaned = cleaned.split(",", 1)[1].strip()
            continue
        break
    return cleaned


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("{") and text.endswith("}"):
        return json.loads(text)

    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError("No JSON object found in model response")


def _clean_text(value: Any, *, lower: bool = False) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    if not normalized:
        return None
    compare = normalized.lower()
    if compare in UNKNOWN_VALUES:
        return None
    return compare if lower else normalized


def _normalize_missing_field(value: str) -> str:
    field = value.strip().lower()
    if field in {"type", "category"}:
        return "category"
    if field in {"colour", "color"}:
        return "color"
    if field in {"fabric", "fabric_type", "material"}:
        return "material"
    if field in {"fit", "estimated_fit"}:
        return "fit"
    return field


def _normalize_field(value: str | None, *, lower: bool = True) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    return cleaned.lower() if lower else cleaned


@lru_cache(maxsize=1)
def _wardrobe_collection():
    settings = get_settings()
    app = ensure_firebase_app(settings)
    if app is None:
        raise RuntimeError("Firebase app is not initialized")
    database_id = settings.firestore_database or "(default)"
    client = firebase_firestore.client(app=app, database_id=database_id)
    return client.collection("wardrobe")


@lru_cache(maxsize=1)
def _wardrobe_storage_bucket():
    settings = get_settings()
    app = ensure_firebase_app(settings)
    if app is None:
        raise RuntimeError("Firebase app is not initialized")
    bucket_name = settings.firebase_storage_bucket.strip()
    if not bucket_name:
        raise RuntimeError("firebase_storage_bucket is not configured")
    return firebase_storage.bucket(name=bucket_name, app=app)


def save_clothing_item(
    category: str,
    color: str,
    material: str | None = None,
    brand: str | None = None,
    condition: str | None = None,
    extra_notes: str | None = None,
    image_url: str | None = None,
) -> dict[str, Any]:
    normalized_category = _normalize_field(category, lower=True)
    normalized_color = _normalize_field(color, lower=True)
    normalized_material = _normalize_field(material, lower=True)
    if not normalized_category:
        raise ValueError("category is required")
    if not normalized_color:
        raise ValueError("color is required")
    if not normalized_material:
        raise ValueError("material is required")
    normalized_brand = _normalize_field(brand, lower=False)
    normalized_condition = _normalize_field(condition, lower=True)
    normalized_extra_notes = _normalize_field(extra_notes, lower=False)
    normalized_image_url = _normalize_field(image_url, lower=False)

    now = datetime.now(tz=timezone.utc).isoformat()
    payload: dict[str, Any] = {
        "category": normalized_category,
        "color": normalized_color,
        "material": normalized_material,
        "brand": normalized_brand,
        "condition": normalized_condition,
        "extra_notes": normalized_extra_notes,
        "image_url": normalized_image_url,
        "created_at": now,
        "updated_at": now,
    }
    doc_ref = _wardrobe_collection().document()
    doc_ref.set(payload)

    missing_optional = []
    if normalized_brand is None:
        missing_optional.append("brand")
    if normalized_extra_notes is None:
        missing_optional.append("extra_notes")

    return {
        "status": "saved",
        "item_id": doc_ref.id,
        "missing_optional": missing_optional,
    }


def get_clothing_item(item_id: str) -> dict[str, Any]:
    normalized_id = item_id.strip()
    if not normalized_id:
        raise ValueError("item_id is required")

    snapshot = _wardrobe_collection().document(normalized_id).get()
    if not snapshot.exists:
        return {"status": "not_found", "item_id": normalized_id}

    payload = snapshot.to_dict() or {}
    payload["item_id"] = snapshot.id
    return payload


def update_clothing_item(item_id: str, **fields: Any) -> dict[str, Any]:
    normalized_id = item_id.strip()
    if not normalized_id:
        raise ValueError("item_id is required")

    doc_ref = _wardrobe_collection().document(normalized_id)
    snapshot = doc_ref.get()
    if not snapshot.exists:
        return {"status": "not_found", "item_id": normalized_id}

    updates: dict[str, Any] = {}
    for key, value in fields.items():
        if key not in ALLOWED_CLOTHING_FIELDS:
            continue
        if value is None:
            continue
        if key in {"brand", "image_url", "extra_notes"}:
            normalized = _normalize_field(str(value), lower=False)
        else:
            normalized = _normalize_field(str(value), lower=True)
        if normalized is None:
            continue
        updates[key] = normalized

    if not updates:
        return {"status": "no_updates", "item_id": normalized_id}

    updates["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
    doc_ref.set(updates, merge=True)
    merged = doc_ref.get().to_dict() or {}
    merged["item_id"] = normalized_id
    merged["status"] = "updated"
    return merged


def upload_item_photo(image_base64: str, item_id: str) -> str:
    normalized_item_id = item_id.strip()
    if not normalized_item_id:
        raise ValueError("item_id is required")
    payload = _clean_b64(image_base64 or "").strip()
    if not payload:
        raise ValueError("image_base64 is required")

    image_bytes = base64.b64decode(payload)
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        extension = "png"
        content_type = "image/png"
    else:
        extension = "jpg"
        content_type = "image/jpeg"
    storage_path = f"wardrobe/{normalized_item_id}.{extension}"
    bucket = _wardrobe_storage_bucket()
    blob = bucket.blob(storage_path)
    blob.upload_from_string(image_bytes, content_type=content_type)
    blob.make_public()
    return f"https://storage.googleapis.com/{bucket.name}/{storage_path}"


class WardrobeAIService:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._client = None
        self._quota_blocked_until_by_model: dict[str, datetime] = {}
        if settings.gemini_api_key and genai is not None:
            self._client = genai.Client(api_key=settings.gemini_api_key)

    def _fallback(
        self,
        phase: str,
        note: str | None,
        feedback_override: str | None = None,
    ) -> dict[str, str]:
        normalized = phase.strip().lower()
        feedback = feedback_override or (
            f"I captured this {normalized} item. "
            "Try a clearer front view and include texture details."
        )
        return {
            "category": normalized,
            "title": f"{normalized.title()} item",
            "color": "unknown",
            "style": "unknown",
            "fabric_type": "unknown",
            "condition": "good",
            "estimated_fit": "unknown",
            "feedback": feedback,
            "note": note or "",
        }

    @staticmethod
    def _is_quota_error(error: Exception) -> bool:
        message = str(error).lower()
        return (
            "resource_exhausted" in message
            or "quota exceeded" in message
            or "rate limit" in message
            or "429" in message
        )

    @staticmethod
    def _extract_retry_seconds(error: Exception) -> int:
        message = str(error).lower()
        match = re.search(r"retry in\s+([0-9]+(?:\.[0-9]+)?)s", message)
        if not match:
            return 45
        try:
            return max(1, int(float(match.group(1))))
        except Exception:
            return 45

    def _quota_window_active(self, model: str) -> bool:
        blocked_until = self._quota_blocked_until_by_model.get(model)
        if blocked_until is None:
            return False
        return datetime.now(tz=timezone.utc) < blocked_until

    def _mark_quota_window(self, model: str, retry_seconds: int) -> None:
        self._quota_blocked_until_by_model[model] = datetime.now(tz=timezone.utc) + timedelta(
            seconds=retry_seconds
        )

    def _extract_google_image_base64(self, response: Any) -> str | None:
        def normalize_inline_data(value: Any) -> str | None:
            if value is None:
                return None
            if isinstance(value, bytes):
                return base64.b64encode(value).decode("ascii")
            if isinstance(value, str):
                cleaned = _clean_b64(value).strip()
                return cleaned or None
            try:
                raw_bytes = bytes(value)
            except Exception:
                return None
            return base64.b64encode(raw_bytes).decode("ascii")

        if hasattr(response, "parts") and response.parts:
            for part in response.parts:
                inline = getattr(part, "inline_data", None)
                if inline and getattr(inline, "data", None):
                    normalized = normalize_inline_data(inline.data)
                    if normalized:
                        return normalized
        candidates = getattr(response, "candidates", None) or []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            parts = getattr(content, "parts", None) or []
            for part in parts:
                inline = getattr(part, "inline_data", None)
                if inline and getattr(inline, "data", None):
                    normalized = normalize_inline_data(inline.data)
                    if normalized:
                        return normalized
        return None

    @staticmethod
    def _normalize_enhance_input(
        image_base64: str,
        mime_type: str,
        *,
        max_side: int = ENHANCE_INPUT_MAX_SIDE,
    ) -> tuple[str, str]:
        cleaned = _clean_b64(image_base64)
        normalized_mime = (mime_type or "image/jpeg").strip().lower() or "image/jpeg"
        if not cleaned:
            return "", normalized_mime
        try:
            source_bytes = base64.b64decode(cleaned)
            with PILImage.open(io.BytesIO(source_bytes)) as img:
                img = PILImageOps.exif_transpose(img)
                has_alpha = "A" in img.getbands()
                working = img.convert("RGBA" if has_alpha else "RGB")
                if max(working.size) > max_side:
                    working.thumbnail((max_side, max_side), PILImage.Resampling.LANCZOS)
                output = io.BytesIO()
                if has_alpha:
                    working.save(output, format="PNG", optimize=True)
                    return base64.b64encode(output.getvalue()).decode("ascii"), "image/png"
                working.save(output, format="JPEG", quality=90, optimize=True)
                return base64.b64encode(output.getvalue()).decode("ascii"), "image/jpeg"
        except Exception:
            return cleaned, normalized_mime

    @staticmethod
    def _normalize_enhanced_output(
        image_base64: str,
        *,
        width: int = ENHANCE_OUTPUT_WIDTH,
        height: int = ENHANCE_OUTPUT_HEIGHT,
        padding: int = ENHANCE_OUTPUT_PADDING,
    ) -> str:
        cleaned = _clean_b64(image_base64)
        if not cleaned:
            return ""
        try:
            source_bytes = base64.b64decode(cleaned)
            with PILImage.open(io.BytesIO(source_bytes)) as img:
                img = PILImageOps.exif_transpose(img).convert("RGBA")
                inner_width = max(1, width - padding * 2)
                inner_height = max(1, height - padding * 2)
                working = img.copy()
                working.thumbnail((inner_width, inner_height), PILImage.Resampling.LANCZOS)
                canvas = PILImage.new("RGBA", (width, height), (255, 255, 255, 255))
                offset_x = max(0, (width - working.width) // 2)
                offset_y = max(0, (height - working.height) // 2)
                canvas.alpha_composite(working, (offset_x, offset_y))
                flattened = canvas.convert("RGB")
                output = io.BytesIO()
                flattened.save(output, format="JPEG", quality=92, optimize=True)
                return base64.b64encode(output.getvalue()).decode("ascii")
        except Exception:
            return cleaned

    def _generate_image_via_google(
        self,
        *,
        model: str,
        prompt: str,
        image_inputs: list[dict[str, str]],
        operation_tag: str,
    ) -> dict[str, Any]:
        if self._client is None:
            return {"generated": False, "error": "Gemini client not initialized"}

        if self._quota_window_active(model):
            logger.info("[%s] quota window active for model=%s; attempting request anyway", operation_tag, model)

        content_parts: list[dict[str, Any]] = [{"text": prompt}]
        for image in image_inputs:
            mime_type = (image.get("mime_type") or "image/jpeg").strip().lower()
            base64_data = _clean_b64(image.get("data", ""))
            if not base64_data:
                continue
            content_parts.append(
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": base64_data,
                    }
                }
            )
        if len(content_parts) < 2:
            return {"generated": False, "error": "No valid images were provided"}

        logger.info(
            "[%s] start provider=google model=%s images=%s",
            operation_tag,
            model,
            len(content_parts) - 1,
        )
        try:
            from google.genai import types as genai_types

            response = self._client.models.generate_content(
                model=model,
                contents=[
                    {
                        "role": "user",
                        "parts": content_parts,
                    }
                ],
                config=genai_types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                ),
            )
        except Exception as error:
            if self._is_quota_error(error):
                retry_seconds = self._extract_retry_seconds(error)
                self._mark_quota_window(model, retry_seconds)
                logger.warning(
                    "[%s] Gemini quota exhausted model=%s; retry in %ss.",
                    operation_tag,
                    model,
                    retry_seconds,
                )
                return {"generated": False, "error": "Gemini quota exhausted"}
            logger.exception("[%s] Gemini request failed.", operation_tag)
            return {"generated": False, "error": f"API call failed: {error}"}

        image_b64 = self._extract_google_image_base64(response)
        if not image_b64:
            logger.warning("[%s] no image parts returned by model", operation_tag)
            return {"generated": False, "error": "No image in API response"}

        logger.info(
            "[%s] success provider=google model=%s output_bytes=%s",
            operation_tag,
            model,
            len(image_b64),
        )
        return {"generated": True, "image_base64": image_b64}

    def generate_virtual_try_on(
        self,
        *,
        person_image_base64: str,
        garment_images_base64: list[str],
        style_note: str | None = None,
        mime_type: str = "image/jpeg",
    ) -> dict[str, Any]:
        person = _clean_b64(person_image_base64)
        garments = [_clean_b64(image) for image in garment_images_base64]
        garments = [image for image in garments if image]

        if not person:
            return {"generated": False, "error": "Person image is required"}
        if not garments:
            return {"generated": False, "error": "At least one garment image is required"}

        style_hint = _clean_text(style_note, lower=False)
        prompt = self.TRY_ON_PROMPT_BASE
        if style_hint:
            prompt += f" Style preference: {style_hint}"

        images = [{"mime_type": mime_type, "data": person}]
        for garment in garments[:6]:
            images.append({"mime_type": mime_type, "data": garment})
        return self._generate_image_via_google(
            model=self._settings.gemini_tryon_model,
            prompt=prompt,
            image_inputs=images,
            operation_tag="tryon-core",
        )

    def analyze_frame(
        self,
        *,
        phase: str,
        image_base64: str,
        mime_type: str,
        note: str | None,
    ) -> dict[str, str]:
        if self._client is None:
            return self._fallback(phase, note)
        model = self._settings.gemini_model
        if self._quota_window_active(model):
            return self._fallback(
                phase,
                note,
                feedback_override=(
                    "AI quota is temporarily limited. "
                    "I still saved this garment and will resume richer analysis shortly."
                ),
            )

        prompt = (
            "You are a live wardrobe scanning assistant. "
            "Analyze one garment image and return strict JSON with keys: "
            "category,title,color,style,fabric_type,condition,estimated_fit,feedback. "
            "Keep feedback to one concise coaching sentence."
        )
        if note:
            prompt += f" User note: {note}"

        try:
            response = self._client.models.generate_content(
                model=model,
                contents=[
                    {
                        "role": "user",
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": _clean_b64(image_base64),
                                }
                            },
                        ],
                    }
                ],
            )
        except Exception as error:
            if self._is_quota_error(error):
                retry_seconds = self._extract_retry_seconds(error)
                self._mark_quota_window(model, retry_seconds)
                logger.warning(
                    "Gemini quota exhausted for wardrobe scan model=%s; using fallback for %ss.",
                    model,
                    retry_seconds,
                )
                return self._fallback(
                    phase,
                    note,
                    feedback_override=(
                        "Gemini quota is exhausted right now. "
                        "I still saved this garment and will continue in fallback mode for a moment."
                    ),
                )
            logger.exception("Wardrobe AI request failed; using fallback.")
            return self._fallback(phase, note)

        response_text = getattr(response, "text", "") or ""
        try:
            parsed = _extract_json(response_text)
        except Exception:
            return self._fallback(phase, note)

        normalized_phase = phase.strip().lower()
        category = str(parsed.get("category", "")).strip().lower() or normalized_phase
        return {
            "category": category,
            "title": str(parsed.get("title", "")).strip() or f"{category.title()} item",
            "color": str(parsed.get("color", "")).strip().lower() or "unknown",
            "style": str(parsed.get("style", "")).strip().lower() or "unknown",
            "fabric_type": str(parsed.get("fabric_type", "")).strip().lower() or "unknown",
            "condition": str(parsed.get("condition", "")).strip().lower() or "good",
            "estimated_fit": str(parsed.get("estimated_fit", "")).strip().lower() or "unknown",
            "feedback": str(parsed.get("feedback", "")).strip()
            or f"Captured one {category} item.",
            "note": note or "",
        }

    def _build_card_result(
        self,
        *,
        phase: str,
        draft: dict[str, Any],
        is_clothing: bool,
        feedback: str | None = None,
        question_for_user: str | None = None,
        ready_for_next_item: bool | None = None,
    ) -> dict[str, Any]:
        normalized_phase = phase.strip().lower()
        normalized_draft = {
            "phase": normalized_phase,
            "category": _clean_text(draft.get("category"), lower=True),
            "title": _clean_text(draft.get("title"), lower=False),
            "color": _clean_text(draft.get("color"), lower=True),
            "material": _clean_text(draft.get("material"), lower=True),
            "style": _clean_text(draft.get("style"), lower=True),
            "fit": _clean_text(draft.get("fit"), lower=True),
            "condition": _clean_text(draft.get("condition"), lower=True),
            "note": _clean_text(draft.get("note"), lower=False),
        }
        if not normalized_draft["title"] and normalized_draft["category"]:
            normalized_draft["title"] = f"{normalized_draft['category'].title()} item"

        missing_fields = [
            field
            for field in REQUIRED_CARD_FIELDS
            if not normalized_draft.get(field)
        ]
        ready = bool(is_clothing and not missing_fields)
        if ready_for_next_item is not None:
            ready = bool(ready_for_next_item and is_clothing and not missing_fields)

        if not is_clothing:
            missing_fields = ["clothing_item"]

        default_feedback = (
            "I only capture clothing items. Please show one garment clearly."
            if not is_clothing
            else (
                "Great, this item card is complete. We can scan the next garment."
                if ready
                else "I captured this garment and still need a few details."
            )
        )
        default_question = (
            "Please center one clothing item in the camera view."
            if not is_clothing
            else (
                "Great, we can move to the next garment."
                if ready
                else f"Please confirm: {', '.join(missing_fields)}."
            )
        )

        return {
            "is_clothing": is_clothing,
            "ready_for_next_item": ready,
            "draft": normalized_draft,
            "missing_fields": missing_fields,
            "question_for_user": _clean_text(question_for_user, lower=False) or default_question,
            "feedback": _clean_text(feedback, lower=False) or default_feedback,
        }

    def extract_card(
        self,
        *,
        phase: str,
        image_base64: str,
        mime_type: str,
        note: str | None,
        current_draft: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        draft = dict(current_draft or {})
        draft["phase"] = phase.strip().lower()
        if note and not draft.get("note"):
            draft["note"] = note

        if self._client is None:
            return self._build_card_result(
                phase=phase,
                draft=draft,
                is_clothing=True,
                feedback="AI extractor is unavailable; keeping card draft open.",
            )
        model = self._settings.gemini_model
        if self._quota_window_active(model):
            return self._build_card_result(
                phase=phase,
                draft=draft,
                is_clothing=True,
                feedback=(
                    "AI quota is temporarily limited. Keep scanning and I will fill the card as soon as quota resets."
                ),
            )

        prompt = (
            "You are a structured wardrobe item card extractor. "
            "Return ONLY strict JSON (no markdown) with keys: "
            "is_clothing,category,title,color,material,style,fit,note,feedback,question_for_user,ready_for_next_item,missing_fields. "
            "Rules: "
            "1) Keep clothing items only. If the frame is not a clothing item, set is_clothing=false. "
            "2) Do not invent unknown fields: use null when uncertain. "
            "3) Use lowercase short values for category,color,material,style,fit. "
            "4) ready_for_next_item=true only when category,color,material are known. "
            "5) question_for_user should ask for one missing required detail only. "
            "6) Do not ask for condition or extra notes. Only include note if user volunteers it. "
            f"Current phase: {phase.strip().lower()}. "
            f"Current draft: {json.dumps(draft)}. "
        )
        if note:
            prompt += f"User note: {note}"

        try:
            response = self._client.models.generate_content(
                model=model,
                contents=[
                    {
                        "role": "user",
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": _clean_b64(image_base64),
                                }
                            },
                        ],
                    }
                ],
            )
        except Exception as error:
            if self._is_quota_error(error):
                retry_seconds = self._extract_retry_seconds(error)
                self._mark_quota_window(model, retry_seconds)
                logger.warning(
                    "Gemini quota exhausted for wardrobe card extraction model=%s; using fallback for %ss.",
                    model,
                    retry_seconds,
                )
                return self._build_card_result(
                    phase=phase,
                    draft=draft,
                    is_clothing=True,
                    feedback=(
                        "Gemini quota is exhausted right now. Keep scanning; I will continue filling card fields in fallback mode."
                    ),
                )
            logger.exception("Wardrobe card extraction failed; using fallback.")
            return self._build_card_result(
                phase=phase,
                draft=draft,
                is_clothing=True,
                feedback="Card extraction failed once. Keep the garment centered and continue.",
            )

        response_text = getattr(response, "text", "") or ""
        try:
            parsed = _extract_json(response_text)
        except Exception:
            return self._build_card_result(
                phase=phase,
                draft=draft,
                is_clothing=True,
                feedback="Could not parse extractor output. Keep scanning this garment.",
            )

        merged = dict(draft)
        merged["category"] = _clean_text(
            parsed.get("category") or parsed.get("type") or merged.get("category"),
            lower=True,
        )
        merged["title"] = _clean_text(parsed.get("title") or merged.get("title"), lower=False)
        merged["color"] = _clean_text(parsed.get("color") or merged.get("color"), lower=True)
        merged["material"] = _clean_text(
            parsed.get("material")
            or parsed.get("fabric")
            or parsed.get("fabric_type")
            or merged.get("material"),
            lower=True,
        )
        merged["style"] = _clean_text(parsed.get("style") or merged.get("style"), lower=True)
        merged["fit"] = _clean_text(
            parsed.get("fit") or parsed.get("estimated_fit") or merged.get("fit"),
            lower=True,
        )
        merged["condition"] = _clean_text(
            parsed.get("condition") or merged.get("condition"),
            lower=True,
        )
        merged["note"] = _clean_text(parsed.get("note") or merged.get("note") or note, lower=False)

        is_clothing = bool(parsed.get("is_clothing", True))
        parsed_missing = parsed.get("missing_fields")
        missing_fields: list[str] = []
        if isinstance(parsed_missing, list):
            for field in parsed_missing:
                if not isinstance(field, str):
                    continue
                normalized = _normalize_missing_field(field)
                if normalized and normalized not in missing_fields:
                    missing_fields.append(normalized)

        result = self._build_card_result(
            phase=phase,
            draft=merged,
            is_clothing=is_clothing,
            feedback=_clean_text(parsed.get("feedback"), lower=False),
            question_for_user=_clean_text(parsed.get("question_for_user"), lower=False),
            ready_for_next_item=bool(parsed.get("ready_for_next_item", False)),
        )
        if missing_fields and is_clothing:
            result["missing_fields"] = missing_fields
            result["ready_for_next_item"] = not missing_fields
        return result

    ENHANCE_PROMPT = (
        "Edit this clothing photo into a clean product-style image. "
        "Keep exactly one garment, centered, fully visible from edge to edge with no cropping. "
        "Remove all background clutter, people, hands, and non-garment objects. "
        "Preserve true garment color, texture, logo details, and seams. "
        "Output PNG with a white background, not a colored backdrop."
    )
    TRY_ON_PROMPT_BASE = (
        "You are a fashion try-on editor. "
        "The first image is the person. The remaining images are clothing pieces to wear. "
        "Generate one realistic photo of the same person wearing all provided garments together. "
        "Keep the person's identity, face, body proportions, and pose. "
        "Do not change the person's face or surroundings. Keep everything on the photo the same except add the garments onto the person. "
        "Use accurate garment colors, textures, logos, and silhouettes from the garment photos. "
        "Do not add or remove garments beyond the provided items. "
        "Keep background clean and non-distracting. "
        "Output one high-quality image."
    )

    @staticmethod
    def _chroma_key_green_to_alpha(image_bytes: bytes) -> bytes:
        """Replace bright-green pixels with transparent alpha."""
        img = PILImage.open(io.BytesIO(image_bytes)).convert("RGBA")
        pixels = img.load()
        width, height = img.size
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                if g > 180 and r < 100 and b < 100:
                    pixels[x, y] = (0, 0, 0, 0)
        output = io.BytesIO()
        img.save(output, format="PNG")
        return output.getvalue()

    @staticmethod
    def _has_alpha_transparency(image_bytes: bytes) -> bool:
        img = PILImage.open(io.BytesIO(image_bytes)).convert("RGBA")
        alpha_min, _ = img.getchannel("A").getextrema()
        return alpha_min < 255

    def enhance_snippet(
        self,
        *,
        image_base64: str,
        mime_type: str = "image/jpeg",
    ) -> dict[str, Any]:
        """Send a garment snippet to Gemini for enhancement.

        Returns {"enhanced": True, "image_base64": "<png_b64>"} on success,
        or {"enhanced": False, "error": "..."} on failure.
        """
        cleaned = _clean_b64(image_base64)
        if not cleaned:
            return {"enhanced": False, "error": "Empty image payload"}

        if self._client is None:
            return {"enhanced": False, "error": "Gemini client not initialized"}

        cleaned, mime_type = self._normalize_enhance_input(cleaned, mime_type)
        model = self._settings.gemini_enhance_model
        enhancement = self._generate_image_via_google(
            model=model,
            prompt=self.ENHANCE_PROMPT,
            image_inputs=[{"mime_type": mime_type, "data": cleaned}],
            operation_tag="enhance-core",
        )
        if not enhancement.get("generated"):
            return {"enhanced": False, "error": str(enhancement.get("error") or "API call failed")}
        enhanced_b64 = str(enhancement.get("image_base64") or "").strip()
        if not enhanced_b64:
            logger.warning("[enhance-core] no image parts returned by model")
            return {"enhanced": False, "error": "No image in API response"}

        try:
            raw_bytes = base64.b64decode(enhanced_b64)
            if self._has_alpha_transparency(raw_bytes):
                png_bytes = raw_bytes
            else:
                png_bytes = self._chroma_key_green_to_alpha(raw_bytes)
            final_b64 = self._normalize_enhanced_output(base64.b64encode(png_bytes).decode("ascii"))
            logger.info("[enhance-core] success provider=google model=%s output_bytes=%s", model, len(final_b64))
            return {"enhanced": True, "image_base64": final_b64}
        except Exception:
            logger.exception("Chroma-key post-processing failed; returning raw enhanced image.")
            return {"enhanced": True, "image_base64": self._normalize_enhanced_output(enhanced_b64)}
