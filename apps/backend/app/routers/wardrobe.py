import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.models import (
    EnhancePreviewRequest,
    EnhancePreviewResponse,
    EnhanceSnippetRequest,
    EnhanceSnippetResponse,
    MarketplaceListingResponse,
    WardrobeAnalyzeRequest,
    WardrobeAnalyzeSaveResponse,
    WardrobeCardExtractRequest,
    WardrobeCardExtractResponse,
    WardrobeItem,
    WardrobeItemInput,
    WardrobeItemUpdate,
    WardrobeLogOutfitRequest,
    WardrobeLogOutfitResponse,
    WardrobeOptimizeResponse,
    WardrobeToolCallRequest,
    WardrobeToolCallResponse,
    WearLogEntryResponse,
)
from app.runtime import (
    agent_runtime,
    gateway,
    optimizer_service,
    outfit_builder_service,
    wardrobe_ai_service,
)
from app.services.auth import AuthContext, enforce_user_access, get_auth_context
from app.services.wardrobe_tools import dispatch_wardrobe_tool_call

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/v1/wardrobe/{user_id}", response_model=list[WardrobeItem])
def list_wardrobe_items(
    user_id: str,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> list[WardrobeItem]:
    enforce_user_access(auth_ctx, user_id)
    return gateway.list_wardrobe_items(user_id)


@router.post("/v1/wardrobe/{user_id}", response_model=WardrobeItem)
def create_wardrobe_item(
    user_id: str,
    payload: WardrobeItemInput,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> WardrobeItem:
    enforce_user_access(auth_ctx, user_id)
    return gateway.create_wardrobe_item(user_id, payload)


@router.post("/v1/wardrobe/log-outfit/{user_id}", response_model=WardrobeLogOutfitResponse)
def log_todays_outfit(
    user_id: str,
    payload: WardrobeLogOutfitRequest,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> WardrobeLogOutfitResponse:
    enforce_user_access(auth_ctx, user_id)
    item_ids = list(
        dict.fromkeys(str(item_id).strip() for item_id in payload.item_ids if str(item_id).strip())
    )
    if not item_ids:
        raise HTTPException(status_code=400, detail="item_ids must contain at least one id")

    log_date = (payload.date or "").strip() or date.today().isoformat()
    try:
        date.fromisoformat(log_date)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="date must be ISO format YYYY-MM-DD") from exc

    wardrobe_items = gateway.list_wardrobe_items(user_id)
    items_by_id = {item.id: item for item in wardrobe_items}
    missing = [item_id for item_id in item_ids if item_id not in items_by_id]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown wardrobe item ids: {', '.join(missing)}",
        )

    wear_log = gateway.create_wear_log(user_id, log_date, item_ids)
    updated_items: list[WardrobeItem] = []
    for item_id in item_ids:
        existing = items_by_id[item_id]
        updated = gateway.update_wardrobe_item(
            user_id,
            item_id,
            WardrobeItemUpdate(
                wear_count=max(0, int(existing.wear_count or 0)) + 1,
                last_worn_date=log_date,
                flagged_for_donation=False,
            ),
        )
        updated_items.append(updated or existing)

    return WardrobeLogOutfitResponse(
        wear_log=wear_log,
        updated_items=updated_items,
        updated_count=len(updated_items),
    )


@router.get("/v1/wardrobe/logs/{user_id}", response_model=list[WearLogEntryResponse])
def get_wardrobe_logs(
    user_id: str,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> list[WearLogEntryResponse]:
    enforce_user_access(auth_ctx, user_id)
    items_by_id = {item.id: item for item in gateway.list_wardrobe_items(user_id)}
    intents_by_date = {
        row.date: row.intent_description for row in gateway.list_style_intent_logs(user_id, limit=180)
    }
    return [
        WearLogEntryResponse(
            wear_log=log,
            items=[items_by_id[item_id] for item_id in log.item_ids if item_id in items_by_id],
            style_intent=intents_by_date.get(log.date),
        )
        for log in gateway.list_wear_logs(user_id, limit=180)
    ]


@router.patch("/v1/wardrobe/{user_id}/{item_id}", response_model=WardrobeItem)
def patch_wardrobe_item(
    user_id: str,
    item_id: str,
    payload: WardrobeItemUpdate,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> WardrobeItem:
    enforce_user_access(auth_ctx, user_id)
    updated = gateway.update_wardrobe_item(user_id, item_id, payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="wardrobe item not found")
    return updated


@router.delete("/v1/wardrobe/{user_id}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wardrobe_item(
    user_id: str,
    item_id: str,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> Response:
    enforce_user_access(auth_ctx, user_id)
    if not gateway.delete_wardrobe_item(user_id, item_id):
        raise HTTPException(status_code=404, detail="wardrobe item not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/v1/wardrobe/{user_id}/{item_id}/generate-listing",
    response_model=MarketplaceListingResponse,
)
def generate_marketplace_listing(
    user_id: str,
    item_id: str,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> MarketplaceListingResponse:
    enforce_user_access(auth_ctx, user_id)
    normalized_item_id = item_id.strip()
    if not normalized_item_id:
        raise HTTPException(status_code=400, detail="item_id is required")

    found = next((item for item in gateway.list_wardrobe_items(user_id) if item.id == normalized_item_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="wardrobe item not found")
    if found.marketplace_listing is not None:
        return MarketplaceListingResponse(
            item_id=normalized_item_id,
            cached=True,
            listing=found.marketplace_listing,
        )

    listing = optimizer_service._generate_listing_for_item(found)
    if listing is None:
        raise HTTPException(status_code=500, detail="Could not generate marketplace listing")

    try:
        updated = gateway.update_wardrobe_item(
            user_id,
            normalized_item_id,
            WardrobeItemUpdate(marketplace_listing=listing),
        )
    except Exception as exc:
        logger.exception(
            "Failed to persist marketplace listing user_id=%s item_id=%s: %s",
            user_id,
            normalized_item_id,
            exc,
        )
        updated = None

    final_listing = updated.marketplace_listing if updated and updated.marketplace_listing else listing
    return MarketplaceListingResponse(
        item_id=normalized_item_id,
        cached=False,
        listing=final_listing,
    )


@router.post("/v1/wardrobe/{user_id}/{item_id}/enhance", response_model=EnhanceSnippetResponse)
def enhance_wardrobe_item_snippet(
    user_id: str,
    item_id: str,
    payload: EnhanceSnippetRequest,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> EnhanceSnippetResponse:
    enforce_user_access(auth_ctx, user_id)
    logger.info(
        "[enhance-item] request user_id=%s item_id=%s payload_bytes=%s mime=%s",
        user_id,
        item_id,
        len((payload.item_snippet_base64 or "").strip()),
        payload.mime_type,
    )

    source_base64 = payload.item_snippet_base64
    if not source_base64:
        found = next((item for item in gateway.list_wardrobe_items(user_id) if item.id == item_id), None)
        if not found:
            raise HTTPException(status_code=404, detail="Wardrobe item not found")
        source_base64 = found.item_snippet_base64 or found.image_base64
        if not source_base64:
            return EnhanceSnippetResponse(
                item_id=item_id,
                enhanced=False,
                error="No image data available for this item",
            )

    result = wardrobe_ai_service.enhance_snippet(
        image_base64=source_base64,
        mime_type=payload.mime_type,
    )
    logger.info(
        "[enhance-item] response user_id=%s item_id=%s enhanced=%s bytes=%s error=%s",
        user_id,
        item_id,
        bool(result.get("enhanced")),
        len(str(result.get("image_base64", "") or "")),
        str(result.get("error", "")),
    )

    if not result.get("enhanced"):
        return EnhanceSnippetResponse(
            item_id=item_id,
            enhanced=False,
            error=str(result.get("error", "Enhancement failed")),
        )

    enhanced_b64 = str(result["image_base64"])
    try:
        gateway.update_wardrobe_item(
            user_id,
            item_id,
            WardrobeItemUpdate(item_snippet_base64=enhanced_b64),
        )
    except Exception as exc:
        logger.exception("Failed to persist enhanced snippet for item_id=%s: %s", item_id, exc)

    return EnhanceSnippetResponse(
        item_id=item_id,
        enhanced=True,
        item_snippet_base64=enhanced_b64,
    )


@router.post("/v1/wardrobe/{user_id}/enhance-preview", response_model=EnhancePreviewResponse)
def enhance_wardrobe_preview(
    user_id: str,
    payload: EnhancePreviewRequest,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> EnhancePreviewResponse:
    enforce_user_access(auth_ctx, user_id)
    logger.info(
        "[enhance-preview] request user_id=%s payload_bytes=%s mime=%s",
        user_id,
        len((payload.image_base64 or "").strip()),
        payload.mime_type,
    )
    result = wardrobe_ai_service.enhance_snippet(
        image_base64=payload.image_base64,
        mime_type=payload.mime_type,
    )
    logger.info(
        "[enhance-preview] response user_id=%s enhanced=%s bytes=%s error=%s",
        user_id,
        bool(result.get("enhanced")),
        len(str(result.get("image_base64", "") or "")),
        str(result.get("error", "")),
    )
    if not result.get("enhanced"):
        return EnhancePreviewResponse(
            enhanced=False,
            error=str(result.get("error", "Enhancement failed")),
        )
    return EnhancePreviewResponse(
        enhanced=True,
        image_base64=str(result.get("image_base64", "")),
    )


@router.post("/v1/agents/wardrobe/extract-card/{user_id}", response_model=WardrobeCardExtractResponse)
def extract_wardrobe_card(
    user_id: str,
    payload: WardrobeCardExtractRequest,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> WardrobeCardExtractResponse:
    enforce_user_access(auth_ctx, user_id)
    result = wardrobe_ai_service.extract_card(
        phase=payload.phase,
        image_base64=payload.image_base64,
        mime_type=payload.mime_type,
        note=payload.note,
        current_draft=payload.current_draft.model_dump() if payload.current_draft else None,
    )
    return WardrobeCardExtractResponse.model_validate(result)


@router.post("/v1/wardrobe/tool/{user_id}", response_model=WardrobeToolCallResponse)
def dispatch_wardrobe_tool_for_user(
    user_id: str,
    payload: WardrobeToolCallRequest,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> WardrobeToolCallResponse:
    enforce_user_access(auth_ctx, user_id)
    return dispatch_wardrobe_tool_call(
        payload,
        user_id=user_id,
        gateway=gateway,
        optimizer_service=optimizer_service,
        outfit_builder_service=outfit_builder_service,
        wardrobe_ai_service=wardrobe_ai_service,
    )


@router.post("/v1/agents/wardrobe/analyze-and-save/{user_id}", response_model=WardrobeAnalyzeSaveResponse)
def wardrobe_analyze_and_save(
    user_id: str,
    payload: WardrobeAnalyzeRequest,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> WardrobeAnalyzeSaveResponse:
    enforce_user_access(auth_ctx, user_id)
    analysis = agent_runtime.summarize_wardrobe_scan(payload.frame_notes)
    gap_names = [str(value) for value in analysis.get("gaps", [])]
    created_items = [
        gateway.upsert_wishlist_item(user_id, row)
        for row in agent_runtime.generate_wishlist_from_gap_names(gap_names)
    ]
    return WardrobeAnalyzeSaveResponse(
        summary=str(analysis.get("summary", "")),
        gaps=gap_names,
        created_wishlist_items=created_items,
    )


@router.post("/v1/agents/wardrobe/optimize/{user_id}", response_model=WardrobeOptimizeResponse)
def optimize_wardrobe(
    user_id: str,
    auth_ctx: AuthContext = Depends(get_auth_context),
) -> WardrobeOptimizeResponse:
    enforce_user_access(auth_ctx, user_id)
    result = optimizer_service.run_optimizer(user_id)
    return WardrobeOptimizeResponse(
        flagged_item_ids=[str(value) for value in result.get("flagged_item_ids", [])],
        flagged_count=int(result.get("flagged_count") or 0),
        gaps=[str(value) for value in result.get("gaps", [])],
        created_wishlist_items=result.get("created_wishlist_items", []),
        wishlist_total=int(result.get("wishlist_total") or 0),
        style_intent_count=int(result.get("style_intent_count") or 0),
        stats=result.get("stats"),
    )
