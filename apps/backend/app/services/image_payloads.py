from __future__ import annotations

import base64
import io

from app.models import WardrobeItem

try:
    from PIL import Image as PILImage
except Exception:  # pragma: no cover
    PILImage = None


def infer_phase_from_category(category: str, fallback: str | None = None) -> str:
    normalized = (category or "").strip().lower()
    fallback_phase = (fallback or "").strip().lower()
    if fallback_phase:
        return fallback_phase
    if normalized in {"jeans", "pants", "shorts", "skirt", "trousers", "bottoms"}:
        return "bottoms"
    if normalized in {"coat", "jacket", "blazer", "hoodie", "outerwear"}:
        return "outerwear"
    if normalized in {"dress", "suit", "formalwear", "formal"}:
        return "formalwear"
    return "tops"


def safe_inline_image_base64(image_base64: str | None, max_chars: int = 350_000) -> str | None:
    if not image_base64:
        return None
    candidate = str(image_base64).strip()
    if candidate.startswith("data:") and "," in candidate:
        candidate = candidate.split(",", 1)[1].strip()
    if not candidate or len(candidate) > max_chars:
        return None
    return candidate


def build_preview_base64(
    image_base64: str | None,
    *,
    target_max_chars: int = 280_000,
    max_side: int = 512,
) -> str | None:
    if not image_base64:
        return None
    raw = str(image_base64).strip()
    if not raw:
        return None
    if raw.startswith("data:") and "," in raw:
        raw = raw.split(",", 1)[1].strip()
    try:
        source_bytes = base64.b64decode(raw)
    except Exception:
        return None
    if not source_bytes or PILImage is None:
        return None
    try:
        with PILImage.open(io.BytesIO(source_bytes)) as img:
            img = img.convert("RGB")
            img.thumbnail((max_side, max_side))
            for quality in (84, 74, 64, 54):
                output = io.BytesIO()
                img.save(output, format="JPEG", quality=quality, optimize=True)
                encoded = base64.b64encode(output.getvalue()).decode("ascii")
                if len(encoded) <= target_max_chars:
                    return encoded
            output = io.BytesIO()
            img.save(output, format="JPEG", quality=45, optimize=True)
            return base64.b64encode(output.getvalue()).decode("ascii")
    except Exception:
        return None


def processing_placeholder_base64() -> str:
    svg = """
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" rx="40" fill="#F1E7DB"/>
      <circle cx="256" cy="212" r="120" fill="#D87C3D" fill-opacity="0.18"/>
      <path d="M180 396l42-198h68l42 198h-44l-14-68h-36l-14 68h-44zm66-106h22l-11-56-11 56z" fill="#7D4A2A"/>
      <text x="256" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#7D4A2A">Processing</text>
    </svg>
    """.strip()
    return base64.b64encode(svg.encode("utf-8")).decode("ascii")


def resolve_wardrobe_save_image_base64(
    payload_image_base64: str | None,
    args: dict[str, object],
) -> str:
    candidates = [
        payload_image_base64,
        args.get("image_base64"),
        args.get("item_snippet_base64"),
        args.get("current_frame_base64"),
        args.get("current_video_frame_base64"),
    ]
    for candidate in candidates:
        normalized = safe_inline_image_base64(str(candidate) if candidate is not None else None)
        if normalized:
            return normalized
        preview = build_preview_base64(str(candidate) if candidate is not None else None)
        if preview:
            return preview
    return processing_placeholder_base64()


def resolve_item_visual_base64(item: WardrobeItem) -> str | None:
    for candidate in ((item.image_base64 or "").strip(), (item.item_snippet_base64 or "").strip()):
        if candidate:
            return candidate
    return None
