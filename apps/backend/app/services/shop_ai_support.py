from __future__ import annotations

import math
import re
from typing import Any

from app.models import AIStoreEvaluation, EnrichedStore
from app.services.text_utils import normalize_text, safe_json_object

ALLOWED_PLACE_TYPE_ORDER: list[str] = [
    "thrift_store",
    "used_clothing_store",
    "secondhand_store",
    "seconhand_store",
    "consignment_shop",
    "consignment_store",
    "vintage_clothing_store",
    "charity_shop",
    "resale_store",
    "clothing_store",
    "clothing_shop",
    "fashion_accessories_store",
]
ALLOWED_PLACE_TYPES = set(ALLOWED_PLACE_TYPE_ORDER)
EXCLUDED_PLACE_TYPES = {"pharmacy", "drugstore"}
EXCLUDED_NAME_HINTS = {"pharmacy", "pharmacie", "drugstore", "apotheke"}


def is_rate_limit_error(error: Exception) -> bool:
    message = str(error or "").lower()
    return (
        "429" in message
        or "resource_exhausted" in message
        or "rate limit" in message
        or "quota" in message
        or "too many requests" in message
    )


def safe_json_store_response(text: str) -> dict[str, Any] | None:
    return safe_json_object(text)


def to_hashtag(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", normalize_text(value)).strip("-")
    return f"#{cleaned}" if cleaned else ""


def tokenize(value: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9]+", normalize_text(value)) if len(token) >= 3}


def haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    earth_radius = 6_371_000.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    x_lat = math.radians(lat1)
    y_lat = math.radians(lat2)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(x_lat) * math.cos(y_lat) * math.sin(d_lng / 2) ** 2
    )
    return 2 * earth_radius * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def offset_lat_lng(lat: float, lng: float, north_meters: float, east_meters: float) -> tuple[float, float]:
    lat_delta = north_meters / 111_320.0
    lng_scale = max(0.2, math.cos(math.radians(lat)))
    lng_delta = east_meters / (111_320.0 * lng_scale)
    next_lat = max(-85.0, min(85.0, lat + lat_delta))
    next_lng = lng + lng_delta
    if next_lng > 180.0:
        next_lng -= 360.0
    elif next_lng < -180.0:
        next_lng += 360.0
    return next_lat, next_lng


def search_centers(lat: float, lng: float, radius_meters: int) -> list[tuple[float, float]]:
    centers: list[tuple[float, float]] = [(lat, lng)]
    if radius_meters < 12_000:
        return centers
    step = radius_meters * 0.55
    centers.extend(
        offset_lat_lng(lat, lng, north, east)
        for north, east in ((step, 0.0), (-step, 0.0), (0.0, step), (0.0, -step))
    )
    if radius_meters >= 20_000:
        diagonal_step = radius_meters * 0.42
        centers.extend(
            offset_lat_lng(lat, lng, north, east)
            for north, east in (
                (diagonal_step, diagonal_step),
                (diagonal_step, -diagonal_step),
                (-diagonal_step, diagonal_step),
                (-diagonal_step, -diagonal_step),
            )
        )
    return centers


def cached_shop_to_place(shop: EnrichedStore) -> dict[str, Any]:
    return {
        "id": shop.id,
        "name": shop.name,
        "lat": shop.lat,
        "lng": shop.lng,
        "address": shop.address,
        "rating": shop.rating,
        "primary_type": normalize_google_type_token(shop.category),
        "primary_type_display_name": shop.category,
        "types": list(shop.google_categories or []),
        "distance_meters": shop.distance_meters,
        "reviews": [],
        "_cached_ai_evaluation": shop.ai_evaluation,
        "_cached_is_favorite": shop.is_favorite,
        "_cached_composite_score": shop.composite_score,
        "_cached_wishlist_relevance": shop.wishlist_relevance,
        "_cached_match_reason": shop.match_reason,
        "_cached_match_score": shop.match_score,
    }


def is_circular_place_type(place: dict[str, Any]) -> bool:
    matched_type = str(place.get("_matched_allowed_type") or "").strip()
    circular_types = {
        "thrift_store",
        "used_clothing_store",
        "secondhand_store",
        "seconhand_store",
        "consignment_shop",
        "consignment_store",
        "vintage_clothing_store",
        "charity_shop",
        "resale_store",
    }
    if matched_type in circular_types:
        return True
    type_tokens = {
        normalize_google_type_token(place.get("primary_type")),
        normalize_google_type_token(place.get("primary_type_display_name")),
        *[normalize_google_type_token(value) for value in (place.get("types") or [])],
    }
    type_tokens.discard("")
    return any(token in circular_types for token in type_tokens)


def enforce_circular_score_floor(place: dict[str, Any], score: int) -> int:
    return max(score, 92) if is_circular_place_type(place) else score


def clean_google_type(value: str) -> str:
    raw = str(value or "").strip()
    return raw.replace("_", " ").strip() if raw else ""


def normalize_google_type_token(value: Any) -> str:
    token = normalize_text(value)
    if not token:
        return ""
    token = token.replace("&", "and").replace("-", "_").replace(" ", "_")
    return re.sub(r"_+", "_", token).strip("_")


def extract_review_texts(raw_reviews: Any, limit: int = 5) -> list[str]:
    if not isinstance(raw_reviews, list):
        return []
    reviews: list[str] = []
    for row in raw_reviews:
        if not isinstance(row, dict):
            continue
        text_obj = row.get("text")
        text = str(text_obj.get("text") or "").strip() if isinstance(text_obj, dict) else str(text_obj or "").strip()
        if not text:
            alt = row.get("originalText")
            text = str(alt.get("text") or "").strip() if isinstance(alt, dict) else str(alt or "").strip()
        if not text:
            continue
        reviews.append(re.sub(r"\s+", " ", text)[:260])
        if len(reviews) >= limit:
            break
    return reviews


def parse_places_rows(rows: Any, *, origin_lat: float, origin_lng: float) -> list[dict[str, Any]]:
    if not isinstance(rows, list):
        return []
    output: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        location = row.get("location") if isinstance(row.get("location"), dict) else {}
        place_lat = location.get("latitude")
        place_lng = location.get("longitude")
        if place_lat is None or place_lng is None:
            continue
        place_id = str(row.get("id") or "").strip()
        if not place_id:
            continue
        distance_value = row.get("distanceMeters")
        distance_meters = (
            float(distance_value)
            if distance_value is not None
            else haversine_meters(origin_lat, origin_lng, float(place_lat), float(place_lng))
        )
        output.append(
            {
                "id": place_id,
                "name": str((row.get("displayName") or {}).get("text") or "").strip() or "Local store",
                "lat": float(place_lat),
                "lng": float(place_lng),
                "address": str(row.get("formattedAddress") or "").strip(),
                "rating": float(row.get("rating")) if row.get("rating") is not None else None,
                "primary_type": str(row.get("primaryType") or "").strip(),
                "primary_type_display_name": str((row.get("primaryTypeDisplayName") or {}).get("text") or "").strip(),
                "types": row.get("types") if isinstance(row.get("types"), list) else [],
                "distance_meters": distance_meters,
                "reviews": [],
            }
        )
    return output


def normalize_rating(rating: float | None) -> float:
    if rating is None:
        return 0.0
    numeric = float(rating)
    if not math.isfinite(numeric):
        return 0.0
    return max(0.0, min(1.0, numeric / 5.0))


def is_circular_store_record(store: EnrichedStore) -> bool:
    haystack = " ".join([store.category or "", *(store.google_categories or []), store.name or ""]).lower()
    return any(
        token in haystack
        for token in ("thrift", "used clothing", "secondhand", "consignment", "vintage", "charity", "resale")
    )


def coerce_ai_evaluation(place: dict[str, Any], evaluation: AIStoreEvaluation) -> AIStoreEvaluation:
    return AIStoreEvaluation(
        vibe_check=evaluation.vibe_check,
        best_for=list(evaluation.best_for),
        sustainability_score=enforce_circular_score_floor(place, evaluation.sustainability_score),
    )
