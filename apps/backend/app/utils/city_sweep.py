from __future__ import annotations

import math
import re
from typing import Any


def normalize_city_key(city: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", str(city or "").strip().lower()).strip("-")
    return normalized or "unknown-city"


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


def build_city_sweep_centers(
    center_lat: float,
    center_lng: float,
    radius_meters: int,
    *,
    search_radius_meters: int = 2000,
    overlap_ratio: float = 0.75,
) -> list[tuple[float, float]]:
    safe_radius = max(1000, int(radius_meters))
    step = max(600.0, search_radius_meters * overlap_ratio)
    max_ring = max(0, math.ceil(safe_radius / step))
    centers: list[tuple[float, float]] = []
    seen: set[tuple[int, int]] = set()
    for row in range(-max_ring, max_ring + 1):
        for col in range(-max_ring, max_ring + 1):
            north_meters = row * step
            east_meters = col * step
            if math.hypot(north_meters, east_meters) > safe_radius + search_radius_meters * 0.8:
                continue
            next_lat, next_lng = offset_lat_lng(center_lat, center_lng, north_meters, east_meters)
            key = (round(next_lat * 100000), round(next_lng * 100000))
            if key in seen:
                continue
            seen.add(key)
            centers.append((next_lat, next_lng))
    if not centers:
        return [(center_lat, center_lng)]
    return centers


def city_sweep_queries() -> list[dict[str, Any]]:
    return [
        {"kind": "nearby", "included_types": ["clothing_store"]},
        {"kind": "text", "query": "thrift clothing store"},
        {"kind": "text", "query": "vintage clothing store"},
        {"kind": "text", "query": "consignment clothing store"},
    ]


def dedupe_places_by_id(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: dict[str, dict[str, Any]] = {}
    for row in rows:
        place_id = str(row.get("id") or "").strip()
        if not place_id:
            continue
        existing = deduped.get(place_id)
        if existing is None:
            deduped[place_id] = row
            continue
        current_distance = float(row.get("distance_meters") or 0.0)
        existing_distance = float(existing.get("distance_meters") or 0.0)
        if current_distance and (not existing_distance or current_distance < existing_distance):
            deduped[place_id] = row
    return list(deduped.values())
