from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import HTTPException

from app.models import (
    WardrobeItem,
    WardrobeItemInput,
    WardrobeToolCallRequest,
    WardrobeToolCallResponse,
    WishlistItem,
    WishlistItemInput,
)
from app.services.image_payloads import (
    build_preview_base64,
    infer_phase_from_category,
    resolve_item_visual_base64,
    resolve_wardrobe_save_image_base64,
    safe_inline_image_base64,
)
from app.services.wardrobe_ai import (
    get_clothing_item,
    save_clothing_item,
    update_clothing_item,
    upload_item_photo,
)

logger = logging.getLogger(__name__)


def _norm_shop_text(value: str | None) -> str:
    return (value or "").strip().lower()


def _infer_shop_slot_from_text(value: str | None) -> str | None:
    text = _norm_shop_text(value)
    if not text:
        return None
    if any(token in text for token in ["shoe", "sneaker", "boot", "heel", "loafer", "sandals"]):
        return "shoes"
    if any(token in text for token in ["pants", "jeans", "trouser", "skirt", "shorts", "leggings", "bottom"]):
        return "bottom"
    if any(token in text for token in ["jacket", "coat", "blazer", "outerwear"]):
        return "outerwear"
    if any(token in text for token in ["top", "shirt", "tee", "blouse", "sweater", "hoodie", "cardigan", "tank"]):
        return "top"
    return None


def _parse_item_ids_from_value(value: object) -> list[str]:
    parsed: list[str] = []
    if isinstance(value, list):
        for row in value:
            token = str(row).strip()
            if token:
                parsed.append(token)
    elif isinstance(value, str):
        for row in value.split(","):
            token = str(row).strip()
            if token:
                parsed.append(token)
    return parsed


def _to_tool_closet_item(item: WardrobeItem) -> dict[str, str | None]:
    return {
        "id": item.id,
        "title": item.title,
        "category": item.category,
        "color": item.color,
        "fabric_type": item.fabric_type,
        "style": item.style,
        "estimated_fit": item.estimated_fit,
        "note": item.note,
        "wear_count": str(item.wear_count),
        "last_worn_date": item.last_worn_date,
        "flagged_for_donation": str(item.flagged_for_donation).lower(),
        "created_at": item.created_at,
    }


def _to_tool_wishlist_item(item: WishlistItem) -> dict[str, str | bool | None]:
    return {
        "id": item.id,
        "category": item.category,
        "color": item.color,
        "size": item.size,
        "notes": item.notes,
        "is_ai_suggested": item.is_ai_suggested,
        "inspiration_image_url": item.inspiration_image_url,
        "reasoning": item.reasoning,
        "created_at": item.created_at,
    }


def dispatch_wardrobe_tool_call(
    payload: WardrobeToolCallRequest,
    *,
    user_id: str | None,
    gateway: Any,
    optimizer_service: Any,
    outfit_builder_service: Any,
    wardrobe_ai_service: Any,
) -> WardrobeToolCallResponse:
    function_name = payload.function_name.strip()
    args = payload.args or {}

    if not isinstance(args, dict):
        parsed_args: dict[str, object] = {}
        if isinstance(args, str):
            try:
                loaded = json.loads(args)
                if isinstance(loaded, dict):
                    parsed_args = loaded
            except Exception:
                parsed_args = {}
        args = parsed_args

    try:
        if function_name == "save_clothing_item":
            category_raw = args.get("category")
            color_raw = args.get("color")
            category_val = str(category_raw).strip() if category_raw is not None else ""
            color_val = str(color_raw).strip() if color_raw is not None else ""
            material_raw = args.get("material", args.get("fabric_type"))
            material_val = str(material_raw) if material_raw is not None else None
            brand_val = str(args.get("brand")) if args.get("brand") is not None else None
            condition_val = str(args.get("condition")) if args.get("condition") is not None else None
            title_val = str(args.get("title")).strip() if args.get("title") is not None else None
            phase_raw = str(args.get("phase")).strip().lower() if args.get("phase") is not None else ""
            style_val = str(args.get("style")).strip().lower() if args.get("style") is not None else None
            fit_raw = args.get("estimated_fit", args.get("fit"))
            fit_val = str(fit_raw).strip().lower() if fit_raw is not None else None
            extra_notes_val = (
                str(args.get("extra_notes", args.get("note"))).strip()
                if args.get("extra_notes", args.get("note")) is not None
                else None
            )
            save_result = save_clothing_item(
                category=category_val,
                color=color_val,
                material=material_val,
                brand=brand_val,
                condition=condition_val,
                extra_notes=extra_notes_val,
            )
            result = dict(save_result)
            item_id = str(save_result.get("item_id", "")).strip()
            image_url: str | None = None
            visual_base64 = resolve_wardrobe_save_image_base64(payload.image_base64, args)
            if visual_base64 and item_id:
                try:
                    image_url = upload_item_photo(visual_base64, item_id)
                    patched = update_clothing_item(item_id=item_id, image_url=image_url)
                    result["image_url"] = (
                        patched.get("image_url")
                        if isinstance(patched, dict) and patched.get("image_url")
                        else image_url
                    )
                    image_url_candidate = result.get("image_url") or image_url
                    image_url = (
                        str(image_url_candidate).strip() if image_url_candidate is not None else None
                    )
                except Exception as exc:
                    logger.exception("Wardrobe image upload failed for item_id=%s: %s", item_id, exc)
            if user_id:
                inferred_phase = infer_phase_from_category(category_val, phase_raw or None)
                closet_item = gateway.create_wardrobe_item(
                    user_id,
                    WardrobeItemInput(
                        id=item_id or None,
                        phase=inferred_phase,
                        category=category_val or inferred_phase,
                        title=title_val or f"{(category_val or inferred_phase).strip().title()} item",
                        color=color_val.strip().lower() if color_val.strip() else None,
                        style=style_val,
                        fabric_type=material_val.strip().lower()
                        if material_val and material_val.strip()
                        else None,
                        condition=condition_val.strip().lower()
                        if condition_val and condition_val.strip()
                        else None,
                        estimated_fit=fit_val,
                        note=extra_notes_val,
                        image_url=image_url,
                        image_base64=visual_base64,
                        item_snippet_base64=visual_base64,
                    ),
                )
                result["closet_item"] = closet_item.model_dump()
        elif function_name == "get_clothing_item":
            result = get_clothing_item(item_id=str(args.get("item_id", "")))
        elif function_name == "update_clothing_item":
            result = update_clothing_item(
                item_id=str(args.get("item_id", "")),
                category=str(args.get("category")) if args.get("category") is not None else None,
                color=str(args.get("color")) if args.get("color") is not None else None,
                material=str(args.get("material")) if args.get("material") is not None else None,
                brand=str(args.get("brand")) if args.get("brand") is not None else None,
                condition=str(args.get("condition")) if args.get("condition") is not None else None,
                extra_notes=(
                    str(args.get("extra_notes")).strip()
                    if args.get("extra_notes") is not None
                    else None
                ),
            )
        elif function_name == "fetch_closet":
            if not user_id:
                raise HTTPException(status_code=400, detail="fetch_closet requires user context")
            query = str(args.get("query") or "").strip().lower()
            category = str(args.get("category") or "").strip().lower()
            color = str(args.get("color") or "").strip().lower()
            try:
                limit = int(args.get("limit") or 30)
            except Exception:
                limit = 30
            limit = max(1, min(limit, 100))
            all_items = gateway.list_wardrobe_items(user_id)
            filtered: list[WardrobeItem] = []
            for item in all_items:
                hay = " ".join(
                    [
                        item.id or "",
                        item.title or "",
                        item.category or "",
                        item.color or "",
                        item.fabric_type or "",
                        item.style or "",
                        item.note or "",
                    ]
                ).lower()
                if category and (item.category or "").strip().lower() != category:
                    continue
                if color and color not in (item.color or "").strip().lower():
                    continue
                if query and query not in hay:
                    continue
                filtered.append(item)
                if len(filtered) >= limit:
                    break
            selected_ids_arg = args.get("selected_item_ids")
            if selected_ids_arg is None:
                selected_ids_arg = args.get("selected_item_ids_csv")
            selected_items = [
                item
                for item in all_items
                if item.id in set(_parse_item_ids_from_value(selected_ids_arg))
            ]
            result = {
                "status": "ok",
                "count": len(filtered),
                "items": [_to_tool_closet_item(item) for item in filtered],
                "selected_item_ids": [item.id for item in selected_items],
                "selected_items": [_to_tool_closet_item(item) for item in selected_items],
            }
        elif function_name == "search_closet_for_matches":
            if not user_id:
                raise HTTPException(status_code=400, detail="search_closet_for_matches requires user context")
            query = str(args.get("query") or "").strip().lower()
            store_category = str(args.get("category") or "").strip().lower()
            store_color = str(args.get("color") or "").strip().lower()
            store_material = str(args.get("material") or "").strip().lower()
            store_style = str(args.get("style") or "").strip().lower()
            try:
                limit = int(args.get("limit") or 6)
            except Exception:
                limit = 6
            limit = max(1, min(limit, 20))
            store_descriptor = " ".join(
                value for value in [store_category, store_color, store_material, store_style, query] if value
            )
            store_slot = _infer_shop_slot_from_text(store_descriptor)
            complementary_slots = {
                "top": {"bottom", "shoes", "outerwear"},
                "bottom": {"top", "shoes", "outerwear"},
                "shoes": {"top", "bottom", "outerwear"},
                "outerwear": {"top", "bottom", "shoes"},
            }
            target_slots = complementary_slots.get(
                store_slot or "",
                {"top", "bottom", "shoes", "outerwear"},
            )
            query_tokens = [token for token in query.split() if token and len(token) > 2]
            scored: list[tuple[float, WardrobeItem, str | None]] = []
            for item in gateway.list_wardrobe_items(user_id):
                item_text = " ".join(
                    [
                        item.id or "",
                        item.title or "",
                        item.category or "",
                        item.phase or "",
                        item.color or "",
                        item.fabric_type or "",
                        item.style or "",
                        item.note or "",
                    ]
                ).lower()
                item_slot = _infer_shop_slot_from_text(
                    " ".join([item.category or "", item.title or "", item.phase or "", item.style or ""])
                )
                score = 0.15
                if item_slot in target_slots:
                    score += 1.05
                if store_color and item.color and store_color != (item.color or "").strip().lower():
                    score += 0.22
                if store_material and item.fabric_type and store_material != (item.fabric_type or "").strip().lower():
                    score += 0.12
                if store_style and item.style and store_style != (item.style or "").strip().lower():
                    score += 0.08
                for token in query_tokens:
                    if token in item_text:
                        score += 0.2
                if item.flagged_for_donation:
                    score -= 0.5
                score += max(0, 0.12 - min(float(item.wear_count or 0), 12.0) * 0.01)
                if score > 0:
                    scored.append((score, item, item_slot))
            scored.sort(key=lambda row: row[0], reverse=True)
            selected = scored[:limit]
            result = {
                "status": "ok",
                "query": store_descriptor,
                "store_slot": store_slot,
                "count": len(selected),
                "selected_item_ids": [item.id for _, item, _ in selected],
                "items": [
                    {
                        "id": item.id,
                        "title": item.title,
                        "category": item.category,
                        "phase": item.phase,
                        "color": item.color,
                        "fabric_type": item.fabric_type,
                        "style": item.style,
                        "note": item.note,
                        "match_score": round(score, 3),
                        "slot": slot,
                    }
                    for score, item, slot in selected
                ],
            }
        elif function_name == "capture_store_item":
            result = {
                "status": "ok",
                "action": "capture_now",
                "reason": str(args.get("reason") or "").strip() or "capture requested",
            }
        elif function_name == "generate_in_store_tryon":
            if not user_id:
                raise HTTPException(status_code=400, detail="generate_in_store_tryon requires user context")
            store_image = str(payload.image_base64 or args.get("store_image_base64") or "").strip()
            if store_image.startswith("data:") and "," in store_image:
                store_image = store_image.split(",", 1)[1].strip()
            if not store_image:
                raise HTTPException(status_code=400, detail="store item image is required")
            profile = gateway.get_user_style_profile(user_id)
            person_photo = str(profile.get("model_photo_base64") or "").strip()
            if not person_photo:
                raise HTTPException(status_code=400, detail="Upload a model photo first")
            selected_ids = _parse_item_ids_from_value(args.get("closet_item_ids"))
            if not selected_ids:
                selected_ids = _parse_item_ids_from_value(args.get("closet_item_ids_csv"))
            if not selected_ids:
                selected_ids = _parse_item_ids_from_value(args.get("selected_item_ids"))
            normalized_selected_ids: list[str] = []
            seen_ids: set[str] = set()
            for item_id in selected_ids:
                token = str(item_id).strip()
                if token and token not in seen_ids:
                    seen_ids.add(token)
                    normalized_selected_ids.append(token)
            if not normalized_selected_ids:
                return WardrobeToolCallResponse(
                    function_name=function_name,
                    result={
                        "status": "error",
                        "generated": False,
                        "error": "No closet items selected. Call search_closet_for_matches first.",
                        "used_closet_item_ids": [],
                    },
                )
            all_items = {item.id: item for item in gateway.list_wardrobe_items(user_id)}
            missing_items = [item_id for item_id in normalized_selected_ids if item_id not in all_items]
            if missing_items:
                return WardrobeToolCallResponse(
                    function_name=function_name,
                    result={
                        "status": "error",
                        "generated": False,
                        "error": f"Unknown closet item ids: {', '.join(missing_items)}",
                        "used_closet_item_ids": [],
                    },
                )
            used_ids: list[str] = []
            garment_images = [store_image]
            missing_visual_ids: list[str] = []
            for item_id in normalized_selected_ids[:4]:
                item = all_items.get(item_id)
                if not item:
                    continue
                visual = resolve_item_visual_base64(item)
                if not visual:
                    missing_visual_ids.append(item_id)
                    continue
                garment_images.append(visual)
                used_ids.append(item_id)
            if missing_visual_ids:
                return WardrobeToolCallResponse(
                    function_name=function_name,
                    result={
                        "status": "error",
                        "generated": False,
                        "error": f"Closet items missing images: {', '.join(missing_visual_ids)}",
                        "used_closet_item_ids": used_ids,
                    },
                )
            tryon_result = wardrobe_ai_service.generate_virtual_try_on(
                person_image_base64=person_photo,
                garment_images_base64=garment_images,
                style_note=str(args.get("style_note") or "").strip() or None,
                mime_type="image/jpeg",
            )
            if not tryon_result.get("generated"):
                result = {
                    "status": "error",
                    "generated": False,
                    "error": str(tryon_result.get("error") or "Try-on generation failed"),
                    "used_closet_item_ids": used_ids,
                }
            else:
                output_b64 = str(tryon_result.get("image_base64") or "").strip()
                if not output_b64:
                    result = {
                        "status": "error",
                        "generated": False,
                        "error": "Try-on returned no image",
                        "used_closet_item_ids": used_ids,
                    }
                else:
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
                        except Exception:
                            logger.exception("Failed to persist shop try-on for user_id=%s", user_id)
                    result = {
                        "status": "ok",
                        "generated": True,
                        "image_base64": output_b64,
                        "used_closet_item_ids": used_ids,
                    }
        elif function_name == "log_unmet_style_intent":
            if not user_id:
                raise HTTPException(status_code=400, detail="log_unmet_style_intent requires user context")
            intent_description = str(args.get("intent_description") or "").strip()
            if not intent_description:
                raise HTTPException(status_code=400, detail="intent_description is required")
            result = optimizer_service.log_unmet_style_intent(
                user_id=user_id,
                intent_description=intent_description,
            )
        elif function_name == "build_complete_outfit":
            if not user_id:
                raise HTTPException(status_code=400, detail="build_complete_outfit requires user context")
            event_context = str(args.get("event_context") or "").strip()
            if not event_context:
                raise HTTPException(status_code=400, detail="event_context is required")
            result = asyncio.run(
                outfit_builder_service.build_outfit_parallel(
                    user_id=user_id,
                    event_context=event_context,
                    base_item_id=str(args.get("base_item_id") or "").strip() or None,
                    user_prompt=str(args.get("user_prompt") or "").strip() or None,
                )
            )
            missing_slots_raw = result.get("missing_slots")
            missing_slots = [
                str(value).strip().lower()
                for value in (missing_slots_raw if isinstance(missing_slots_raw, list) else [])
                if str(value).strip()
            ]
            logged_style_intents: list[dict[str, str]] = []
            created_wishlist_items: list[dict[str, str]] = []
            if missing_slots:
                existing_categories = {
                    str(item.category).strip().lower()
                    for item in gateway.list_wishlist(user_id)
                    if str(item.category).strip()
                }
                slot_to_category = {
                    "top": "tops",
                    "bottom": "bottoms",
                    "shoes": "shoes",
                }
                for slot in missing_slots:
                    intent_text = f"Needs {slot} for {event_context}"
                    try:
                        memory_result = optimizer_service.log_unmet_style_intent(
                            user_id=user_id,
                            intent_description=intent_text,
                        )
                        logged_style_intents.append(
                            {
                                "slot": slot,
                                "status": str(memory_result.get("status", "")),
                                "intent_id": str(memory_result.get("intent_id", "")),
                            }
                        )
                    except Exception:
                        logger.exception("Failed to log unmet style intent for slot=%s", slot)
                    category = slot_to_category.get(slot, slot)
                    if category in existing_categories:
                        continue
                    try:
                        created = gateway.upsert_wishlist_item(
                            user_id,
                            WishlistItemInput(
                                category=category,
                                notes=f"Gap from outfit planning: {event_context}",
                                is_ai_suggested=True,
                                reasoning=f"Suggested during outfit planning because the outfit needed a {category}.",
                            ),
                        )
                        existing_categories.add(category)
                        created_wishlist_items.append(
                            {
                                "id": created.id,
                                "category": created.category,
                            }
                        )
                    except Exception:
                        logger.exception("Failed to auto-create wishlist item for category=%s", category)
            result["logged_style_intents"] = logged_style_intents
            result["created_wishlist_items"] = created_wishlist_items
        elif function_name == "search_web_for_shopping":
            query = str(args.get("query") or "").strip()
            if not query:
                raise HTTPException(status_code=400, detail="query is required")
            event_context = str(args.get("event_context") or "").strip() or None
            try:
                limit = int(args.get("limit") or 5)
            except Exception:
                limit = 5
            result = outfit_builder_service.search_web_for_shopping(
                query=query,
                event_context=event_context,
                limit=limit,
            )
        elif function_name == "fetch_wishlist":
            if not user_id:
                raise HTTPException(status_code=400, detail="fetch_wishlist requires user context")
            query = str(args.get("query") or "").strip().lower()
            category = str(args.get("category") or "").strip().lower()
            try:
                limit = int(args.get("limit") or 30)
            except Exception:
                limit = 30
            limit = max(1, min(limit, 100))
            filtered: list[WishlistItem] = []
            for item in gateway.list_wishlist(user_id):
                hay = " ".join(
                    [item.id or "", item.category or "", item.color or "", item.size or "", item.notes or ""]
                ).lower()
                if category and (item.category or "").strip().lower() != category:
                    continue
                if query and query not in hay:
                    continue
                filtered.append(item)
                if len(filtered) >= limit:
                    break
            result = {
                "status": "ok",
                "count": len(filtered),
                "items": [_to_tool_wishlist_item(item) for item in filtered],
            }
        elif function_name == "add_wishlist_item":
            if not user_id:
                raise HTTPException(status_code=400, detail="add_wishlist_item requires user context")
            category_val = str(args.get("category") or "").strip()
            if not category_val:
                raise HTTPException(status_code=400, detail="category is required")
            saved = gateway.upsert_wishlist_item(
                user_id,
                WishlistItemInput(
                    category=category_val,
                    color=str(args.get("color")).strip() if args.get("color") is not None else None,
                    size=str(args.get("size")).strip() if args.get("size") is not None else None,
                    notes=str(args.get("notes")).strip() if args.get("notes") is not None else None,
                    is_ai_suggested=False,
                ),
            )
            result = {
                "status": "saved",
                "item": _to_tool_wishlist_item(saved),
            }
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported function: {function_name}")
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Tool dispatch failed: {exc}") from exc

    return WardrobeToolCallResponse(function_name=function_name, result=result)
