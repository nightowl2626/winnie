from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import quote
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _wishlist_palette(color: str | None) -> tuple[str, str, str]:
    accent = (color or "").strip().lower()
    palette = {
        "black": ("#1D1820", "#4A4152", "#6E6378"),
        "white": ("#E9E0D6", "#F8F3EC", "#D8CEC2"),
        "gray": ("#6F7885", "#AEB6C0", "#D3DAE1"),
        "grey": ("#6F7885", "#AEB6C0", "#D3DAE1"),
        "beige": ("#B89065", "#E5D3BA", "#F1E6D8"),
        "brown": ("#6D412A", "#A36A47", "#D8B398"),
        "red": ("#9E302D", "#D65A4E", "#F1B1A9"),
        "orange": ("#B95F1B", "#E89A41", "#F4CB96"),
        "yellow": ("#B28B17", "#E2C244", "#F5E5A2"),
        "green": ("#496842", "#7EA471", "#C7DBB8"),
        "blue": ("#33579E", "#6391DB", "#C4D8FA"),
        "purple": ("#6446A8", "#9A79D4", "#DDD0F3"),
        "pink": ("#B55E89", "#E59DBD", "#F5D3E2"),
        "multicolor": ("#6B56B9", "#F08E67", "#F1D772"),
    }
    return palette.get(accent, ("#A25E33", "#D88B52", "#F2D0B2"))


def _wishlist_silhouette_svg(category: str) -> str:
    token = (category or "").strip().lower()
    if any(word in token for word in ("shoe", "boot", "sneaker", "loafer", "heel")):
        return """
        <path d="M208 600c36 18 77 32 118 34 24 2 40 4 62-8 11-6 17-18 20-30l14-56c6-26 34-28 45-9l25 44c16 29 43 49 74 57 43 10 76 40 76 72v20H158v-28c0-42 16-70 50-84 26-11 47-23 66-44l15-18c5-6 13-7 20-4z" fill="#FFFFFF"/>
        """.strip()
    if any(word in token for word in ("dress", "gown")):
        return """
        <path d="M400 188c33 0 60 27 60 60 0 23-13 43-32 53l32 112 112 252c8 18-5 39-25 39H253c-20 0-33-21-25-39l112-252 32-112c-19-10-32-30-32-53 0-33 27-60 60-60z" fill="#FFFFFF"/>
        """.strip()
    if any(word in token for word in ("outer", "jacket", "coat", "blazer", "cardigan")):
        return """
        <path d="M264 252l82-70 54 38 54-38 82 70 44 394c3 28-19 52-47 52H484V452l42 56-44 34-82-110-82 110-44-34 42-56v246H267c-28 0-50-24-47-52z" fill="#FFFFFF"/>
        """.strip()
    if any(word in token for word in ("bottom", "pant", "jean", "trouser", "legging")):
        return """
        <path d="M280 192h240l-26 228-58 276h-78l-34-196-34 196h-78l-58-276z" fill="#FFFFFF"/>
        """.strip()
    if any(word in token for word in ("skirt",)):
        return """
        <path d="M306 220h188l66 456c3 18-11 34-29 34H269c-18 0-32-16-29-34z" fill="#FFFFFF"/>
        """.strip()
    return """
    <path d="M286 238l88-58h52l88 58 30 106-62 36-30-72v384H348V308l-30 72-62-36z" fill="#FFFFFF"/>
    """.strip()


def wishlist_inspiration_data_url(category: str, color: str | None = None) -> str:
    start, end, glow = _wishlist_palette(color)
    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="{start}"/>
          <stop offset="100%" stop-color="{end}"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="42%" r="46%">
          <stop offset="0%" stop-color="{glow}" stop-opacity="0.70"/>
          <stop offset="100%" stop-color="{glow}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="800" height="1000" rx="48" fill="url(#g)"/>
      <circle cx="400" cy="420" r="250" fill="url(#glow)"/>
      <circle cx="658" cy="198" r="104" fill="#FFFFFF" fill-opacity="0.10"/>
      <circle cx="170" cy="808" r="136" fill="#FFFFFF" fill-opacity="0.08"/>
      <g transform="translate(0 24)">
        {_wishlist_silhouette_svg(category)}
      </g>
    </svg>
    """.strip()
    return f"data:image/svg+xml;utf8,{quote(svg)}"


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str


class WishlistItemInput(BaseModel):
    id: Optional[str] = None
    category: str = Field(min_length=1)
    color: Optional[str] = None
    size: Optional[str] = None
    max_price: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None
    is_ai_suggested: Optional[bool] = None
    inspiration_image_url: Optional[str] = None
    reasoning: Optional[str] = None


class WishlistItem(BaseModel):
    id: str
    category: str
    color: Optional[str] = None
    size: Optional[str] = None
    max_price: Optional[float] = None
    notes: Optional[str] = None
    is_ai_suggested: bool = False
    inspiration_image_url: Optional[str] = None
    reasoning: Optional[str] = None
    created_at: str = Field(default_factory=utc_now_iso)

    @classmethod
    def from_input(cls, data: WishlistItemInput) -> "WishlistItem":
        return cls(
            id=data.id or str(uuid4()),
            category=data.category.strip(),
            color=data.color.strip().lower() if data.color else None,
            size=data.size.strip().lower() if data.size else None,
            max_price=data.max_price,
            notes=data.notes,
            is_ai_suggested=bool(data.is_ai_suggested),
            inspiration_image_url=(
                data.inspiration_image_url
                or wishlist_inspiration_data_url(data.category, data.color)
            ),
            reasoning=data.reasoning.strip() if data.reasoning else None,
        )


class WardrobeAnalyzeRequest(BaseModel):
    frame_notes: list[str]


class WardrobeAnalyzeSaveResponse(BaseModel):
    summary: str
    gaps: list[str]
    created_wishlist_items: list[WishlistItem]


class LiveEphemeralTokenRequest(BaseModel):
    model: Optional[str] = None
    mode: Optional[str] = None
    uses: int = Field(default=1, ge=1, le=50)
    session_ttl_seconds: int = Field(default=1800, ge=60, le=72000)
    new_session_ttl_seconds: int = Field(default=300, ge=60, le=72000)
    enable_session_resumption: bool = False


class LiveEphemeralTokenResponse(BaseModel):
    token: str
    model: str
    expires_at: Optional[str] = None
    new_session_expires_at: Optional[str] = None
    api_version: str = "v1alpha"


class WardrobeItemInput(BaseModel):
    id: Optional[str] = None
    phase: str = Field(min_length=1)
    category: str = Field(min_length=1)
    title: Optional[str] = None
    color: Optional[str] = None
    style: Optional[str] = None
    fabric_type: Optional[str] = None
    condition: Optional[str] = None
    estimated_fit: Optional[str] = None
    note: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    item_snippet_base64: Optional[str] = None
    wear_count: Optional[int] = Field(default=None, ge=0)
    last_worn_date: Optional[str] = None
    flagged_for_donation: Optional[bool] = None
    marketplace_listing: Optional["MarketplaceListing"] = None


class MarketplaceListing(BaseModel):
    title: str
    description: str
    suggested_price: float = Field(ge=0)
    generated_at: str = Field(default_factory=utc_now_iso)


class WardrobeItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    phase: str
    category: str
    title: Optional[str] = None
    color: Optional[str] = None
    style: Optional[str] = None
    fabric_type: Optional[str] = None
    condition: Optional[str] = None
    estimated_fit: Optional[str] = None
    note: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    item_snippet_base64: Optional[str] = None
    wear_count: int = 0
    last_worn_date: Optional[str] = None
    flagged_for_donation: bool = False
    marketplace_listing: Optional[MarketplaceListing] = None
    created_at: str = Field(default_factory=utc_now_iso)


class WearLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    date: str
    item_ids: list[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=utc_now_iso)


class StyleIntentLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    intent_description: str = Field(min_length=1)
    date: str
    created_at: str = Field(default_factory=utc_now_iso)


class WardrobeLogOutfitRequest(BaseModel):
    item_ids: list[str] = Field(default_factory=list)
    date: Optional[str] = None


class WardrobeLogOutfitResponse(BaseModel):
    wear_log: WearLog
    updated_items: list[WardrobeItem] = Field(default_factory=list)
    updated_count: int = 0


class WearLogEntryResponse(BaseModel):
    wear_log: WearLog
    items: list[WardrobeItem] = Field(default_factory=list)
    style_intent: Optional[str] = None


class WardrobeStatsColorShare(BaseModel):
    color: str
    count: int
    percent: float


class WardrobeCostPerWearLeader(BaseModel):
    item_id: str
    title: str
    category: str
    color: Optional[str] = None
    image_url: Optional[str] = None
    item_snippet_base64: Optional[str] = None
    estimated_price: float
    cost_per_wear: float
    wear_count: int


class WardrobeStats(BaseModel):
    utilization_rate: float = 0.0
    dominant_colors: list[WardrobeStatsColorShare] = Field(default_factory=list)
    cost_per_wear_leaders: list[WardrobeCostPerWearLeader] = Field(default_factory=list)
    sustainability_avg: int = 0
    most_worn_categories: list[dict[str, Any]] = Field(default_factory=list)
    most_worn_colors: list[dict[str, Any]] = Field(default_factory=list)
    outfit_streak_days: int = 0
    ai_note: Optional[str] = None


class WardrobeOptimizeResponse(BaseModel):
    flagged_item_ids: list[str] = Field(default_factory=list)
    flagged_count: int = 0
    gaps: list[str] = Field(default_factory=list)
    created_wishlist_items: list[WishlistItem] = Field(default_factory=list)
    wishlist_total: int = 0
    style_intent_count: int = 0
    stats: WardrobeStats = Field(default_factory=WardrobeStats)


class WardrobeCardDraft(BaseModel):
    phase: str
    category: Optional[str] = None
    title: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None
    style: Optional[str] = None
    fit: Optional[str] = None
    condition: Optional[str] = None
    note: Optional[str] = None


class WardrobeCardExtractRequest(BaseModel):
    phase: str = Field(min_length=1)
    image_base64: str = Field(min_length=16)
    mime_type: str = "image/jpeg"
    note: Optional[str] = None
    current_draft: Optional[WardrobeCardDraft] = None


class WardrobeCardExtractResponse(BaseModel):
    is_clothing: bool
    ready_for_next_item: bool
    draft: WardrobeCardDraft
    missing_fields: list[str] = Field(default_factory=list)
    question_for_user: str
    feedback: str


class WardrobeToolCallRequest(BaseModel):
    function_name: str = Field(min_length=1)
    args: Any = Field(default_factory=dict)
    image_base64: Optional[str] = None


class WardrobeToolCallResponse(BaseModel):
    function_name: str
    result: dict[str, Any] = Field(default_factory=dict)


class WardrobeItemUpdate(BaseModel):
    """Partial update for a wardrobe item. Only non-None fields are written."""
    phase: Optional[str] = None
    category: Optional[str] = None
    title: Optional[str] = None
    color: Optional[str] = None
    style: Optional[str] = None
    fabric_type: Optional[str] = None
    condition: Optional[str] = None
    estimated_fit: Optional[str] = None
    item_snippet_base64: Optional[str] = None
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    note: Optional[str] = None
    wear_count: Optional[int] = Field(default=None, ge=0)
    last_worn_date: Optional[str] = None
    flagged_for_donation: Optional[bool] = None
    marketplace_listing: Optional[MarketplaceListing] = None


class MarketplaceListingResponse(BaseModel):
    item_id: str
    cached: bool = False
    listing: MarketplaceListing


class EnhanceSnippetRequest(BaseModel):
    item_snippet_base64: Optional[str] = None
    mime_type: str = "image/jpeg"


class EnhanceSnippetResponse(BaseModel):
    item_id: str
    enhanced: bool
    item_snippet_base64: Optional[str] = None
    error: Optional[str] = None


class EnhancePreviewRequest(BaseModel):
    image_base64: str = Field(min_length=16)
    mime_type: str = "image/jpeg"


class EnhancePreviewResponse(BaseModel):
    enhanced: bool
    image_base64: Optional[str] = None
    error: Optional[str] = None


class WardrobeFrameAnalyzeRequest(BaseModel):
    phase: str = Field(min_length=1)
    image_base64: str = Field(min_length=16)
    mime_type: str = "image/jpeg"
    note: Optional[str] = None


class WardrobeFrameAnalyzeResponse(BaseModel):
    item: WardrobeItem
    agent_feedback: str
    instruction: str
    next_phase: Optional[str] = None
    phase_count: int = 0


class UserStylePhotoUpsertRequest(BaseModel):
    image_base64: str = Field(min_length=16)
    mime_type: str = "image/jpeg"


class UserStyleProfileResponse(BaseModel):
    user_id: str
    model_photo_base64: Optional[str] = None
    model_photo_updated_at: Optional[str] = None
    last_tryon_image_base64: Optional[str] = None
    last_tryon_updated_at: Optional[str] = None


class TryOnRequest(BaseModel):
    item_ids: list[str] = Field(default_factory=list)
    style_note: Optional[str] = None


class TryOnResponse(BaseModel):
    generated: bool
    image_base64: Optional[str] = None
    used_item_ids: list[str] = Field(default_factory=list)
    error: Optional[str] = None


class AIStoreEvaluation(BaseModel):
    vibe_check: str
    best_for: list[str] = Field(default_factory=list)
    sustainability_score: int = Field(ge=1, le=100)


class MarketSuggestion(BaseModel):
    slot: str
    aesthetic_goal: str
    target_item: str
    physical_stores: list[str] = Field(default_factory=list)
    search_url: str
    search_queries: list[str] = Field(default_factory=list)
    title: Optional[str] = None
    aesthetic_match: Optional[str] = None
    source: str = "gap_scout"


class EnrichedStore(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    distance_meters: float
    google_categories: list[str] = Field(default_factory=list)
    category: Optional[str] = None
    address: Optional[str] = None
    rating: Optional[float] = None
    ai_evaluation: AIStoreEvaluation
    wishlist_relevance: float = Field(default=0.0, ge=0.0, le=1.0)
    composite_score: float = 0.0
    is_favorite: bool = False
    match_reason: Optional[str] = None
    match_score: float = 0.0


class CachedShopStore(EnrichedStore):
    cached_at: str = Field(default_factory=utc_now_iso)


class GlobalStoreDirectoryEntry(EnrichedStore):
    city: str
    city_key: str
    last_updated: str = Field(default_factory=utc_now_iso)
    source_queries: list[str] = Field(default_factory=list)


class DirectoryRefreshRequest(BaseModel):
    city: str = Field(min_length=1)
    center_lat: float
    center_lng: float
    radius_meters: int = Field(default=12000, ge=1000, le=80000)
    max_results: int = Field(default=240, ge=20, le=600)


class DirectoryRefreshResponse(BaseModel):
    city: str
    city_key: str
    refreshed_count: int
    source_query_count: int
    refreshed_at: str = Field(default_factory=utc_now_iso)


class ShopMatchRequest(BaseModel):
    lat: float
    lng: float
    radius: int = Field(default=12000, ge=500, le=50000)
    limit: int = Field(default=5, ge=1, le=10)


class FavoriteStore(BaseModel):
    store_id: str
    name: Optional[str] = None
    category: Optional[str] = None
    created_at: str = Field(default_factory=utc_now_iso)


class FavoriteStoreUpsertRequest(BaseModel):
    store_id: str = Field(min_length=1)
    name: Optional[str] = None
    category: Optional[str] = None
