from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote_plus

from app.config import Settings
from app.models import MarketSuggestion, WardrobeItem
from app.services.text_utils import normalize_text, safe_json_extract

try:  # pragma: no cover - optional runtime dependency behavior
    from google import genai
    from google.genai import types as genai_types
except Exception:  # pragma: no cover
    genai = None
    genai_types = None

logger = logging.getLogger(__name__)

REQUIRED_OUTFIT_SLOTS = ["top", "bottom", "shoes"]
def _slot_from_text(value: str | None) -> str | None:
    text = normalize_text(value)
    if not text:
        return None
    shoes_tokens = {"shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "sandal", "sandals", "heel", "heels", "loafer", "loafers"}
    tops_tokens = {"top", "tops", "shirt", "blouse", "tee", "t-shirt", "sweater", "hoodie", "cardigan", "tank", "polo"}
    bottoms_tokens = {"bottom", "bottoms", "jeans", "pants", "trousers", "shorts", "skirt", "leggings"}
    if any(token in text for token in shoes_tokens):
        return "shoes"
    if any(token in text for token in bottoms_tokens):
        return "bottom"
    if any(token in text for token in tops_tokens):
        return "top"
    return None


def _infer_item_slot(item: WardrobeItem) -> str | None:
    for value in (item.category, item.title, item.note, item.style):
        slot = _slot_from_text(value)
        if slot:
            return slot
    phase = normalize_text(item.phase)
    if "bottom" in phase:
        return "bottom"
    if "top" in phase:
        return "top"
    return None


def _style_profile_from_context(context: str) -> dict[str, Any]:
    text = normalize_text(context)
    preferred_colors: list[str] = []
    preferred_materials: list[str] = []
    avoid_heavy_footwear = False
    vibe = "casual"

    if any(token in text for token in ["wedding", "formal", "ceremony"]):
        vibe = "formal"
        preferred_colors.extend(["neutral", "pastel"])
        preferred_materials.extend(["linen", "silk", "cotton"])
    if any(token in text for token in ["beach", "summer", "hot"]):
        vibe = "lightweight"
        preferred_colors.extend(["white", "beige", "light blue"])
        preferred_materials.extend(["linen", "cotton"])
        avoid_heavy_footwear = True
    if any(token in text for token in ["cold", "winter", "chilly"]):
        vibe = "warm"
        preferred_materials.extend(["wool", "fleece", "denim"])
    if any(token in text for token in ["rain"]):
        vibe = "weatherproof"
        preferred_materials.extend(["water-resistant"])

    return {
        "vibe": vibe,
        "preferred_colors": list(dict.fromkeys(preferred_colors)),
        "preferred_materials": list(dict.fromkeys(preferred_materials)),
        "avoid_heavy_footwear": avoid_heavy_footwear,
    }


def _tokenize_text(value: str | None) -> list[str]:
    text = normalize_text(value)
    if not text:
        return []
    return [token for token in re.split(r"[^a-z0-9]+", text) if len(token) >= 3]


@dataclass
class CandidateItem:
    id: str
    slot: str
    score: float
    title: str
    category: str
    color: str | None
    fabric_type: str | None
    style: str | None
    note: str | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "slot": self.slot,
            "score": round(self.score, 3),
            "title": self.title,
            "category": self.category,
            "color": self.color,
            "fabric_type": self.fabric_type,
            "style": self.style,
            "note": self.note,
            "source": "closet",
        }


class OutfitBuilderService:
    def __init__(self, settings: Settings, gateway: Any):
        self._settings = settings
        self._gateway = gateway
        self._client = None
        if settings.gemini_api_key and genai is not None:
            self._client = genai.Client(api_key=settings.gemini_api_key)

    def search_web_for_shopping(
        self,
        *,
        query: str,
        event_context: str | None = None,
        limit: int = 5,
    ) -> dict[str, Any]:
        normalized_query = " ".join((query or "").split()).strip()
        normalized_event = " ".join((event_context or "").split()).strip()
        capped_limit = max(1, min(int(limit or 5), 6))
        if not normalized_query:
            return {"status": "error", "search_queries": [], "results": []}

        search_queries = [normalized_query]
        if normalized_event and normalized_event.lower() not in normalized_query.lower():
            search_queries.append(f"{normalized_query} for {normalized_event}")

        if self._client is None or genai_types is None:
            fallback_query = search_queries[-1]
            fallback_url = f"https://www.google.com/search?q={quote_plus(fallback_query)}"
            return {
                "status": "fallback",
                "search_queries": search_queries,
                "summary": "Web search is not configured, so I generated a direct search link instead.",
                "results": [
                    {
                        "title": fallback_query,
                        "url": fallback_url,
                        "domain": "google.com",
                    }
                ],
            }

        prompt = (
            "You are a fashion market scout. "
            "Search the live web for current shopping options or relevant product pages. "
            "Prefer retailer, marketplace, or editorial result pages that help the user shop right now. "
            "Keep the written answer to one short sentence."
            f" Primary request: {normalized_query}. "
            f"Event context: {normalized_event or 'none provided'}. "
            f"Return the best web sources for this fashion request."
        )
        try:
            response = self._client.models.generate_content(
                model=self._settings.gemini_model,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    tools=[genai_types.Tool(google_search=genai_types.GoogleSearch())],
                ),
            )
        except Exception:
            logger.exception("Market scout web search failed for query=%s", normalized_query)
            fallback_query = search_queries[-1]
            fallback_url = f"https://www.google.com/search?q={quote_plus(fallback_query)}"
            return {
                "status": "fallback",
                "search_queries": search_queries,
                "summary": "Web search failed, so I generated a direct search link instead.",
                "results": [
                    {
                        "title": fallback_query,
                        "url": fallback_url,
                        "domain": "google.com",
                    }
                ],
            }

        candidates = getattr(response, "candidates", None) or []
        grounding_metadata = None
        for candidate in candidates:
            grounding_metadata = getattr(candidate, "grounding_metadata", None)
            if grounding_metadata is not None:
                break

        metadata_queries = list(getattr(grounding_metadata, "web_search_queries", None) or [])
        if metadata_queries:
            search_queries = [str(value).strip() for value in metadata_queries if str(value).strip()]

        seen_urls: set[str] = set()
        results: list[dict[str, str]] = []
        for chunk in list(getattr(grounding_metadata, "grounding_chunks", None) or []):
            web = getattr(chunk, "web", None)
            url = str(getattr(web, "uri", "") or "").strip()
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            title = str(getattr(web, "title", "") or "").strip() or url
            domain = str(getattr(web, "domain", "") or "").strip()
            results.append(
                {
                    "title": title,
                    "url": url,
                    "domain": domain,
                }
            )
            if len(results) >= capped_limit:
                break

        summary = str(getattr(response, "text", "") or "").strip()
        if not results:
            fallback_query = search_queries[-1] if search_queries else normalized_query
            fallback_url = f"https://www.google.com/search?q={quote_plus(fallback_query)}"
            results.append(
                {
                    "title": fallback_query,
                    "url": fallback_url,
                    "domain": "google.com",
                }
            )

        return {
            "status": "ok",
            "search_queries": search_queries,
            "summary": summary,
            "results": results,
        }

    async def _search_closet_async(
        self,
        user_id: str,
        event_context: str,
        base_item: WardrobeItem | None,
    ) -> list[CandidateItem]:
        context_tokens = {token for token in normalize_text(event_context).split(" ") if token}
        base_color = normalize_text(base_item.color if base_item else None)
        base_material = normalize_text(base_item.fabric_type if base_item else None)
        candidates: list[CandidateItem] = []
        for item in self._gateway.list_wardrobe_items(user_id):
            slot = _infer_item_slot(item)
            if not slot:
                continue
            score = 0.2
            hay = " ".join(
                [
                    normalize_text(item.title),
                    normalize_text(item.category),
                    normalize_text(item.color),
                    normalize_text(item.style),
                    normalize_text(item.fabric_type),
                    normalize_text(item.note),
                ]
            )
            for token in context_tokens:
                if token and token in hay:
                    score += 0.18
            if base_color and normalize_text(item.color) == base_color:
                score += 0.25
            if base_material and normalize_text(item.fabric_type) == base_material:
                score += 0.15
            if item.id == (base_item.id if base_item else ""):
                score += 2.0
            candidates.append(
                CandidateItem(
                    id=item.id,
                    slot=slot,
                    score=score,
                    title=item.title or f"{item.category.title()} item",
                    category=item.category,
                    color=item.color,
                    fabric_type=item.fabric_type,
                    style=item.style,
                    note=item.note,
                )
            )
        candidates.sort(key=lambda row: row.score, reverse=True)
        return candidates

    def _estimate_missing_slots(
        self,
        *,
        closet_candidates: list[CandidateItem],
        style_rules: dict[str, Any],
        base_item: WardrobeItem | None,
    ) -> list[str]:
        selected_slots: set[str] = set()
        used_ids: set[str] = set()
        base_slot = _infer_item_slot(base_item) if base_item else None
        if base_item and base_slot in REQUIRED_OUTFIT_SLOTS:
            selected_slots.add(base_slot)
            used_ids.add(base_item.id)

        filtered_closet = [row for row in closet_candidates if self._candidate_matches_rules(row, style_rules)]
        for slot in REQUIRED_OUTFIT_SLOTS:
            if slot in selected_slots:
                continue
            pick = next((row for row in filtered_closet if row.slot == slot and row.id not in used_ids), None)
            if not pick:
                continue
            selected_slots.add(slot)
            used_ids.add(pick.id)
        return [slot for slot in REQUIRED_OUTFIT_SLOTS if slot not in selected_slots]

    def _fallback_market_brief(
        self,
        *,
        event_context: str,
        style_rules: dict[str, Any],
        slot: str,
    ) -> MarketSuggestion:
        vibe = normalize_text(style_rules.get("vibe")) or "casual"
        colors = [str(value).strip().lower() for value in style_rules.get("preferred_colors", []) if str(value).strip()]
        materials = [
            str(value).strip().lower() for value in style_rules.get("preferred_materials", []) if str(value).strip()
        ]
        color_hint = colors[0] if colors else ""
        material_hint = materials[0] if materials else ""

        if slot == "shoes":
            if vibe == "formal":
                target_item = f"{color_hint + ' ' if color_hint else ''}{material_hint + ' ' if material_hint else ''}vintage loafers".strip()
                aesthetic_goal = "Anchor the outfit with polished footwear that sharpens the event look without feeling overdone."
                aesthetic_match = "Look for clean lines, low visual bulk, and a refined silhouette that balances the outfit."
            elif vibe == "lightweight":
                target_item = f"{color_hint + ' ' if color_hint else ''}minimal sandals".strip()
                aesthetic_goal = "Keep the outfit light and breathable so the look feels effortless in warm weather."
                aesthetic_match = "Look for airy straps, low-profile soles, and soft neutrals that echo the palette."
            else:
                target_item = f"{color_hint + ' ' if color_hint else ''}secondhand shoes".strip()
                aesthetic_goal = "Finish the outfit with shoes that support the overall vibe instead of distracting from it."
                aesthetic_match = "Look for a shape that repeats the outfit's balance, either clean and minimal or more textured and expressive."
        elif slot == "top":
            target_item = f"{color_hint + ' ' if color_hint else ''}{material_hint + ' ' if material_hint else ''}structured top".strip()
            aesthetic_goal = "Add top-half structure so the outfit feels intentional and event-ready."
            aesthetic_match = "Look for shape near the shoulders or neckline to give the look a clear focal point."
        else:
            target_item = f"{color_hint + ' ' if color_hint else ''}{material_hint + ' ' if material_hint else ''}tailored bottoms".strip()
            aesthetic_goal = "Ground the outfit with bottoms that clean up the proportions and support the styling direction."
            aesthetic_match = "Look for length, drape, and rise that stabilize the silhouette rather than pulling attention away."

        query_base = " ".join(part for part in [event_context.strip(), target_item] if part).strip()
        search_queries = [
            " ".join(part for part in [query_base, "secondhand"] if part).strip(),
            " ".join(
                part
                for part in [target_item, event_context.strip(), "thrift", "depop"]
                if part
            ).strip(),
        ]
        return MarketSuggestion(
            slot=slot,
            aesthetic_goal=aesthetic_goal,
            target_item=target_item.title(),
            physical_stores=[],
            search_url=f"https://www.google.com/search?tbm=shop&q={quote_plus(search_queries[0])}",
            search_queries=search_queries,
            title=target_item.title(),
            aesthetic_match=aesthetic_match,
        )

    async def _generate_market_queries(
        self,
        *,
        event_context: str,
        style_rules: dict[str, Any],
        missing_slots: list[str],
    ) -> list[MarketSuggestion]:
        if not missing_slots:
            return []
        fallback = [
            self._fallback_market_brief(
                event_context=event_context,
                style_rules=style_rules,
                slot=slot,
            )
            for slot in missing_slots
        ]
        if self._client is None:
            return fallback
        prompt = (
            "You are a professional personal shopper for secondhand fashion. "
            "Return strict JSON with shape: "
            "{\"suggestions\":[{\"slot\":\"shoes\",\"aesthetic_goal\":\"...\","
            "\"target_item\":\"...\",\"search_queries\":[\"...\",\"...\"],"
            "\"aesthetic_match\":\"...\"}]}. "
            "Generate one suggestion per missing slot. "
            f"Event context: {event_context}. "
            f"Style rules: {json.dumps(style_rules, ensure_ascii=False)}. "
            f"Missing slots: {json.dumps(missing_slots, ensure_ascii=False)}. "
            "Every search query must be specific to secondhand shopping."
        )
        try:
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=self._settings.gemini_model,
                contents=prompt,
            )
            parsed = safe_json_extract(getattr(response, "text", "") or "")
            suggestions_raw = parsed.get("suggestions") if isinstance(parsed, dict) else None
            if not isinstance(suggestions_raw, list):
                return fallback
            suggestions_by_slot: dict[str, MarketSuggestion] = {}
            for row in suggestions_raw:
                if not isinstance(row, dict):
                    continue
                slot = str(row.get("slot") or "").strip().lower()
                if slot not in missing_slots:
                    continue
                search_queries = [
                    str(value).strip()
                    for value in (row.get("search_queries") or [])
                    if str(value).strip()
                ][:2]
                if not search_queries:
                    continue
                target_item = str(row.get("target_item") or "").strip()
                aesthetic_goal = str(row.get("aesthetic_goal") or "").strip()
                aesthetic_match = str(row.get("aesthetic_match") or "").strip() or None
                if not target_item or not aesthetic_goal:
                    continue
                suggestions_by_slot[slot] = MarketSuggestion(
                    slot=slot,
                    aesthetic_goal=aesthetic_goal,
                    target_item=target_item,
                    physical_stores=[],
                    search_url=f"https://www.google.com/search?tbm=shop&q={quote_plus(search_queries[0])}",
                    search_queries=search_queries,
                    title=target_item,
                    aesthetic_match=aesthetic_match,
                )
            return [suggestions_by_slot.get(slot, item) for slot, item in zip(missing_slots, fallback, strict=False)]
        except Exception:
            logger.exception("Gap scout query generation failed, falling back to heuristics.")
            return fallback

    def _scout_local_store_matches(
        self,
        *,
        user_id: str,
        suggestion: MarketSuggestion,
    ) -> list[str]:
        try:
            cached_shops = list(self._gateway.list_cached_shops(user_id))
        except Exception:
            logger.exception("Failed to load cached shops for user_id=%s during gap scout", user_id)
            return []
        if not cached_shops:
            return []
        try:
            favorite_store_ids = {
                str(row.store_id).strip()
                for row in self._gateway.list_favorite_stores(user_id)
                if str(row.store_id).strip()
            }
        except Exception:
            favorite_store_ids = set()

        market_tokens = set(
            _tokenize_text(
                " ".join(
                    [
                        suggestion.slot,
                        suggestion.target_item,
                        suggestion.aesthetic_goal,
                        suggestion.aesthetic_match or "",
                        " ".join(suggestion.search_queries),
                    ]
                )
            )
        )
        ranked: list[tuple[float, str]] = []
        for store in cached_shops:
            haystack = " ".join(
                [
                    str(store.name or ""),
                    str(store.category or ""),
                    str(store.address or ""),
                    str(store.match_reason or ""),
                    str(store.ai_evaluation.vibe_check or ""),
                    " ".join(store.ai_evaluation.best_for or []),
                    " ".join(store.google_categories or []),
                ]
            ).lower()
            overlap = sum(1 for token in market_tokens if token in haystack)
            if overlap <= 0 and suggestion.slot not in haystack:
                continue
            score = float(overlap)
            if store.id in favorite_store_ids or bool(store.is_favorite):
                score += 2.5
            score += float(store.wishlist_relevance or 0.0) * 2.0
            score += float(store.ai_evaluation.sustainability_score or 0.0) / 100.0
            ranked.append((score, store.name))
        ranked.sort(key=lambda row: (-row[0], row[1].lower()))
        deduped: list[str] = []
        for _, name in ranked:
            clean = str(name).strip()
            if not clean or clean in deduped:
                continue
            deduped.append(clean)
            if len(deduped) >= 3:
                break
        return deduped

    async def _search_market_async(
        self,
        *,
        user_id: str,
        event_context: str,
        style_rules: dict[str, Any],
        missing_slots: list[str],
    ) -> list[dict[str, Any]]:
        query_briefs = await self._generate_market_queries(
            event_context=event_context,
            style_rules=style_rules,
            missing_slots=missing_slots,
        )
        suggestions: list[dict[str, Any]] = []
        for brief in query_briefs:
            local_matches = self._scout_local_store_matches(user_id=user_id, suggestion=brief)
            suggestions.append(
                brief.model_copy(
                    update={
                        "physical_stores": local_matches,
                    }
                ).model_dump()
            )
        return suggestions

    async def _analyze_style_async(
        self,
        user_prompt: str,
        event_context: str,
        base_item: WardrobeItem | None,
    ) -> dict[str, Any]:
        fallback = _style_profile_from_context(event_context or user_prompt)
        if self._client is None:
            return fallback
        prompt = (
            "Return strict JSON with keys: vibe (string), preferred_colors (array), "
            "preferred_materials (array), avoid_heavy_footwear (boolean). "
            f"User prompt: {user_prompt}. "
            f"Event context: {event_context}. "
            f"Base item: {json.dumps({'category': base_item.category if base_item else None, 'color': base_item.color if base_item else None, 'material': base_item.fabric_type if base_item else None})}."
        )
        try:
            response = self._client.models.generate_content(
                model=self._settings.gemini_model,
                contents=prompt,
            )
            parsed = safe_json_extract(getattr(response, "text", "") or "")
            if not isinstance(parsed, dict):
                return fallback
            return {
                "vibe": str(parsed.get("vibe") or fallback["vibe"]),
                "preferred_colors": [str(v).strip().lower() for v in (parsed.get("preferred_colors") or []) if str(v).strip()],
                "preferred_materials": [str(v).strip().lower() for v in (parsed.get("preferred_materials") or []) if str(v).strip()],
                "avoid_heavy_footwear": bool(parsed.get("avoid_heavy_footwear", fallback["avoid_heavy_footwear"])),
            }
        except Exception:
            logger.exception("Style theorist call failed, falling back to heuristics.")
            return fallback

    @staticmethod
    def _candidate_matches_rules(candidate: CandidateItem, rules: dict[str, Any]) -> bool:
        preferred_colors = [normalize_text(value) for value in rules.get("preferred_colors", [])]
        preferred_materials = [normalize_text(value) for value in rules.get("preferred_materials", [])]
        avoid_heavy_footwear = bool(rules.get("avoid_heavy_footwear"))

        color = normalize_text(candidate.color)
        material = normalize_text(candidate.fabric_type)
        title = normalize_text(candidate.title)

        if candidate.slot == "shoes" and avoid_heavy_footwear:
            if any(token in title for token in ["boot", "chunky", "heavy"]):
                return False

        if preferred_colors and color:
            if not any(pref in color or color in pref for pref in preferred_colors):
                # color mismatch only soft-penalized at ranking level, not hard-fail
                pass

        if preferred_materials and material:
            if not any(pref in material or material in pref for pref in preferred_materials):
                pass
        return True

    def _aggregate(
        self,
        *,
        closet_candidates: list[CandidateItem],
        market_candidates: list[dict[str, Any]],
        style_rules: dict[str, Any],
        base_item: WardrobeItem | None,
        event_context: str,
    ) -> dict[str, Any]:
        selected: dict[str, dict[str, Any]] = {}
        selected_ids: list[str] = []
        used_ids: set[str] = set()
        external_suggestions: list[dict[str, Any]] = []

        base_slot = _infer_item_slot(base_item) if base_item else None
        if base_item and base_slot in REQUIRED_OUTFIT_SLOTS:
            selected[base_slot] = {
                "id": base_item.id,
                "slot": base_slot,
                "title": base_item.title or f"{base_item.category.title()} item",
                "category": base_item.category,
                "color": base_item.color,
                "fabric_type": base_item.fabric_type,
                "source": "closet",
            }
            selected_ids.append(base_item.id)
            used_ids.add(base_item.id)

        filtered_closet = [row for row in closet_candidates if self._candidate_matches_rules(row, style_rules)]

        for slot in REQUIRED_OUTFIT_SLOTS:
            if slot in selected:
                continue
            pick = next((row for row in filtered_closet if row.slot == slot and row.id not in used_ids), None)
            if pick:
                selected[slot] = pick.to_dict()
                selected_ids.append(pick.id)
                used_ids.add(pick.id)
                continue
            market_pick = next((row for row in market_candidates if row.get("slot") == slot), None)
            if market_pick:
                external_suggestions.append({**market_pick, "suggested_purchase": True})

        missing_slots = [slot for slot in REQUIRED_OUTFIT_SLOTS if slot not in selected]
        complete_from_closet = len(missing_slots) == 0
        overview_bits: list[str] = []
        if selected.get("top"):
            overview_bits.append(f"top: {selected['top'].get('title')}")
        if selected.get("bottom"):
            overview_bits.append(f"bottom: {selected['bottom'].get('title')}")
        if selected.get("shoes"):
            overview_bits.append(f"shoes: {selected['shoes'].get('title')}")

        if complete_from_closet:
            tts_summary = "I built a full outfit from your closet. " + "; ".join(overview_bits) + "."
        else:
            gap_text = ", ".join(missing_slots) if missing_slots else "none"
            tts_summary = (
                "I built the best closet-first outfit I could. "
                + "; ".join(overview_bits)
                + f". Missing: {gap_text}. I added targeted gap-scout paths for those pieces."
            )

        return {
            "status": "ok",
            "event_context": event_context,
            "style_rules": style_rules,
            "selected_item_ids": selected_ids,
            "closet_outfit": selected,
            "missing_slots": missing_slots,
            "complete_from_closet": complete_from_closet,
            "external_suggestions": external_suggestions,
            "tts_summary": tts_summary,
        }

    async def build_outfit_parallel(
        self,
        *,
        user_id: str,
        event_context: str,
        base_item_id: str | None = None,
        user_prompt: str | None = None,
    ) -> dict[str, Any]:
        context = (event_context or "").strip() or "general outfit"
        prompt = (user_prompt or "").strip() or context
        base_item: WardrobeItem | None = None
        if base_item_id:
            base_id_norm = base_item_id.strip()
            if base_id_norm:
                base_item = next(
                    (item for item in self._gateway.list_wardrobe_items(user_id) if item.id == base_id_norm),
                    None,
                )
        closet_task = asyncio.create_task(self._search_closet_async(user_id, context, base_item))
        style_task = asyncio.create_task(self._analyze_style_async(prompt, context, base_item))
        closet_candidates, style_rules = await asyncio.gather(
            closet_task,
            style_task,
        )
        missing_slots = self._estimate_missing_slots(
            closet_candidates=closet_candidates,
            style_rules=style_rules,
            base_item=base_item,
        )
        market_candidates = await self._search_market_async(
            user_id=user_id,
            event_context=context,
            style_rules=style_rules,
            missing_slots=missing_slots,
        )

        return self._aggregate(
            closet_candidates=closet_candidates,
            market_candidates=market_candidates,
            style_rules=style_rules,
            base_item=base_item,
            event_context=context,
        )
