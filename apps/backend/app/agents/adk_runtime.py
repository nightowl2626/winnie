from __future__ import annotations

from app.config import Settings
from app.models import WishlistItemInput

try:  # pragma: no cover - optional runtime dependency
    import google.adk as _adk  # type: ignore
except Exception:  # pragma: no cover - optional runtime dependency
    _adk = None


class AgentRuntime:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.adk_available = _adk is not None

    def summarize_wardrobe_scan(self, frame_notes: list[str]) -> dict:
        if not frame_notes:
            return {"summary": "No wardrobe frames provided.", "gaps": []}

        categories = {
            "outerwear": 0,
            "tops": 0,
            "bottoms": 0,
            "formalwear": 0,
        }
        for note in frame_notes:
            lowered = note.lower()
            if any(token in lowered for token in ["jacket", "coat", "blazer"]):
                categories["outerwear"] += 1
            if any(token in lowered for token in ["shirt", "top", "tee", "sweater"]):
                categories["tops"] += 1
            if any(token in lowered for token in ["jean", "pant", "skirt", "trouser"]):
                categories["bottoms"] += 1
            if any(token in lowered for token in ["dress", "suit", "formal"]):
                categories["formalwear"] += 1

        gaps = [name for name, count in categories.items() if count == 0]
        summary = (
            "Wardrobe scan analyzed. "
            f"Detected distribution: {categories}. "
            f"Potential gaps: {gaps if gaps else 'none'}."
        )
        return {"summary": summary, "gaps": gaps}

    def generate_wishlist_from_gap_names(self, gaps: list[str]) -> list[WishlistItemInput]:
        supported_categories = {
            "outerwear",
            "tops",
            "bottoms",
            "formalwear",
        }
        derived: list[WishlistItemInput] = []
        seen: set[str] = set()
        for gap in gaps:
            normalized = gap.strip().lower()
            if normalized in seen or normalized not in supported_categories:
                continue
            seen.add(normalized)
            derived.append(
                WishlistItemInput(
                    category=normalized,
                    notes="Auto-generated from wardrobe gap analysis",
                )
            )
        return derived
