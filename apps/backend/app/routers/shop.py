import logging

from fastapi import APIRouter, Depends, HTTPException

from app.authz import enforce_admin_access, enforce_optional_user_access
from app.models import (
    DirectoryRefreshRequest,
    DirectoryRefreshResponse,
    EnrichedStore,
    GlobalStoreDirectoryEntry,
    ShopMatchRequest,
)
from app.runtime import shop_ai_service
from app.services.auth import AuthContext, get_auth_context

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/v1/shops/nearby", response_model=list[EnrichedStore])
async def get_nearby_shops(
    lat: float,
    lng: float,
    radius: int = 5000,
    city: str | None = None,
    user_id: str | None = None,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> list[EnrichedStore]:
    bounded_radius = max(500, min(radius, 50_000))
    resolved_user_id = enforce_optional_user_access(auth_ctx, user_id)
    try:
        return await shop_ai_service.get_nearby_shops(
            lat=lat,
            lng=lng,
            radius_meters=bounded_radius,
            user_id=resolved_user_id,
            city=(city or "").strip() or None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "Nearby shop enrichment failed lat=%s lng=%s radius=%s user_id=%s",
            lat,
            lng,
            bounded_radius,
            resolved_user_id,
        )
        raise HTTPException(status_code=502, detail=f"Nearby shop lookup failed: {exc}") from exc


@router.get("/v1/directory/stores", response_model=list[GlobalStoreDirectoryEntry])
async def get_directory_stores(
    city: str,
    user_id: str | None = None,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> list[GlobalStoreDirectoryEntry]:
    city_name = str(city or "").strip()
    if not city_name:
        raise HTTPException(status_code=400, detail="city is required")
    resolved_user_id = enforce_optional_user_access(auth_ctx, user_id)
    try:
        return await shop_ai_service.list_city_directory(city=city_name, user_id=resolved_user_id)
    except Exception as exc:
        logger.exception("Directory store lookup failed city=%s user_id=%s", city_name, resolved_user_id)
        raise HTTPException(status_code=502, detail=f"Directory lookup failed: {exc}") from exc


@router.post("/v1/admin/refresh-directory", response_model=DirectoryRefreshResponse)
async def refresh_directory(
    payload: DirectoryRefreshRequest,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> DirectoryRefreshResponse:
    enforce_admin_access(auth_ctx)
    try:
        return await shop_ai_service.refresh_city_directory(
            city=payload.city,
            center_lat=payload.center_lat,
            center_lng=payload.center_lng,
            radius_meters=payload.radius_meters,
            max_results=payload.max_results,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Directory refresh failed city=%s", payload.city)
        raise HTTPException(status_code=502, detail=f"Directory refresh failed: {exc}") from exc


@router.post("/v1/shops/match-item/{user_id}/{wishlist_item_id}", response_model=list[EnrichedStore])
async def match_item_to_nearby_shops(
    user_id: str,
    wishlist_item_id: str,
    payload: ShopMatchRequest,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> list[EnrichedStore]:
    from app.services.auth import enforce_user_access

    enforce_user_access(auth_ctx, user_id)
    try:
        return await shop_ai_service.match_item_to_stores(
            user_id=user_id,
            wishlist_item_id=wishlist_item_id,
            lat=payload.lat,
            lng=payload.lng,
            radius_meters=max(500, min(payload.radius, 50_000)),
            limit=max(1, min(payload.limit, 10)),
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "Wishlist shop matching failed user_id=%s wishlist_item_id=%s",
            user_id,
            wishlist_item_id,
        )
        raise HTTPException(status_code=502, detail=f"Shop match lookup failed: {exc}") from exc
