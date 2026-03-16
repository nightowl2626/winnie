from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from app.config import Settings
from app.models import (
    MarketplaceListing,
    StyleIntentLog,
    WardrobeCostPerWearLeader,
    WardrobeItem,
    WardrobeStats,
    WardrobeStatsColorShare,
    WishlistItem,
    WishlistItemInput,
)
from app.services.text_utils import safe_json_extract

try:  # pragma: no cover - optional runtime dependency behavior
    from google import genai
except Exception:  # pragma: no cover
    genai = None

logger = logging.getLogger(__name__)


def _parse_iso_datetime(value: str | None) -> datetime | None:
    raw = (value or "").strip()
    if not raw:
        return None
    try:
        normalized = raw.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        return None


def _iso_today() -> str:
    return datetime.now(tz=timezone.utc).date().isoformat()


def _clean_b64(value: str | None) -> str:
    raw = (value or "").strip()
    if raw.startswith("data:") and "," in raw:
        return raw.split(",", 1)[1].strip()
    return raw


def _safe_price(value: Any, fallback: float) -> float:
    try:
        parsed = float(value)
    except Exception:
        parsed = fallback
    parsed = max(4.0, min(parsed, 1500.0))
    return round(parsed, 2)


def _normalize_category(value: str) -> str:
    normalized = value.strip().lower()
    synonyms = {
        "top": "tops",
        "shirt": "tops",
        "sweater": "tops",
        "bottom": "bottoms",
        "pants": "bottoms",
        "trousers": "bottoms",
        "jeans": "bottoms",
        "coat": "outerwear",
        "jacket": "outerwear",
        "blazer": "outerwear",
        "formal": "formalwear",
        "suit": "formalwear",
        "dress": "formalwear",
    }
    return synonyms.get(normalized, normalized)


def _consecutive_day_streak(dates: set[datetime.date]) -> int:
    if not dates:
        return 0
    ordered = sorted(dates, reverse=True)
    streak = 1
    previous = ordered[0]
    for current in ordered[1:]:
        if (previous - current).days != 1:
            break
        streak += 1
        previous = current
    return streak


class WardrobeOptimizerService:
    """Sequential optimizer pipeline:
    1) Auditor: flag stale items for donation
    2) Gap analyst: infer wardrobe gaps from style intents + closet summary
    3) Shopper: convert gaps to wishlist candidates
    """

    def __init__(self, settings: Settings, gateway: Any):
        self._settings = settings
        self._gateway = gateway
        self._client = None
        if settings.gemini_api_key and genai is not None:
            self._client = genai.Client(api_key=settings.gemini_api_key)

    def _run_auditor(self, user_id: str, wardrobe_items: list[WardrobeItem]) -> list[str]:
        now = datetime.now(tz=timezone.utc)
        stale_after = timedelta(days=120)
        grace_period = timedelta(days=60)
        flagged_ids: list[str] = []

        for item in wardrobe_items:
            created_at = _parse_iso_datetime(item.created_at)
            if created_at is None:
                continue
            if now - created_at < grace_period:
                continue

            last_worn = _parse_iso_datetime(item.last_worn_date)
            reference = last_worn or created_at
            is_stale = (now - reference) >= stale_after and int(item.wear_count or 0) <= 1
            if not is_stale:
                continue

            flagged_ids.append(item.id)
            if item.flagged_for_donation:
                continue
            from app.models import WardrobeItemUpdate  # local import to avoid cycles

            self._gateway.update_wardrobe_item(
                user_id,
                item.id,
                WardrobeItemUpdate(flagged_for_donation=True),
            )

        deduped = sorted(set(flagged_ids))
        return deduped

    @staticmethod
    def _fallback_listing_price(item: WardrobeItem) -> float:
        category = _normalize_category(item.category or "")
        base_by_category = {
            "outerwear": 42.0,
            "formalwear": 55.0,
            "tops": 20.0,
            "bottoms": 28.0,
            "shoes": 36.0,
        }
        condition = (item.condition or "").strip().lower()
        factor_by_condition = {
            "new": 1.25,
            "like new": 1.15,
            "excellent": 1.12,
            "good": 1.0,
            "fair": 0.82,
            "worn": 0.7,
        }
        base = base_by_category.get(category, 24.0)
        factor = factor_by_condition.get(condition, 1.0)
        brand_hint = (item.note or "").lower()
        if "vintage" in brand_hint:
            factor *= 1.1
        return _safe_price(base * factor, base)

    @staticmethod
    def _build_listing_fallback(item: WardrobeItem, suggested_price: float) -> MarketplaceListing:
        category = (item.category or "item").strip().lower()
        color = (item.color or "").strip().lower()
        style = (item.style or "").strip().lower()
        fabric = (item.fabric_type or "").strip().lower()
        condition = (item.condition or "good").strip().lower()

        title_parts = []
        if color:
            title_parts.append(color.title())
        if style:
            title_parts.append(style.title())
        title_parts.append(category.title())
        title = " ".join(title_parts)[:80].strip() or f"{category.title()} - Great Condition"

        details = [
            f"Category: {category}.",
            f"Condition: {condition}.",
        ]
        if color:
            details.append(f"Color: {color}.")
        if fabric:
            details.append(f"Material: {fabric}.")
        if item.note:
            details.append(f"Notes: {item.note.strip()}.")
        details.append(
            "Clean piece, ready to wear, and priced to sell quickly on secondhand marketplaces."
        )
        details.append(
            f"#secondhand #{category.replace(' ', '')} #preloved #wardrobeedit"
        )
        description = " ".join(details).strip()

        return MarketplaceListing(
            title=title,
            description=description,
            suggested_price=suggested_price,
            generated_at=datetime.now(tz=timezone.utc).isoformat(),
        )

    def _generate_listing_for_item(self, item: WardrobeItem) -> MarketplaceListing | None:
        fallback_price = self._fallback_listing_price(item)
        fallback_listing = self._build_listing_fallback(item, fallback_price)
        if self._client is None:
            return fallback_listing

        image_payload = _clean_b64(item.item_snippet_base64 or item.image_base64)
        item_snapshot = {
            "id": item.id,
            "category": item.category,
            "title": item.title,
            "color": item.color,
            "style": item.style,
            "fabric_type": item.fabric_type,
            "condition": item.condition,
            "note": item.note,
        }

        estimated_price = fallback_price
        price_reasoning = "Fallback estimate based on category/condition."
        appraiser_prompt = (
            "You are a secondhand clothing appraiser. "
            "Estimate a fair listing price for this single garment. "
            "Return strict JSON with keys: estimated_price (float), price_reasoning (string). "
            "Do not invent brand details; if unknown, ignore brand premium. "
            f"Item data: {json.dumps(item_snapshot)}."
        )

        appraiser_parts: list[dict[str, Any]] = [{"text": appraiser_prompt}]
        if image_payload:
            appraiser_parts.append(
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": image_payload,
                    }
                }
            )
        try:
            appraiser_response = self._client.models.generate_content(
                model=self._settings.gemini_model,
                contents=[{"role": "user", "parts": appraiser_parts}],
            )
            appraiser_data = safe_json_extract(getattr(appraiser_response, "text", "") or "")
            if isinstance(appraiser_data, dict):
                estimated_price = _safe_price(appraiser_data.get("estimated_price"), fallback_price)
                reason = appraiser_data.get("price_reasoning")
                if isinstance(reason, str) and reason.strip():
                    price_reasoning = reason.strip()
        except Exception:
            logger.exception("Marketplace appraiser step failed for item_id=%s", item.id)

        copywriter_prompt = (
            "You are an expert Vinted/Depop copywriter. "
            "Create an SEO-friendly listing for one clothing item. "
            "Return strict JSON with keys: title, description, suggested_price. "
            "Use the exact suggested_price provided unless there is a clear typo. "
            "Description must be natural and concise, end with 4-7 relevant hashtags, and never invent facts. "
            f"Item data: {json.dumps(item_snapshot)}. "
            f"Appraiser output: {json.dumps({'estimated_price': estimated_price, 'price_reasoning': price_reasoning})}."
        )
        copywriter_parts: list[dict[str, Any]] = [{"text": copywriter_prompt}]
        if image_payload:
            copywriter_parts.append(
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": image_payload,
                    }
                }
            )
        try:
            copywriter_response = self._client.models.generate_content(
                model=self._settings.gemini_model,
                contents=[{"role": "user", "parts": copywriter_parts}],
            )
            copywriter_data = safe_json_extract(getattr(copywriter_response, "text", "") or "")
            if not isinstance(copywriter_data, dict):
                return fallback_listing
            title_raw = str(copywriter_data.get("title") or "").strip()
            description_raw = str(copywriter_data.get("description") or "").strip()
            suggested_price = _safe_price(copywriter_data.get("suggested_price"), estimated_price)
            if not title_raw or not description_raw:
                return fallback_listing
            return MarketplaceListing(
                title=title_raw[:120],
                description=description_raw,
                suggested_price=suggested_price,
                generated_at=datetime.now(tz=timezone.utc).isoformat(),
            )
        except Exception:
            logger.exception("Marketplace copywriter step failed for item_id=%s", item.id)
            return fallback_listing

    @staticmethod
    def _summarize_wardrobe_categories(wardrobe_items: list[WardrobeItem]) -> dict[str, int]:
        summary: dict[str, int] = {}
        for item in wardrobe_items:
            category = _normalize_category(item.category or "")
            if not category:
                continue
            summary[category] = summary.get(category, 0) + 1
        return summary

    def _llm_gap_analysis(
        self,
        *,
        style_intents: list[StyleIntentLog],
        wardrobe_summary: dict[str, int],
    ) -> list[str] | None:
        if self._client is None or not style_intents:
            return None

        intent_payload = [
            {
                "date": intent.date,
                "intent_description": intent.intent_description,
            }
            for intent in style_intents[:40]
        ]
        prompt = (
            "You are a wardrobe gap analyst. "
            "Given style intents and current closet category counts, infer persistent lifestyle gaps. "
            "Return strict JSON with shape: {\"gaps\": [\"...\"]}. "
            "Gap names should be short category-like labels (e.g., outerwear, formalwear, tops, bottoms, shoes). "
            f"Style intents: {json.dumps(intent_payload)}. "
            f"Wardrobe categories: {json.dumps(wardrobe_summary)}."
        )
        try:
            response = self._client.models.generate_content(
                model=self._settings.gemini_model,
                contents=prompt,
            )
        except Exception:
            logger.exception("Optimizer gap analysis LLM call failed.")
            return None

        parsed = safe_json_extract(getattr(response, "text", "") or "")
        if not isinstance(parsed, dict):
            return None
        raw_gaps = parsed.get("gaps")
        if not isinstance(raw_gaps, list):
            return None
        gaps: list[str] = []
        for value in raw_gaps:
            if not isinstance(value, str):
                continue
            normalized = _normalize_category(value)
            if normalized and normalized not in gaps:
                gaps.append(normalized)
        return gaps

    def _heuristic_gap_analysis(
        self,
        *,
        style_intents: list[StyleIntentLog],
        wardrobe_summary: dict[str, int],
    ) -> list[str]:
        keyword_to_category = {
            "wedding": "formalwear",
            "formal": "formalwear",
            "office": "formalwear",
            "meeting": "formalwear",
            "cold": "outerwear",
            "winter": "outerwear",
            "rain": "outerwear",
            "coat": "outerwear",
            "jacket": "outerwear",
            "casual": "tops",
            "shirt": "tops",
            "top": "tops",
            "jeans": "bottoms",
            "pants": "bottoms",
            "trousers": "bottoms",
            "skirt": "bottoms",
            "shoes": "shoes",
            "sneaker": "shoes",
            "boot": "shoes",
        }

        inferred: list[str] = []
        for intent in style_intents:
            hay = intent.intent_description.lower()
            for token, category in keyword_to_category.items():
                if token not in hay:
                    continue
                if wardrobe_summary.get(category, 0) >= 2:
                    continue
                if category not in inferred:
                    inferred.append(category)

        if not inferred and not wardrobe_summary:
            inferred.extend(["tops", "bottoms", "outerwear"])
        return inferred

    def _llm_shopper(
        self,
        *,
        gaps: list[str],
        style_intents: list[StyleIntentLog],
    ) -> list[WishlistItemInput] | None:
        if self._client is None or not gaps:
            return None

        intent_payload = [intent.intent_description for intent in style_intents[:30]]
        prompt = (
            "You are a shopping planner. Convert wardrobe gaps into wishlist items. "
            "Return strict JSON array where each item has: category, color (optional), notes (optional), reasoning (required). "
            "Keep 1 item per gap, practical and secondhand-friendly. "
            f"Gaps: {json.dumps(gaps)}. "
            f"Recent style intents: {json.dumps(intent_payload)}."
        )
        try:
            response = self._client.models.generate_content(
                model=self._settings.gemini_model,
                contents=prompt,
            )
        except Exception:
            logger.exception("Optimizer shopper LLM call failed.")
            return None

        parsed = safe_json_extract(getattr(response, "text", "") or "")
        if not isinstance(parsed, list):
            return None

        items: list[WishlistItemInput] = []
        for row in parsed:
            if not isinstance(row, dict):
                continue
            category_raw = row.get("category")
            if not isinstance(category_raw, str):
                continue
            category = _normalize_category(category_raw)
            if not category:
                continue
            color = row.get("color")
            color_value = str(color).strip().lower() if isinstance(color, str) and color.strip() else None
            notes = row.get("notes")
            notes_value = str(notes).strip() if isinstance(notes, str) and notes.strip() else None
            reasoning = row.get("reasoning")
            reasoning_value = (
                str(reasoning).strip() if isinstance(reasoning, str) and reasoning.strip() else None
            )
            items.append(
                WishlistItemInput(
                    category=category,
                    color=color_value,
                    notes=notes_value,
                    is_ai_suggested=True,
                    reasoning=reasoning_value
                    or f"Suggested to close a wardrobe gap around {category}.",
                )
            )
        return items

    @staticmethod
    def _fallback_shopper(gaps: list[str]) -> list[WishlistItemInput]:
        items: list[WishlistItemInput] = []
        seen: set[str] = set()
        for gap in gaps:
            category = _normalize_category(gap)
            if not category or category in seen:
                continue
            seen.add(category)
            items.append(
                WishlistItemInput(
                    category=category,
                    notes="Auto-generated by wardrobe optimizer from usage + intent signals",
                    is_ai_suggested=True,
                    reasoning=f"Suggested because your closet is currently missing a strong {category} option.",
                )
            )
        return items

    @staticmethod
    def _item_sustainability_score(item: WardrobeItem) -> int:
        score = 82
        note_haystack = f"{item.note or ''} {item.style or ''}".lower()
        if "vintage" in note_haystack or "secondhand" in note_haystack or "thrift" in note_haystack:
            score += 10
        if item.flagged_for_donation:
            score += 3
        if int(item.wear_count or 0) >= 10:
            score += 4
        return max(50, min(98, score))

    def _build_stats(self, user_id: str, wardrobe_items: list[WardrobeItem]) -> WardrobeStats:
        total_items = len(wardrobe_items)
        if not total_items:
            return WardrobeStats(ai_note="Scan your first item to unlock advanced wardrobe insights.")

        now = datetime.now(tz=timezone.utc)
        recent_cutoff = now - timedelta(days=30)
        worn_recent_count = 0
        color_counts: dict[str, int] = {}
        category_wears: dict[str, int] = {}
        color_wears: dict[str, int] = {}
        sustainability_scores: list[int] = []
        cpw_leaders: list[WardrobeCostPerWearLeader] = []

        for item in wardrobe_items:
            wear_count = max(0, int(item.wear_count or 0))
            if item.last_worn_date:
                last_worn = _parse_iso_datetime(item.last_worn_date) or _parse_iso_datetime(
                    f"{item.last_worn_date}T00:00:00+00:00"
                )
                if last_worn and last_worn >= recent_cutoff:
                    worn_recent_count += 1

            color_key = (item.color or "unknown").strip().lower() or "unknown"
            color_counts[color_key] = color_counts.get(color_key, 0) + 1

            category_key = _normalize_category(item.category or "other") or "other"
            category_wears[category_key] = category_wears.get(category_key, 0) + max(1, wear_count)
            color_wears[color_key] = color_wears.get(color_key, 0) + max(1, wear_count)

            sustainability_scores.append(self._item_sustainability_score(item))

            estimated_price = float(
                item.marketplace_listing.suggested_price
                if item.marketplace_listing is not None
                else self._fallback_listing_price(item)
            )
            denominator = max(1, wear_count)
            cpw_leaders.append(
                WardrobeCostPerWearLeader(
                    item_id=item.id,
                    title=(item.title or item.category or "Item").strip(),
                    category=item.category,
                    color=item.color,
                    image_url=item.image_url,
                    item_snippet_base64=item.item_snippet_base64,
                    estimated_price=round(estimated_price, 2),
                    cost_per_wear=round(estimated_price / denominator, 2),
                    wear_count=wear_count,
                )
            )

        dominant_colors = [
            WardrobeStatsColorShare(
                color=color,
                count=count,
                percent=round((count / total_items) * 100, 1),
            )
            for color, count in sorted(color_counts.items(), key=lambda row: row[1], reverse=True)[:5]
        ]
        most_worn_categories = [
            {"category": category, "wears": wears}
            for category, wears in sorted(category_wears.items(), key=lambda row: row[1], reverse=True)[:5]
        ]
        most_worn_colors = [
            {"color": color, "wears": wears}
            for color, wears in sorted(color_wears.items(), key=lambda row: row[1], reverse=True)[:5]
        ]

        wear_logs = self._gateway.list_wear_logs(user_id, limit=120)
        logged_dates = {
            (_parse_iso_datetime(f"{row.date}T00:00:00+00:00") or now).date()
            for row in wear_logs
            if row.date
        }
        streak_days = _consecutive_day_streak(logged_dates)

        utilization_rate = round((worn_recent_count / total_items) * 100, 1)
        sustainability_avg = round(sum(sustainability_scores) / len(sustainability_scores))
        cpw_leaders = sorted(
            [row for row in cpw_leaders if row.wear_count > 0],
            key=lambda row: (row.cost_per_wear, -row.wear_count),
        )[:5]

        dominant_color_text = dominant_colors[0].color if dominant_colors else "neutrals"
        ai_note = (
            f"Closet utilization is {utilization_rate:.1f}%. "
            f"You're leaning into {dominant_color_text} lately, and your streak is {streak_days} day"
            f"{'' if streak_days == 1 else 's'}."
        )

        return WardrobeStats(
            utilization_rate=utilization_rate,
            dominant_colors=dominant_colors,
            cost_per_wear_leaders=cpw_leaders,
            sustainability_avg=sustainability_avg,
            most_worn_categories=most_worn_categories,
            most_worn_colors=most_worn_colors,
            outfit_streak_days=streak_days,
            ai_note=ai_note,
        )

    def run_optimizer(self, user_id: str) -> dict[str, Any]:
        wardrobe_items = self._gateway.list_wardrobe_items(user_id)
        style_intents = self._gateway.list_style_intent_logs(user_id, limit=120)
        flagged_item_ids = self._run_auditor(user_id, wardrobe_items)

        wardrobe_summary = self._summarize_wardrobe_categories(wardrobe_items)
        gaps = self._llm_gap_analysis(style_intents=style_intents, wardrobe_summary=wardrobe_summary)
        if gaps is None:
            gaps = self._heuristic_gap_analysis(
                style_intents=style_intents,
                wardrobe_summary=wardrobe_summary,
            )

        shopper_payloads = self._llm_shopper(gaps=gaps, style_intents=style_intents)
        if shopper_payloads is None:
            shopper_payloads = self._fallback_shopper(gaps)

        existing_items = self._gateway.list_wishlist(user_id)
        existing_categories = {
            _normalize_category(item.category)
            for item in existing_items
            if (item.category or "").strip()
        }
        created_items: list[WishlistItem] = []
        for payload in shopper_payloads:
            category_key = _normalize_category(payload.category)
            if not category_key or category_key in existing_categories:
                continue
            existing_categories.add(category_key)
            created_items.append(self._gateway.upsert_wishlist_item(user_id, payload))

        wishlist_total = len(self._gateway.list_wishlist(user_id))
        stats = self._build_stats(user_id, wardrobe_items)
        return {
            "flagged_item_ids": flagged_item_ids,
            "flagged_count": len(flagged_item_ids),
            "gaps": gaps,
            "created_wishlist_items": created_items,
            "wishlist_total": wishlist_total,
            "style_intent_count": len(style_intents),
            "stats": stats,
        }

    def log_unmet_style_intent(self, user_id: str, intent_description: str) -> dict[str, Any]:
        normalized = (intent_description or "").strip()
        if not normalized:
            raise ValueError("intent_description is required")
        today = _iso_today()
        existing = self._gateway.list_style_intent_logs(user_id, limit=20)
        for row in existing:
            if row.date == today and row.intent_description.strip().lower() == normalized.lower():
                return {"status": "already_logged", "intent_id": row.id}

        record = self._gateway.create_style_intent_log(
            user_id,
            normalized,
            today,
        )
        return {"status": "logged", "intent_id": record.id}
