from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException

from app.config import Settings
from app.models import LiveEphemeralTokenRequest, LiveEphemeralTokenResponse

try:  # pragma: no cover - optional runtime dependency behavior
    from google import genai
except Exception:  # pragma: no cover
    genai = None


def _read_token_field(token: Any, key: str) -> Any:
    if token is None:
        return None
    if isinstance(token, dict):
        return token.get(key)
    return getattr(token, key, None)


def _voice_config() -> dict[str, Any]:
    return {"voice_config": {"prebuilt_voice_config": {"voice_name": "Zephyr"}}}


def _system_instruction(text: str) -> dict[str, Any]:
    return {"parts": [{"text": text}]}


def _function_tool(function_declarations: list[dict[str, Any]]) -> dict[str, Any]:
    return {"function_declarations": function_declarations}


def _build_base_live_config(*, target_tokens: int, function_declarations: list[dict[str, Any]], instruction: str) -> dict[str, Any]:
    return {
        "response_modalities": ["AUDIO"],
        "media_resolution": "MEDIA_RESOLUTION_MEDIUM",
        "speech_config": _voice_config(),
        "context_window_compression": {
            "trigger_tokens": 104857,
            "sliding_window": {"target_tokens": target_tokens},
        },
        "input_audio_transcription": {},
        "output_audio_transcription": {},
        "tools": [_function_tool(function_declarations)],
        "system_instruction": _system_instruction(instruction),
    }


def _tool_declaration(
    *,
    name: str,
    description: str,
    properties: dict[str, Any],
    required: list[str] | None = None,
) -> dict[str, Any]:
    parameters: dict[str, Any] = {"type": "object", "properties": properties}
    if required:
        parameters["required"] = required
    return {
        "name": name,
        "description": description,
        "parameters": parameters,
    }


ROUTE_TOOL_DECLARATION = _tool_declaration(
    name="route_to_specialist",
    description=(
        "Request that the app switch to another specialist UI and live agent when the user intent is better handled there."
    ),
    properties={
        "target_mode": {
            "type": "string",
            "enum": ["scan", "stylist", "wishlist", "shop"],
        },
        "handoff_type": {
            "type": "string",
            "enum": ["soft", "hard"],
        },
        "reason": {"type": "string"},
        "ui_mode": {
            "type": "string",
            "enum": ["camera", "mic"],
        },
        "summary": {"type": "string"},
        "trigger_utterance": {"type": "string"},
        "event_context": {"type": "string"},
        "item_context": {
            "type": "object",
            "properties": {
                "category": {"type": "string"},
                "color": {"type": "string"},
                "material": {"type": "string"},
                "notes": {"type": "string"},
            },
        },
    },
    required=["target_mode", "reason", "ui_mode"],
)

SESSION_GOAL_TOOL_DECLARATION = _tool_declaration(
    name="set_session_goal",
    description="Persist the user's current fashion goal or mission for later handoffs.",
    properties={"goal": {"type": "string"}},
    required=["goal"],
)

SCAN_TOOL_DECLARATIONS = [
    _tool_declaration(
        name="save_clothing_item",
        description="Create a wardrobe item record in Firestore when enough fields are known.",
        properties={
            "category": {"type": "string"},
            "color": {"type": "string"},
            "material": {"type": "string"},
            "brand": {"type": "string"},
            "extra_notes": {"type": "string"},
        },
        required=["category", "color", "material"],
    ),
    _tool_declaration(
        name="capture_item_photo",
        description="Signal the client to capture a still photo when the garment is clearly visible and centered.",
        properties={"reason": {"type": "string"}},
    ),
    _tool_declaration(
        name="get_clothing_item",
        description="Fetch one wardrobe item from Firestore by item ID.",
        properties={"item_id": {"type": "string"}},
        required=["item_id"],
    ),
    _tool_declaration(
        name="update_clothing_item",
        description="Patch non-null fields on an existing Firestore wardrobe item.",
        properties={
            "item_id": {"type": "string"},
            "category": {"type": "string"},
            "color": {"type": "string"},
            "material": {"type": "string"},
            "brand": {"type": "string"},
            "extra_notes": {"type": "string"},
        },
        required=["item_id"],
    ),
    ROUTE_TOOL_DECLARATION,
]

STYLIST_TOOL_DECLARATIONS = [
    _tool_declaration(
        name="fetch_closet",
        description="Fetch the user's closet items and optionally pin selected item IDs for the current outfit suggestion.",
        properties={
            "query": {"type": "string"},
            "category": {"type": "string"},
            "color": {"type": "string"},
            "limit": {"type": "string"},
            "selected_item_ids_csv": {"type": "string"},
        },
    ),
    _tool_declaration(
        name="fetch_wishlist",
        description="Fetch the user's wishlist items to avoid duplicate gap tracking.",
        properties={
            "query": {"type": "string"},
            "category": {"type": "string"},
            "limit": {"type": "string"},
        },
    ),
    _tool_declaration(
        name="add_wishlist_item",
        description="Add a wishlist item when the user clearly says they are missing a garment they want.",
        properties={
            "category": {"type": "string"},
            "color": {"type": "string"},
            "size": {"type": "string"},
            "notes": {"type": "string"},
        },
        required=["category"],
    ),
    _tool_declaration(
        name="log_unmet_style_intent",
        description="Log a missing wardrobe need when user asks for an outfit type they do not own.",
        properties={"intent_description": {"type": "string"}},
        required=["intent_description"],
    ),
    _tool_declaration(
        name="build_complete_outfit",
        description="Build a complete closet-first outfit for the user's event context.",
        properties={
            "event_context": {"type": "string"},
            "base_item_id": {"type": "string"},
            "user_prompt": {"type": "string"},
        },
        required=["event_context"],
    ),
    _tool_declaration(
        name="search_web_for_shopping",
        description="Look up current web shopping results or online style references for the user's request.",
        properties={
            "query": {"type": "string"},
            "event_context": {"type": "string"},
            "limit": {"type": "string"},
        },
        required=["query"],
    ),
    ROUTE_TOOL_DECLARATION,
]

WISHLIST_TOOL_DECLARATIONS = [
    _tool_declaration(
        name="fetch_wishlist",
        description="Fetch the user's wishlist items.",
        properties={
            "query": {"type": "string"},
            "category": {"type": "string"},
            "limit": {"type": "string"},
        },
    ),
    _tool_declaration(
        name="add_wishlist_item",
        description="Add one wishlist item for the user.",
        properties={
            "category": {"type": "string"},
            "color": {"type": "string"},
            "size": {"type": "string"},
            "notes": {"type": "string"},
        },
        required=["category"],
    ),
    ROUTE_TOOL_DECLARATION,
]

SHOP_TOOL_DECLARATIONS = [
    _tool_declaration(
        name="search_closet_for_matches",
        description="Search the user's closet for complementary pieces to pair with the store item.",
        properties={
            "query": {"type": "string"},
            "category": {"type": "string"},
            "color": {"type": "string"},
            "material": {"type": "string"},
            "style": {"type": "string"},
            "limit": {"type": "string"},
        },
    ),
    _tool_declaration(
        name="capture_store_item",
        description="Signal the client to capture a high-quality still frame of the currently viewed in-store garment.",
        properties={"reason": {"type": "string"}},
    ),
    _tool_declaration(
        name="generate_in_store_tryon",
        description="Generate a virtual try-on using the captured store garment plus optional closet items.",
        properties={
            "closet_item_ids": {
                "type": "array",
                "items": {"type": "string"},
            },
            "closet_item_ids_csv": {"type": "string"},
            "style_note": {"type": "string"},
        },
        required=["closet_item_ids"],
    ),
    ROUTE_TOOL_DECLARATION,
]

CONCIERGE_INSTRUCTION = (
    "You are the root AI fashion concierge on a live audio call. "
    "Your job is to understand what the user wants to do, then route them into the right specialist. "
    "You do not perform wardrobe scanning, styling, wishlist management, or store assist yourself. "
    "Instead, once intent is clear, call route_to_specialist quickly. "
    "Use target_mode=scan for garment digitization or closet intake. "
    "Use target_mode=stylist for outfit advice, closet styling, and web shopping research. "
    "Use target_mode=wishlist for focused wishlist management or review. "
    "Use target_mode=shop for in-store camera help, try-ons, and store decisions. "
    "Use ui_mode=camera for scan and shop. Use ui_mode=mic for stylist and wishlist. "
    "If the user states a broader goal such as a trip, event, season, or wardrobe mission, call set_session_goal silently first. "
    "When you call route_to_specialist, include a short summary of what the user wants next, the trigger_utterance when useful, and item_context or event_context when obvious. "
    "Keep spoken replies very short. Usually confirm the handoff in one sentence after you call route_to_specialist."
)

SCAN_INSTRUCTION = (
    "You are a live wardrobe intake assistant. "
    "Keep responses to 1-2 sentences. "
    "Use the camera feed to infer visible attributes like category, color, and likely material when confidence is high. "
    "If visual confidence is low, ask one short clarifying question. "
    "Follow this strict lifecycle for every garment: identify visible attributes, call capture_item_photo once when the garment is clearly visible and centered, wait for the exact phrase 'Capture Locked', then call save_clothing_item silently once category, color, and material are known. "
    "Ask exactly one short question per missing field when uncertain. "
    "Do not ask for extra notes; capture them only if the user volunteers them. "
    "Confirm saves briefly, for example: 'Got it! Next item?' "
    "If the user changes the task and clearly wants styling help, wishlist management, or in-store shopping help instead of scanning, call route_to_specialist with a short summary of what they want next and any obvious garment context."
)

STYLIST_INSTRUCTION = (
    "You are a live outfit stylist on an audio call. "
    "This is NOT a wardrobe scan or cataloging session. "
    "Never ask to scan, capture, catalog, or intake garments. "
    "Assume the closet is already available. "
    "Keep every reply short and conversational. "
    "Always call fetch_closet immediately after the user's first styling request to establish a wardrobe baseline. "
    "Use fetch_closet to browse closet items before recommendations. "
    "When the user asks for current web options, what to buy online, or explicitly asks you to look on the internet, call search_web_for_shopping before answering. "
    "If the user clearly says they are missing a garment they want to own, first check fetch_wishlist when useful to avoid duplicates, then call add_wishlist_item silently. "
    "When user asks for a full outfit recommendation, or clearly lacks a key piece for the outfit, call build_complete_outfit. "
    "If build_complete_outfit shows missing slots and the user wants actual shopping options, follow it with search_web_for_shopping using the missing item plus event context. "
    "If user asks for an outfit type they do not have, call log_unmet_style_intent silently in the background. "
    "When you recommend an outfit, call fetch_closet again with selected_item_ids_csv set to comma-separated item IDs you are proposing so the UI can show them. "
    "If user asks to swap one piece, keep other selected IDs and update only the requested piece. "
    "Ask one brief clarification question only when needed. "
    "If the user explicitly wants live garment scanning or in-store camera assistance, call route_to_specialist with a short summary of what they want next and any obvious item or event context."
)

WISHLIST_INSTRUCTION = (
    "You are a live wishlist assistant on an audio call. "
    "This is NOT wardrobe scan and NOT outfit styling. "
    "Your job is to help user add wishlist items quickly. "
    "Keep replies short and conversational (1-2 sentences). "
    "Use fetch_wishlist to check what already exists. "
    "When user requests a new item, call add_wishlist_item silently with category, and include color/size/notes only if provided. "
    "After a successful add, confirm briefly (for example: 'Added to your wishlist.'). "
    "Never ask about budget or price. "
    "If the user wants outfit advice, garment scanning, or in-store shopping help, call route_to_specialist with a short summary of what they want next and any obvious item context."
)

SHOP_INSTRUCTION = (
    "You are an in-store personal shopping assistant on a live video call. "
    "The user is browsing a physical store and streaming camera + microphone. "
    "Evaluate the garment they show, then help decide whether to buy it. "
    "Before mentioning any pairing recommendation, you MUST call search_closet_for_matches and only recommend items returned by that tool. "
    "Never invent closet items or describe items that were not returned by the tool. "
    "When the user asks to see how it looks, call capture_store_item first to capture a clean frame, then call generate_in_store_tryon using the exact closet_item_ids from the latest search result. "
    "Do not call generate_in_store_tryon with empty closet_item_ids. "
    "Keep replies short, practical, and conversational. "
    "Never switch into wardrobe cataloging mode. "
    "If the user stops asking about store decisions and instead wants wardrobe scanning, wishlist management, or styling, call route_to_specialist with a short summary of what they want next and any obvious item or event context."
)


@dataclass(frozen=True)
class ModeConfigSpec:
    target_tokens: int
    instruction: str
    tool_declarations: list[dict[str, Any]]


MODE_CONFIGS: dict[str, ModeConfigSpec] = {
    "concierge": ModeConfigSpec(
        target_tokens=52428,
        instruction=CONCIERGE_INSTRUCTION,
        tool_declarations=[ROUTE_TOOL_DECLARATION, SESSION_GOAL_TOOL_DECLARATION],
    ),
    "scan": ModeConfigSpec(
        target_tokens=52428,
        instruction=SCAN_INSTRUCTION,
        tool_declarations=SCAN_TOOL_DECLARATIONS,
    ),
    "stylist": ModeConfigSpec(
        target_tokens=80000,
        instruction=STYLIST_INSTRUCTION,
        tool_declarations=STYLIST_TOOL_DECLARATIONS,
    ),
    "wishlist": ModeConfigSpec(
        target_tokens=52428,
        instruction=WISHLIST_INSTRUCTION,
        tool_declarations=WISHLIST_TOOL_DECLARATIONS,
    ),
    "shop": ModeConfigSpec(
        target_tokens=52428,
        instruction=SHOP_INSTRUCTION,
        tool_declarations=SHOP_TOOL_DECLARATIONS,
    ),
}


class GeminiLiveService:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._model = settings.gemini_live_model or settings.gemini_model
        self._client = None
        if settings.gemini_api_key and genai is not None:
            self._client = genai.Client(
                api_key=settings.gemini_api_key,
                http_options={"api_version": "v1alpha"},
            )

    def _select_model(self, payload: LiveEphemeralTokenRequest) -> str:
        override = (payload.model or "").strip()
        return override or self._model

    @staticmethod
    def _normalize_mode(payload: LiveEphemeralTokenRequest) -> str:
        mode = (payload.mode or "").strip().lower()
        if mode in {"concierge", "router", "assistant"}:
            return "concierge"
        if mode in {"wishlist", "wish"}:
            return "wishlist"
        if mode in {"stylist", "outfit"}:
            return "stylist"
        if mode in {"shop", "store", "shopping", "shop_assistant"}:
            return "shop"
        return "scan"

    def _build_mode_config(self, mode: str) -> dict[str, Any]:
        spec = MODE_CONFIGS.get(mode, MODE_CONFIGS["scan"])
        return _build_base_live_config(
            target_tokens=spec.target_tokens,
            function_declarations=deepcopy(spec.tool_declarations),
            instruction=spec.instruction,
        )

    def _build_config(self, payload: LiveEphemeralTokenRequest) -> dict[str, Any]:
        now = datetime.now(tz=timezone.utc)
        live_constraints: dict[str, Any] = {
            "model": self._select_model(payload),
            "config": self._build_mode_config(self._normalize_mode(payload)),
        }
        if payload.enable_session_resumption:
            live_constraints["session_resumption"] = {}

        return {
            "uses": payload.uses,
            "expire_time": (now + timedelta(seconds=payload.session_ttl_seconds)).isoformat(),
            "new_session_expire_time": (now + timedelta(seconds=payload.new_session_ttl_seconds)).isoformat(),
            "live_connect_constraints": live_constraints,
            "http_options": {"api_version": "v1alpha"},
        }

    def create_ephemeral_token(
        self, payload: LiveEphemeralTokenRequest
    ) -> LiveEphemeralTokenResponse:
        if self._client is None:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Gemini Live is not configured. Set GEMINI_API_KEY and a valid "
                    "GEMINI_LIVE_MODEL in backend environment."
                ),
            )

        try:
            created = self._client.auth_tokens.create(config=self._build_config(payload))
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to create Gemini Live ephemeral token: {exc}",
            ) from exc

        token_name = _read_token_field(created, "name")
        if not token_name:
            raise HTTPException(status_code=502, detail="Gemini Live token response missing name")

        return LiveEphemeralTokenResponse(
            token=token_name,
            model=self._select_model(payload),
            expires_at=_read_token_field(created, "expire_time"),
            new_session_expires_at=_read_token_field(created, "new_session_expire_time"),
            api_version="v1alpha",
        )
