import logging

from fastapi import APIRouter, Depends, HTTPException

from app.models import (
    TryOnRequest,
    TryOnResponse,
    UserStylePhotoUpsertRequest,
    UserStyleProfileResponse,
)
from app.runtime import gateway, wardrobe_ai_service
from app.services.auth import AuthContext, enforce_user_access, get_auth_context
from app.services.image_payloads import (
    build_preview_base64,
    resolve_item_visual_base64,
    safe_inline_image_base64,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/v1/users/{user_id}/style-profile", response_model=UserStyleProfileResponse)
def get_user_style_profile(
    user_id: str,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> UserStyleProfileResponse:
    enforce_user_access(auth_ctx, user_id)
    return UserStyleProfileResponse.model_validate(gateway.get_user_style_profile(user_id))


@router.put("/v1/users/{user_id}/style-profile/photo", response_model=UserStyleProfileResponse)
def upsert_user_style_photo(
    user_id: str,
    payload: UserStylePhotoUpsertRequest,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> UserStyleProfileResponse:
    enforce_user_access(auth_ctx, user_id)
    inline_preview = safe_inline_image_base64(payload.image_base64, max_chars=900_000)
    if inline_preview is None:
        inline_preview = build_preview_base64(
            payload.image_base64,
            target_max_chars=900_000,
            max_side=1400,
        )
    if not inline_preview:
        raise HTTPException(status_code=400, detail="Invalid image_base64 payload")
    profile = gateway.upsert_user_style_photo(user_id, inline_preview)
    return UserStyleProfileResponse.model_validate(profile)


@router.post("/v1/users/{user_id}/try-on", response_model=TryOnResponse)
def generate_user_try_on(
    user_id: str,
    payload: TryOnRequest,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> TryOnResponse:
    enforce_user_access(auth_ctx, user_id)
    normalized_item_ids: list[str] = []
    seen_ids: set[str] = set()
    for item_id in payload.item_ids:
        normalized = str(item_id).strip()
        if not normalized or normalized in seen_ids:
            continue
        seen_ids.add(normalized)
        normalized_item_ids.append(normalized)
    if not normalized_item_ids:
        raise HTTPException(status_code=400, detail="At least one item_id is required")

    profile = gateway.get_user_style_profile(user_id)
    person_photo = str(profile.get("model_photo_base64") or "").strip()
    if not person_photo:
        raise HTTPException(status_code=400, detail="Upload a model photo first")

    items_by_id = {item.id: item for item in gateway.list_wardrobe_items(user_id)}
    missing_items = [item_id for item_id in normalized_item_ids if item_id not in items_by_id]
    if missing_items:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown wardrobe item ids: {', '.join(missing_items)}",
        )

    garment_images: list[str] = []
    missing_images: list[str] = []
    for item_id in normalized_item_ids:
        visual = resolve_item_visual_base64(items_by_id[item_id])
        if not visual:
            missing_images.append(item_id)
            continue
        garment_images.append(visual)
    if missing_images:
        raise HTTPException(
            status_code=400,
            detail=f"These items have no photo data: {', '.join(missing_images)}",
        )

    logger.info(
        "[tryon] request user_id=%s items=%s person_bytes=%s garment_count=%s",
        user_id,
        normalized_item_ids,
        len(person_photo),
        len(garment_images),
    )
    result = wardrobe_ai_service.generate_virtual_try_on(
        person_image_base64=person_photo,
        garment_images_base64=garment_images,
        style_note=payload.style_note,
        mime_type="image/jpeg",
    )
    logger.info(
        "[tryon] response user_id=%s generated=%s bytes=%s error=%s",
        user_id,
        bool(result.get("generated")),
        len(str(result.get("image_base64", "") or "")),
        str(result.get("error", "")),
    )

    if not result.get("generated"):
        return TryOnResponse(
            generated=False,
            used_item_ids=normalized_item_ids,
            error=str(result.get("error") or "Try-on generation failed"),
        )

    output_b64 = str(result.get("image_base64") or "").strip()
    if not output_b64:
        return TryOnResponse(
            generated=False,
            used_item_ids=normalized_item_ids,
            error="Try-on returned no image",
        )

    persist_preview = safe_inline_image_base64(output_b64, max_chars=900_000)
    if persist_preview is None:
        persist_preview = build_preview_base64(
            output_b64,
            target_max_chars=900_000,
            max_side=1400,
        )
    if persist_preview:
        try:
            gateway.set_user_tryon_result(user_id, persist_preview)
        except Exception as exc:
            logger.exception("Failed to persist try-on result for user_id=%s: %s", user_id, exc)

    return TryOnResponse(
        generated=True,
        image_base64=output_b64,
        used_item_ids=normalized_item_ids,
    )
