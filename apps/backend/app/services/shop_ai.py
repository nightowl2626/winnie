from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx

from app.config import Settings
from app.models import (
    AIStoreEvaluation,
    CachedShopStore,
    DirectoryRefreshResponse,
    EnrichedStore,
    GlobalStoreDirectoryEntry,
    WishlistItem,
)
from app.services.shop_ai_support import (
    ALLOWED_PLACE_TYPE_ORDER,
    ALLOWED_PLACE_TYPES,
    EXCLUDED_NAME_HINTS,
    EXCLUDED_PLACE_TYPES,
    cached_shop_to_place,
    clean_google_type,
    enforce_circular_score_floor,
    extract_review_texts,
    haversine_meters,
    is_circular_place_type,
    is_circular_store_record,
    is_rate_limit_error,
    normalize_text,
    normalize_google_type_token,
    normalize_rating,
    parse_places_rows,
    safe_json_store_response,
    search_centers,
    to_hashtag,
    tokenize,
)
from app.utils.city_sweep import (
    build_city_sweep_centers,
    city_sweep_queries,
    dedupe_places_by_id,
    normalize_city_key,
)

try:  # pragma: no cover - optional runtime dependency behavior
    from google import genai
except Exception:  # pragma: no cover
    genai = None

logger = logging.getLogger(__name__)


class ShopAIService:
    def __init__(self, settings: Settings, gateway: Any):
        self._settings = settings
        self._gateway = gateway
        self._client = None
        self._places_api_key = (
            settings.google_places_api_key.strip() or settings.google_maps_api_key.strip()
        )
        self._evaluation_cache: dict[str, tuple[float, AIStoreEvaluation]] = {}
        self._evaluation_ttl_seconds = 1800
        self._shop_cache_ttl_seconds = 21_600
        if settings.gemini_api_key and genai is not None:
            self._client = genai.Client(api_key=settings.gemini_api_key)

    async def get_nearby_shops(
        self,
        *,
        lat: float,
        lng: float,
        radius_meters: int = 5000,
        user_id: str | None = None,
        city: str | None = None,
    ) -> list[EnrichedStore]:
        if not self._places_api_key:
            raise ValueError("Google Places API key is not configured on backend")

        total_limit = max(10, min(int(self._settings.shop_nearby_max_results or 60), 120))
        if city:
            directory_stores = self._load_directory_shops(
                city=city,
                user_id=user_id,
                lat=lat,
                lng=lng,
                radius_meters=radius_meters,
                total_limit=total_limit,
            )
            if directory_stores:
                logger.info(
                    "[shop-ai] directory hit city=%s count=%s radius=%s user_id=%s",
                    city,
                    len(directory_stores),
                    radius_meters,
                    user_id,
                )
                return directory_stores
        cached_shops = self._load_cached_shops(
            user_id=user_id,
            lat=lat,
            lng=lng,
            radius_meters=radius_meters,
            total_limit=total_limit,
        )
        if cached_shops:
            logger.info(
                "[shop-ai] cache hit count=%s user_id=%s radius=%s; refreshing with live lookup",
                len(cached_shops),
                user_id,
                radius_meters,
            )
        per_search_limit = min(20, total_limit)
        centers = search_centers(lat, lng, radius_meters)
        logger.info(
            "[shop-ai] nearby search centers=%s radius=%s total_limit=%s",
            len(centers),
            radius_meters,
            total_limit,
        )
        search_results = await asyncio.gather(
            *[
                self._fetch_places_nearby(
                    lat=center_lat,
                    lng=center_lng,
                    radius_meters=radius_meters,
                    max_results=per_search_limit,
                )
                for center_lat, center_lng in centers
            ],
            return_exceptions=True,
        )
        nearby_by_id: dict[str, dict[str, Any]] = {
            shop.id: cached_shop_to_place(shop) for shop in cached_shops
        }
        live_results_found = False
        for result in search_results:
            if isinstance(result, Exception):
                logger.exception("Places nearby search failed during multi-center fetch", exc_info=result)
                continue
            live_results_found = True
            for row in result:
                place_id = str(row.get("id") or "").strip()
                if not place_id:
                    continue
                existing = nearby_by_id.get(place_id)
                if not existing or float(row.get("distance_meters") or 0.0) < float(
                    existing.get("distance_meters") or 0.0
                ):
                    nearby_by_id[place_id] = row
        nearby = list(nearby_by_id.values())
        if not nearby:
            return []
        if cached_shops and not live_results_found:
            logger.warning(
                "[shop-ai] live refresh failed; serving cached shops count=%s user_id=%s",
                len(cached_shops),
                user_id,
            )

        eligible_places: list[dict[str, Any]] = []
        for place in nearby:
            matched_type = self._matched_allowed_type(place)
            if not matched_type:
                continue
            enriched = dict(place)
            enriched["_matched_allowed_type"] = matched_type
            eligible_places.append(enriched)

        if not eligible_places:
            logger.info(
                "[shop-ai] no eligible stores after strict category filtering (raw=%s)",
                len(nearby),
            )
            return []

        eligible_places.sort(
            key=lambda place: (
                ALLOWED_PLACE_TYPE_ORDER.index(str(place.get("_matched_allowed_type") or "")),
                float(place.get("distance_meters") or 0.0),
            )
        )

        wishlist_items = self._load_wishlist_items(user_id)
        favorite_store_ids = self._load_favorite_store_ids(user_id)
        allow_remote_eval = radius_meters <= 15_000 and len(eligible_places) <= 60
        logger.info(
            "[shop-ai] eligible=%s remote_eval=%s radius=%s",
            len(eligible_places),
            allow_remote_eval,
            radius_meters,
        )
        evaluations = await asyncio.gather(
            *[self._evaluate_store(place, allow_remote=allow_remote_eval) for place in eligible_places],
            return_exceptions=True,
        )

        ranked_stores: list[tuple[int, EnrichedStore]] = []
        for place, evaluation in zip(eligible_places, evaluations):
            ai_eval = (
                evaluation
                if isinstance(evaluation, AIStoreEvaluation)
                else place.get("_cached_ai_evaluation")
                if isinstance(place.get("_cached_ai_evaluation"), AIStoreEvaluation)
                else self._heuristic_evaluation(place)
            )
            distance_meters = float(place.get("distance_meters") or 0.0)
            if distance_meters <= 0:
                place_lat = float(place.get("lat") or 0.0)
                place_lng = float(place.get("lng") or 0.0)
                distance_meters = haversine_meters(lat, lng, place_lat, place_lng)
            wishlist_relevance = self._wishlist_relevance(
                place=place,
                ai_eval=ai_eval,
                wishlist_items=wishlist_items,
            )
            if (
                not wishlist_items
                and isinstance(place.get("_cached_wishlist_relevance"), (int, float))
            ):
                wishlist_relevance = float(place.get("_cached_wishlist_relevance") or 0.0)
            distance_km = distance_meters / 1000.0
            composite_score = (
                ai_eval.sustainability_score * 0.6
                + wishlist_relevance * 30.0
                - distance_km * 0.4
            )
            if isinstance(place.get("_cached_composite_score"), (int, float)) and not live_results_found:
                composite_score = float(place.get("_cached_composite_score") or composite_score)
            google_categories = [
                clean_google_type(value)
                for value in (place.get("types") or [])
                if clean_google_type(value)
            ]
            category_label = str(place.get("primary_type_display_name") or "").strip() or (
                google_categories[0] if google_categories else None
            )
            allowed_type = str(place.get("_matched_allowed_type") or "")
            category_rank = ALLOWED_PLACE_TYPE_ORDER.index(allowed_type)
            ranked_stores.append(
                (
                    category_rank,
                    EnrichedStore(
                        id=str(place.get("id") or ""),
                        name=str(place.get("name") or "Local store"),
                        lat=float(place.get("lat") or 0.0),
                        lng=float(place.get("lng") or 0.0),
                        distance_meters=distance_meters,
                        google_categories=google_categories,
                        category=category_label,
                        address=str(place.get("address") or "").strip() or None,
                        rating=float(place.get("rating")) if place.get("rating") is not None else None,
                        ai_evaluation=ai_eval,
                        wishlist_relevance=wishlist_relevance,
                        composite_score=round(composite_score, 4),
                        is_favorite=(
                            str(place.get("id") or "") in favorite_store_ids
                            or bool(place.get("_cached_is_favorite"))
                        ),
                    ),
                )
            )

        ranked_stores.sort(
            key=lambda row: (
                row[0],
                -row[1].composite_score,
                row[1].distance_meters,
            )
        )
        stores = [row[1] for row in ranked_stores]
        logger.info(
            "[shop-ai] strict-filtered stores raw=%s eligible=%s",
            len(nearby),
            len(stores),
        )
        stores = stores[:total_limit]
        self._save_cached_shops(user_id, stores)
        return stores

    async def list_city_directory(
        self,
        *,
        city: str,
        user_id: str | None = None,
    ) -> list[GlobalStoreDirectoryEntry]:
        city_key = normalize_city_key(city)
        try:
            rows = self._gateway.list_directory_stores(city_key)
        except Exception:
            logger.exception("Failed to load directory stores for city_key=%s", city_key)
            return []
        if not rows:
            return []
        favorite_store_ids = self._load_favorite_store_ids(user_id)
        stores = [
            row.model_copy(
                update={
                    "is_favorite": row.id in favorite_store_ids or bool(row.is_favorite),
                }
            )
            for row in rows
        ]
        stores.sort(
            key=lambda store: (
                0 if store.is_favorite else 1,
                ALLOWED_PLACE_TYPE_ORDER.index(normalize_google_type_token(store.category))
                if normalize_google_type_token(store.category) in ALLOWED_PLACE_TYPES
                else len(ALLOWED_PLACE_TYPE_ORDER),
                -float(store.composite_score or 0.0),
                store.name.lower(),
            )
        )
        return stores

    async def refresh_city_directory(
        self,
        *,
        city: str,
        center_lat: float,
        center_lng: float,
        radius_meters: int = 12000,
        max_results: int = 240,
    ) -> DirectoryRefreshResponse:
        if not self._places_api_key:
            raise ValueError("Google Places API key is not configured on backend")

        city_name = str(city or "").strip()
        if not city_name:
            raise ValueError("city is required")
        city_key = normalize_city_key(city_name)
        sweep_centers = build_city_sweep_centers(center_lat, center_lng, radius_meters)
        query_specs = city_sweep_queries()
        source_queries = [
            ",".join(spec.get("included_types", [])) if spec.get("kind") == "nearby" else str(spec.get("query") or "")
            for spec in query_specs
        ]
        logger.info(
            "[shop-directory] refresh city=%s city_key=%s centers=%s queries=%s",
            city_name,
            city_key,
            len(sweep_centers),
            len(query_specs),
        )

        semaphore = asyncio.Semaphore(3)

        async def run_search(center: tuple[float, float], spec: dict[str, Any]) -> list[dict[str, Any]]:
            async with semaphore:
                if spec.get("kind") == "nearby":
                    return await self._fetch_places_nearby(
                        lat=center[0],
                        lng=center[1],
                        radius_meters=2000,
                        max_results=20,
                        included_types=[str(value) for value in (spec.get("included_types") or [])],
                    )
                return await self._fetch_places_text_search(
                    text_query=str(spec.get("query") or ""),
                    lat=center[0],
                    lng=center[1],
                    radius_meters=2000,
                    max_results=20,
                )

        search_results = await asyncio.gather(
            *[run_search(center, spec) for center in sweep_centers for spec in query_specs],
            return_exceptions=True,
        )

        raw_places: list[dict[str, Any]] = []
        for result in search_results:
            if isinstance(result, Exception):
                logger.exception("City sweep search failed", exc_info=result)
                continue
            raw_places.extend(result)
        deduped_places = dedupe_places_by_id(raw_places)

        eligible_places: list[dict[str, Any]] = []
        for place in deduped_places:
            matched_type = self._matched_allowed_type(place)
            if not matched_type:
                continue
            enriched = dict(place)
            enriched["_matched_allowed_type"] = matched_type
            eligible_places.append(enriched)
        eligible_places = eligible_places[: max_results]
        hydrated_places = await self._hydrate_places_with_reviews(eligible_places)

        async def evaluate_place(place: dict[str, Any]) -> GlobalStoreDirectoryEntry:
            ai_eval = await self._evaluate_store(place, allow_remote=True)
            google_categories = [
                clean_google_type(value)
                for value in (place.get("types") or [])
                if clean_google_type(value)
            ]
            category_label = str(place.get("primary_type_display_name") or "").strip() or (
                google_categories[0] if google_categories else None
            )
            return GlobalStoreDirectoryEntry(
                id=str(place.get("id") or ""),
                city=city_name,
                city_key=city_key,
                name=str(place.get("name") or "Local store"),
                lat=float(place.get("lat") or 0.0),
                lng=float(place.get("lng") or 0.0),
                distance_meters=float(place.get("distance_meters") or 0.0),
                google_categories=google_categories,
                category=category_label,
                address=str(place.get("address") or "").strip() or None,
                rating=float(place.get("rating")) if place.get("rating") is not None else None,
                ai_evaluation=ai_eval,
                composite_score=round(float(ai_eval.sustainability_score or 0), 4),
                source_queries=source_queries,
            )

        stores = await self._evaluate_directory_places_slowly(
            places=hydrated_places,
            evaluate_place=evaluate_place,
        )
        self._gateway.upsert_directory_stores(city_key, stores)
        return DirectoryRefreshResponse(
            city=city_name,
            city_key=city_key,
            refreshed_count=len(stores),
            source_query_count=len(source_queries),
        )

    async def match_item_to_stores(
        self,
        *,
        user_id: str,
        wishlist_item_id: str,
        lat: float,
        lng: float,
        radius_meters: int = 12000,
        limit: int = 5,
    ) -> list[EnrichedStore]:
        wishlist_item = self._find_wishlist_item(user_id, wishlist_item_id)
        if wishlist_item is None:
            raise KeyError(f"wishlist item not found: {wishlist_item_id}")

        enriched_stores = await self.get_nearby_shops(
            lat=lat,
            lng=lng,
            radius_meters=radius_meters,
            user_id=user_id,
        )
        if not enriched_stores:
            return []

        matched = [
            self._apply_heuristic_match(store, wishlist_item)
            for store in enriched_stores
        ]
        matched = [store for store in matched if store.match_score > 0.0]
        if not matched:
            matched = [
                store.model_copy(
                    update={
                        "match_score": round(max(0.05, float(store.wishlist_relevance or 0.0)), 4),
                        "match_reason": (
                            f"Scout says this is still one of the better nearby bets for a "
                            f"{wishlist_item.category.lower()}."
                        ),
                    }
                )
                for store in enriched_stores[: max(3, min(limit, 5))]
            ]

        allow_remote = self._client is not None and len(matched) <= 8 and radius_meters <= 15_000
        if allow_remote:
            matched = await self._refine_item_matches_with_llm(wishlist_item, matched)

        matched.sort(
            key=lambda store: (
                -float(store.match_score or 0.0),
                -float(store.wishlist_relevance or 0.0),
                -float(store.composite_score or 0.0),
                float(store.distance_meters or 0.0),
            )
        )
        return matched[: max(1, min(limit, 10))]

    async def _fetch_places_nearby(
        self,
        *,
        lat: float,
        lng: float,
        radius_meters: int,
        max_results: int,
        included_types: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        endpoint = "https://places.googleapis.com/v1/places:searchNearby"
        payload = {
            "includedTypes": included_types or ["clothing_store", "store"],
            "maxResultCount": max_results,
            "rankPreference": "DISTANCE",
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": radius_meters,
                }
            },
        }
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self._places_api_key,
            "X-Goog-FieldMask": (
                "places.id,places.displayName,places.location,places.formattedAddress,"
                "places.rating,places.primaryType,places.primaryTypeDisplayName,"
                "places.types"
            ),
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(endpoint, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        rows = data.get("places") if isinstance(data, dict) else None
        return parse_places_rows(rows, origin_lat=lat, origin_lng=lng)

    async def _fetch_places_text_search(
        self,
        *,
        text_query: str,
        lat: float,
        lng: float,
        radius_meters: int,
        max_results: int,
    ) -> list[dict[str, Any]]:
        query = str(text_query or "").strip()
        if not query:
            return []
        endpoint = "https://places.googleapis.com/v1/places:searchText"
        payload = {
            "textQuery": query,
            "pageSize": max_results,
            "locationBias": {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": radius_meters,
                }
            },
        }
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self._places_api_key,
            "X-Goog-FieldMask": (
                "places.id,places.displayName,places.location,places.formattedAddress,"
                "places.rating,places.primaryType,places.primaryTypeDisplayName,"
                "places.types"
            ),
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(endpoint, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
        rows = data.get("places") if isinstance(data, dict) else None
        return parse_places_rows(rows, origin_lat=lat, origin_lng=lng)

    async def _hydrate_places_with_reviews(
        self, places: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        semaphore = asyncio.Semaphore(6)

        async def load_one(base: dict[str, Any]) -> dict[str, Any]:
            place_id = str(base.get("id") or "").strip()
            if not place_id:
                return base
            async with semaphore:
                try:
                    details = await self._fetch_place_details(place_id)
                except Exception:
                    logger.exception("Places details fetch failed for place_id=%s", place_id)
                    return base
            merged = dict(base)
            if details:
                merged.update({k: v for k, v in details.items() if v is not None})
            return merged

        return await asyncio.gather(*[load_one(row) for row in places])

    async def _fetch_place_details(self, place_id: str) -> dict[str, Any]:
        endpoint = f"https://places.googleapis.com/v1/places/{quote(place_id, safe='')}"
        headers = {
            "X-Goog-Api-Key": self._places_api_key,
            "X-Goog-FieldMask": (
                "id,displayName,location,formattedAddress,rating,primaryType,"
                "primaryTypeDisplayName,types,reviews"
            ),
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(endpoint, headers=headers)
            response.raise_for_status()
            payload = response.json()

        location = payload.get("location") if isinstance(payload, dict) else {}
        return {
            "name": str((payload.get("displayName") or {}).get("text") or "").strip() or None,
            "lat": float(location.get("latitude"))
            if isinstance(location, dict) and location.get("latitude") is not None
            else None,
            "lng": float(location.get("longitude"))
            if isinstance(location, dict) and location.get("longitude") is not None
            else None,
            "address": str(payload.get("formattedAddress") or "").strip() or None,
            "rating": float(payload.get("rating"))
            if isinstance(payload, dict) and payload.get("rating") is not None
            else None,
            "primary_type": str(payload.get("primaryType") or "").strip() or None,
            "primary_type_display_name": str(
                (payload.get("primaryTypeDisplayName") or {}).get("text") or ""
            ).strip()
            or None,
            "types": payload.get("types") if isinstance(payload.get("types"), list) else None,
            "reviews": extract_review_texts(payload.get("reviews")),
        }

    def _load_wishlist_items(self, user_id: str | None) -> list[WishlistItem]:
        if not user_id:
            return []
        try:
            return list(self._gateway.list_wishlist(user_id))
        except Exception:
            logger.exception("Failed to load wishlist for user_id=%s", user_id)
            return []

    def _find_wishlist_item(self, user_id: str, wishlist_item_id: str) -> WishlistItem | None:
        target_id = str(wishlist_item_id or "").strip()
        if not user_id or not target_id:
            return None
        for item in self._load_wishlist_items(user_id):
            if str(item.id or "").strip() == target_id:
                return item
        return None

    def _load_favorite_store_ids(self, user_id: str | None) -> set[str]:
        if not user_id:
            return set()
        try:
            rows = self._gateway.list_favorite_stores(user_id)
            return {str(row.store_id).strip() for row in rows if str(row.store_id).strip()}
        except Exception:
            logger.exception("Failed to load favorite stores for user_id=%s", user_id)
            return set()

    def _load_cached_shops(
        self,
        *,
        user_id: str | None,
        lat: float,
        lng: float,
        radius_meters: int,
        total_limit: int,
    ) -> list[EnrichedStore]:
        if not user_id:
            return []
        try:
            rows = self._gateway.list_cached_shops(user_id)
        except Exception:
            logger.exception("Failed to load cached shops for user_id=%s", user_id)
            return []
        if not rows:
            return []
        now = datetime.now(tz=timezone.utc)
        cutoff_seconds = self._shop_cache_ttl_seconds
        filtered: list[EnrichedStore] = []
        for row in rows:
            try:
                cached_at = datetime.fromisoformat(str(row.cached_at))
            except Exception:
                continue
            if cached_at.tzinfo is None:
                cached_at = cached_at.replace(tzinfo=timezone.utc)
            age_seconds = (now - cached_at).total_seconds()
            if age_seconds > cutoff_seconds:
                continue
            if haversine_meters(lat, lng, row.lat, row.lng) > radius_meters * 1.15:
                continue
            filtered.append(
                EnrichedStore.model_validate(
                    row.model_dump(exclude={"cached_at"})
                )
            )
        filtered.sort(
            key=lambda shop: (
                ALLOWED_PLACE_TYPE_ORDER.index(normalize_google_type_token(shop.category))
                if normalize_google_type_token(shop.category) in ALLOWED_PLACE_TYPES
                else len(ALLOWED_PLACE_TYPE_ORDER),
                -shop.composite_score,
                shop.distance_meters,
            )
        )
        return filtered[:total_limit]

    def _load_directory_shops(
        self,
        *,
        city: str,
        user_id: str | None,
        lat: float,
        lng: float,
        radius_meters: int,
        total_limit: int,
    ) -> list[EnrichedStore]:
        city_key = normalize_city_key(city)
        try:
            rows = self._gateway.list_directory_stores(city_key)
        except Exception:
            logger.exception("Failed to load directory stores for city=%s city_key=%s", city, city_key)
            return []
        if not rows:
            return []
        favorite_store_ids = self._load_favorite_store_ids(user_id)
        filtered: list[EnrichedStore] = []
        for row in rows:
          distance_meters = haversine_meters(lat, lng, row.lat, row.lng)
          if distance_meters > radius_meters * 1.15:
              continue
          filtered.append(
              EnrichedStore.model_validate(
                  {
                      **row.model_dump(exclude={"city", "city_key", "last_updated", "source_queries"}),
                      "distance_meters": distance_meters,
                      "is_favorite": row.id in favorite_store_ids or bool(row.is_favorite),
                  }
              )
          )
        filtered.sort(
            key=lambda store: (
                0 if store.is_favorite else 1,
                ALLOWED_PLACE_TYPE_ORDER.index(normalize_google_type_token(store.category))
                if normalize_google_type_token(store.category) in ALLOWED_PLACE_TYPES
                else len(ALLOWED_PLACE_TYPE_ORDER),
                -float(store.composite_score or 0.0),
                float(store.distance_meters or 0.0),
            )
        )
        return filtered[:total_limit]

    def _save_cached_shops(self, user_id: str | None, shops: list[EnrichedStore]) -> None:
        if not user_id or not shops:
            return
        try:
            rows = [
                CachedShopStore.model_validate(
                    {
                        **shop.model_dump(),
                        "cached_at": datetime.now(tz=timezone.utc).isoformat(),
                    }
                )
                for shop in shops
            ]
            self._gateway.upsert_cached_shops(user_id, rows)
        except Exception:
            logger.exception("Failed to save cached shops for user_id=%s", user_id)

    def _matched_allowed_type(self, place: dict[str, Any]) -> str | None:
        name = normalize_text(place.get("name"))
        address = normalize_text(place.get("address"))
        haystack = f"{name} {address}"
        if any(hint in haystack for hint in EXCLUDED_NAME_HINTS):
            return None

        type_tokens: set[str] = set()
        primary_type = normalize_google_type_token(place.get("primary_type"))
        if primary_type:
            type_tokens.add(primary_type)
        primary_type_display_name = normalize_google_type_token(
            place.get("primary_type_display_name")
        )
        if primary_type_display_name:
            type_tokens.add(primary_type_display_name)
        for value in (place.get("types") or []):
            token = normalize_google_type_token(value)
            if token:
                type_tokens.add(token)

        if not type_tokens:
            return None
        if type_tokens.intersection(EXCLUDED_PLACE_TYPES):
            return None
        for allowed in ALLOWED_PLACE_TYPE_ORDER:
            if allowed in type_tokens:
                return allowed
        if type_tokens.intersection(ALLOWED_PLACE_TYPES):
            for token in sorted(type_tokens):
                if token in ALLOWED_PLACE_TYPES:
                    return token
        return None

    async def _evaluate_store(
        self, place: dict[str, Any], *, allow_remote: bool = True
    ) -> AIStoreEvaluation:
        place_id = str(place.get("id") or "").strip()
        embedded_cached_eval = place.get("_cached_ai_evaluation")
        if isinstance(embedded_cached_eval, AIStoreEvaluation):
            return AIStoreEvaluation(
                vibe_check=embedded_cached_eval.vibe_check,
                best_for=list(embedded_cached_eval.best_for),
                sustainability_score=enforce_circular_score_floor(
                    place, embedded_cached_eval.sustainability_score
                ),
            )
        now = time.time()
        if place_id:
            cached = self._evaluation_cache.get(place_id)
            if cached and (now - cached[0]) <= self._evaluation_ttl_seconds:
                return cached[1]

        def cache_and_return(value: AIStoreEvaluation) -> AIStoreEvaluation:
            normalized = AIStoreEvaluation(
                vibe_check=value.vibe_check,
                best_for=list(value.best_for),
                sustainability_score=enforce_circular_score_floor(
                    place, value.sustainability_score
                ),
            )
            if place_id:
                self._evaluation_cache[place_id] = (time.time(), normalized)
            return normalized

        if self._client is None or not allow_remote:
            return cache_and_return(self._heuristic_evaluation(place))

        prompt = (
            "Analyze this clothing store and return strict JSON only with keys: "
            "vibe_check (string), best_for (array of 2-3 hashtag tags), "
            "sustainability_score (integer 1-100). "
            "Score 100 for thrift/consignment/vintage/circular economy. "
            "Score low for fast-fashion chains. "
            f"Store name: {place.get('name')}. "
            f"Primary type: {place.get('primary_type')}. "
            f"Google types: {json.dumps(place.get('types') or [])}. "
            f"Address: {place.get('address')}. "
            f"Rating: {place.get('rating')}. "
            f"Top reviews: {json.dumps(place.get('reviews') or [])}."
        )
        try:
            response = await self._generate_store_evaluation_with_backoff(
                prompt=prompt,
                place_id=place_id or str(place.get("id") or ""),
            )
            parsed = safe_json_store_response(getattr(response, "text", "") or "")
            if not parsed:
                return cache_and_return(self._heuristic_evaluation(place))
            vibe = str(parsed.get("vibe_check") or "").strip()
            if not vibe:
                vibe = self._heuristic_evaluation(place).vibe_check
            raw_tags = parsed.get("best_for")
            tags: list[str] = []
            if isinstance(raw_tags, list):
                for row in raw_tags:
                    tag = to_hashtag(str(row))
                    if tag and tag not in tags:
                        tags.append(tag)
                    if len(tags) >= 3:
                        break
            if not tags:
                tags = self._heuristic_evaluation(place).best_for
            score_raw = parsed.get("sustainability_score")
            try:
                score = int(score_raw)
            except Exception:
                score = self._heuristic_evaluation(place).sustainability_score
            score = max(1, min(100, score))
            return cache_and_return(
                AIStoreEvaluation(
                    vibe_check=vibe,
                    best_for=tags,
                    sustainability_score=score,
                )
            )
        except Exception:
            logger.exception("Shop AI evaluation failed for place_id=%s", place.get("id"))
            return cache_and_return(self._heuristic_evaluation(place))

    async def _generate_store_evaluation_with_backoff(
        self,
        *,
        prompt: str,
        place_id: str,
    ) -> Any:
        delay_seconds = 1.0
        last_error: Exception | None = None
        for attempt in range(1, 4):
            try:
                return await asyncio.to_thread(
                    self._client.models.generate_content,
                    model=self._settings.gemini_model,
                    contents=prompt,
                )
            except Exception as exc:
                last_error = exc
                if attempt >= 3 or not is_rate_limit_error(exc):
                    raise
                logger.warning(
                    "Shop AI rate limited for place_id=%s attempt=%s; retrying in %.1fs",
                    place_id,
                    attempt,
                    delay_seconds,
                )
                await asyncio.sleep(delay_seconds)
                delay_seconds *= 2
        if last_error is not None:
            raise last_error
        raise RuntimeError("Store evaluation failed without an error")

    async def _evaluate_directory_places_slowly(
        self,
        *,
        places: list[dict[str, Any]],
        evaluate_place: Any,
    ) -> list[GlobalStoreDirectoryEntry]:
        batch_size = max(1, int(self._settings.shop_directory_enrichment_batch_size or 3))
        batch_delay = max(0.0, float(self._settings.shop_directory_enrichment_batch_delay_seconds or 0.0))
        stores: list[GlobalStoreDirectoryEntry] = []
        for index in range(0, len(places), batch_size):
            batch = places[index : index + batch_size]
            evaluated = await asyncio.gather(
                *[evaluate_place(place) for place in batch],
                return_exceptions=True,
            )
            for row in evaluated:
                if isinstance(row, GlobalStoreDirectoryEntry):
                    stores.append(row)
                elif isinstance(row, Exception):
                    logger.exception("Directory enrichment failed during slow batch", exc_info=row)
            if index + batch_size < len(places) and batch_delay > 0:
                await asyncio.sleep(batch_delay)
        return stores

    def _heuristic_evaluation(self, place: dict[str, Any]) -> AIStoreEvaluation:
        name = normalize_text(place.get("name"))
        types = [normalize_text(value) for value in (place.get("types") or []) if normalize_text(value)]
        reviews = " ".join(
            [normalize_text(value) for value in (place.get("reviews") or []) if normalize_text(value)]
        )
        haystack = f"{name} {' '.join(types)} {reviews}"

        circular_tokens = {
            "thrift",
            "vintage",
            "consignment",
            "charity",
            "resale",
            "secondhand",
            "used",
        }
        fast_fashion_tokens = {
            "zara",
            "h&m",
            "h & m",
            "h and m",
            "shein",
            "primark",
            "forever21",
            "boohoo",
            "fashion nova",
        }

        circular_hits = sum(
            1 for token in circular_tokens if re.search(rf"\b{re.escape(token)}\b", haystack)
        )
        fast_hits = sum(
            1 for token in fast_fashion_tokens if re.search(rf"\b{re.escape(token)}\b", haystack)
        )
        if is_circular_place_type(place):
            score = 94
        elif circular_hits > 0 and fast_hits == 0:
            score = min(98, 80 + circular_hits * 6)
        elif fast_hits > 0 and circular_hits == 0:
            score = max(8, 28 - fast_hits * 4)
        elif circular_hits > 0 and fast_hits > 0:
            score = 58
        else:
            score = 62

        vibe = "Mixed clothing inventory with variable quality; check pieces in person."
        if "vintage" in haystack:
            vibe = "Curated vintage-heavy selection with standout statement pieces."
        elif "thrift" in haystack or "charity" in haystack:
            vibe = "Budget-friendly thrift selection with rotating everyday basics."
        elif fast_hits > 0:
            vibe = "Mainstream trend-focused stock with lower circularity."

        tags: list[str] = []
        if "vintage" in haystack:
            tags.extend(["#vintage", "#statement-pieces"])
        if "thrift" in haystack or "charity" in haystack:
            tags.extend(["#budget-finds", "#daily-basics"])
        if "denim" in haystack:
            tags.append("#denim")
        if not tags:
            tags = ["#basics", "#everyday"]

        deduped: list[str] = []
        for tag in tags:
            normalized = to_hashtag(tag)
            if normalized and normalized not in deduped:
                deduped.append(normalized)
            if len(deduped) >= 3:
                break

        return AIStoreEvaluation(
            vibe_check=vibe,
            best_for=deduped,
            sustainability_score=max(1, min(100, int(score))),
        )

    def _wishlist_relevance(
        self,
        *,
        place: dict[str, Any],
        ai_eval: AIStoreEvaluation,
        wishlist_items: list[WishlistItem],
    ) -> float:
        if not wishlist_items:
            return 0.0
        haystack = " ".join(
            [
                str(place.get("name") or ""),
                str(place.get("primary_type") or ""),
                str(place.get("primary_type_display_name") or ""),
                " ".join([str(value) for value in (place.get("types") or [])]),
                " ".join([str(value) for value in (place.get("reviews") or [])]),
                ai_eval.vibe_check,
                " ".join(ai_eval.best_for),
            ]
        ).lower()

        tokens: set[str] = set()
        for item in wishlist_items:
            tokens.update(tokenize(item.category or ""))
            tokens.update(tokenize(item.color or ""))
            tokens.update(tokenize(item.size or ""))
            tokens.update(tokenize(item.notes or ""))
        if not tokens:
            return 0.0

        matched = sum(1 for token in tokens if token in haystack)
        baseline = max(2, min(10, len(tokens)))
        score = matched / baseline
        return max(0.0, min(1.0, round(score, 4)))

    def _apply_heuristic_match(
        self,
        store: EnrichedStore,
        wishlist_item: WishlistItem,
    ) -> EnrichedStore:
        haystack_parts = [
            store.name,
            store.category,
            store.address,
            *(store.google_categories or []),
            store.ai_evaluation.vibe_check,
            *(store.ai_evaluation.best_for or []),
        ]
        haystack = " ".join([str(value) for value in haystack_parts if value]).lower()
        category_tokens = tokenize(wishlist_item.category or "")
        color_tokens = tokenize(wishlist_item.color or "")
        size_tokens = tokenize(wishlist_item.size or "")
        note_tokens = tokenize(wishlist_item.notes or "")

        category_hits = [token for token in category_tokens if token in haystack]
        color_hits = [token for token in color_tokens if token in haystack]
        detail_hits = [token for token in (*size_tokens, *note_tokens) if token in haystack]

        match_score = 0.0
        match_score += min(0.5, 0.22 * len(category_hits))
        match_score += min(0.12, 0.06 * len(color_hits))
        match_score += min(0.18, 0.06 * len(detail_hits))
        match_score += min(0.16, float(store.wishlist_relevance or 0.0) * 0.22)
        match_score += min(0.1, normalize_rating(store.rating) * 0.1)
        if is_circular_store_record(store):
            match_score += 0.1
        if any(tag.replace("#", "") in haystack for tag in (store.ai_evaluation.best_for or [])):
            match_score += 0.08

        match_score = max(0.0, min(1.0, round(match_score, 4)))
        return store.model_copy(
            update={
                "match_score": match_score,
                "match_reason": self._heuristic_match_reason(
                    store=store,
                    wishlist_item=wishlist_item,
                    category_hits=category_hits,
                    color_hits=color_hits,
                    detail_hits=detail_hits,
                ),
            }
        )

    def _heuristic_match_reason(
        self,
        *,
        store: EnrichedStore,
        wishlist_item: WishlistItem,
        category_hits: list[str],
        color_hits: list[str],
        detail_hits: list[str],
    ) -> str:
        item_label = (wishlist_item.category or "wishlist piece").strip().lower()
        if category_hits and detail_hits:
            return (
                f"Scout says this store's {store.ai_evaluation.vibe_check.lower()} energy fits your "
                f"{item_label} search, especially for {detail_hits[0]} pieces."
            )
        if category_hits and store.ai_evaluation.best_for:
            best_tag = str(store.ai_evaluation.best_for[0] or "").replace("#", "").replace("-", " ")
            if best_tag:
                return (
                    f"Scout says this is a strong stop for a {item_label} because the store leans "
                    f"toward {best_tag} finds."
                )
        if color_hits:
            return (
                f"Scout says this shop is worth checking first for a {wishlist_item.color or ''} "
                f"{item_label} based on its current mix."
            ).replace("  ", " ").strip()
        if is_circular_store_record(store) and (store.rating or 0) >= 4.2:
            return (
                f"Scout says this well-rated secondhand spot is one of the safest nearby bets for a "
                f"{item_label}."
            )
        return f"Scout says this is one of the better nearby bets for a {item_label}."

    async def _refine_item_matches_with_llm(
        self,
        wishlist_item: WishlistItem,
        stores: list[EnrichedStore],
    ) -> list[EnrichedStore]:
        if self._client is None or not stores:
            return stores
        store_payload = [
            {
                "id": store.id,
                "name": store.name,
                "category": store.category,
                "distance_meters": round(float(store.distance_meters or 0.0), 1),
                "rating": store.rating,
                "vibe_check": store.ai_evaluation.vibe_check,
                "best_for": store.ai_evaluation.best_for,
                "sustainability_score": store.ai_evaluation.sustainability_score,
                "heuristic_match_score": round(float(store.match_score or 0.0), 4),
                "heuristic_match_reason": store.match_reason,
            }
            for store in stores[:8]
        ]
        prompt = (
            "You are a personal shopper. Rank local secondhand stores for one wishlist item. "
            "Return strict JSON only with shape "
            '{"matches":[{"id":"store-id","match_score":0.0,"match_reason":"one short sentence"}]}. '
            "Keep match_score between 0 and 1. Prefer concrete reasons. "
            f"Wishlist item: {json.dumps(wishlist_item.model_dump(), ensure_ascii=False)}. "
            f"Stores: {json.dumps(store_payload, ensure_ascii=False)}."
        )
        try:
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=self._settings.gemini_model,
                contents=prompt,
            )
            parsed = safe_json_store_response(getattr(response, "text", "") or "")
            raw_matches = parsed.get("matches") if isinstance(parsed, dict) else None
            if not isinstance(raw_matches, list):
                return stores
            by_id: dict[str, dict[str, Any]] = {}
            for row in raw_matches:
                if not isinstance(row, dict):
                    continue
                store_id = str(row.get("id") or "").strip()
                if store_id:
                    by_id[store_id] = row
            refined: list[EnrichedStore] = []
            for store in stores:
                payload = by_id.get(store.id)
                if not payload:
                    refined.append(store)
                    continue
                try:
                    match_score = float(payload.get("match_score"))
                except Exception:
                    match_score = float(store.match_score or 0.0)
                match_score = max(0.0, min(1.0, match_score))
                match_reason = str(payload.get("match_reason") or "").strip() or store.match_reason
                refined.append(
                    store.model_copy(
                        update={
                            "match_score": round(match_score, 4),
                            "match_reason": match_reason,
                        }
                    )
                )
            return refined
        except Exception:
            logger.exception(
                "Shop item-match refinement failed wishlist_item_id=%s",
                wishlist_item.id,
            )
            return stores
