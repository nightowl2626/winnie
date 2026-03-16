from __future__ import annotations

import json
import re
from typing import Any


def normalize_text(value: Any) -> str:
    return str(value or "").strip().lower()


def safe_json_extract(text: str) -> dict[str, Any] | list[Any] | None:
    raw = (text or "").strip()
    if not raw:
        return None
    if (raw.startswith("{") and raw.endswith("}")) or (raw.startswith("[") and raw.endswith("]")):
        try:
            return json.loads(raw)
        except Exception:
            return None
    match = re.search(r"(\{.*\}|\[.*\])", raw, flags=re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except Exception:
        return None


def safe_json_object(text: str) -> dict[str, Any] | None:
    parsed = safe_json_extract(text)
    return parsed if isinstance(parsed, dict) else None
