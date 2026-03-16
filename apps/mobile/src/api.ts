import { API_BASE_URL } from "./config";
import type {
  DirectoryRefreshResult,
  DirectoryStore,
  EnhancePreviewResult,
  EnhanceSnippetResult,
  FavoriteStore,
  MarketplaceListingResult,
  NearbyStore,
  TryOnResult,
  UserStyleProfile,
  WearLogEntry,
  WardrobeCardDraft,
  WardrobeCardExtractResult,
  WardrobeToolDispatchResult,
  LiveEphemeralTokenResult,
  WardrobeFinalizeResult,
  WardrobeItem,
  WardrobeLogOutfitResult,
  WardrobeOptimizeResult,
  WishlistItem
} from "./types";

function authHeaders(idToken?: string): Record<string, string> {
  return idToken ? { Authorization: `Bearer ${idToken}` } : {};
}

export async function getWishlist(userId: string, idToken?: string): Promise<WishlistItem[]> {
  const response = await fetch(`${API_BASE_URL}/v1/wishlist/${userId}`, {
    headers: authHeaders(idToken)
  });
  if (!response.ok) {
    throw new Error("Failed to load wishlist");
  }
  return response.json();
}

export async function getFavoriteStores(
  userId: string,
  idToken?: string
): Promise<FavoriteStore[]> {
  const response = await fetch(`${API_BASE_URL}/v1/users/${userId}/favorite-stores`, {
    headers: authHeaders(idToken)
  });
  if (!response.ok) {
    throw new Error("Failed to load favorite stores");
  }
  return response.json();
}

export async function addFavoriteStore(
  userId: string,
  payload: { store_id: string; name?: string; category?: string },
  idToken?: string
): Promise<FavoriteStore> {
  const response = await fetch(`${API_BASE_URL}/v1/users/${userId}/favorite-stores`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Failed to save favorite store (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function deleteFavoriteStore(
  userId: string,
  storeId: string,
  idToken?: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/v1/users/${userId}/favorite-stores/${storeId}`, {
    method: "DELETE",
    headers: authHeaders(idToken)
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Failed to delete favorite store (${response.status}): ${detail}`);
  }
}

export async function upsertWishlistItem(
  userId: string,
  item: Omit<WishlistItem, "id"> & { id?: string },
  idToken?: string
): Promise<WishlistItem> {
  const response = await fetch(`${API_BASE_URL}/v1/wishlist/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(item)
  });
  if (!response.ok) {
    throw new Error("Failed to save wishlist item");
  }
  return response.json();
}

export async function deleteWishlistItem(
  userId: string,
  itemId: string,
  idToken?: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/v1/wishlist/${userId}/${itemId}`, {
    method: "DELETE",
    headers: authHeaders(idToken)
  });
  if (!response.ok) {
    throw new Error("Failed to delete wishlist item");
  }
}

export async function fetchNearbyShops(
  latitude: number,
  longitude: number,
  options?: {
    radiusMeters?: number;
    city?: string;
    userId?: string;
    idToken?: string;
  }
): Promise<NearbyStore[]> {
  const radiusMeters = Math.max(500, Math.min(50000, Number(options?.radiusMeters || 30000)));
  const userId = (options?.userId || "").trim();
  const city = (options?.city || "").trim();
  const query = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    radius: String(radiusMeters)
  });
  if (city) {
    query.set("city", city);
  }
  if (userId) {
    query.set("user_id", userId);
  }
  const response = await fetch(`${API_BASE_URL}/v1/shops/nearby?${query.toString()}`, {
    headers: authHeaders(options?.idToken)
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    console.error(
      `[shop-map][backend] failed status=${response.status} detail=${detail || "<empty>"}`
    );
    throw new Error(`Failed to fetch enriched nearby stores (${response.status}): ${detail}`);
  }
  const stores = (await response.json()) as NearbyStore[];
  return stores;
}

export async function fetchDirectoryStores(
  city: string,
  options?: {
    userId?: string;
    idToken?: string;
  }
): Promise<DirectoryStore[]> {
  const query = new URLSearchParams({
    city: String(city || "").trim()
  });
  const userId = (options?.userId || "").trim();
  if (userId) {
    query.set("user_id", userId);
  }
  const response = await fetch(`${API_BASE_URL}/v1/directory/stores?${query.toString()}`, {
    headers: authHeaders(options?.idToken)
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Failed to fetch directory stores (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function refreshDirectoryStores(
  payload: {
    city: string;
    center_lat: number;
    center_lng: number;
    radius_meters?: number;
    max_results?: number;
  },
  idToken?: string
): Promise<DirectoryRefreshResult> {
  const response = await fetch(`${API_BASE_URL}/v1/admin/refresh-directory`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Failed to refresh directory stores (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function matchWishlistItemToNearbyShops(
  userId: string,
  wishlistItemId: string,
  options: {
    lat: number;
    lng: number;
    radiusMeters?: number;
    limit?: number;
    idToken?: string;
  }
): Promise<NearbyStore[]> {
  const radiusMeters = Math.max(500, Math.min(50000, Number(options.radiusMeters || 12000)));
  const limit = Math.max(1, Math.min(10, Number(options.limit || 5)));
  const response = await fetch(
    `${API_BASE_URL}/v1/shops/match-item/${encodeURIComponent(userId)}/${encodeURIComponent(
      wishlistItemId
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(options.idToken) },
      body: JSON.stringify({
        lat: options.lat,
        lng: options.lng,
        radius: radiusMeters,
        limit
      })
    }
  );
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    console.error(
      `[shop-map][match] failed status=${response.status} detail=${detail || "<empty>"}`
    );
    throw new Error(`Failed to scout matching stores (${response.status}): ${detail}`);
  }
  const stores = (await response.json()) as NearbyStore[];
  return stores;
}

export async function createLiveEphemeralToken(
  userId: string,
  idToken?: string,
  payload?: {
    model?: string;
    mode?: string;
    uses?: number;
    session_ttl_seconds?: number;
    new_session_ttl_seconds?: number;
    enable_session_resumption?: boolean;
  }
): Promise<LiveEphemeralTokenResult> {
  const response = await fetch(`${API_BASE_URL}/v1/live/ephemeral-token/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(
      payload ?? {
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        mode: "scan",
        uses: 1,
        session_ttl_seconds: 1800,
        new_session_ttl_seconds: 300,
        enable_session_resumption: false
      }
    )
  });
  if (!response.ok) {
    throw new Error("Failed to create Gemini Live ephemeral token");
  }
  return response.json();
}

export async function finalizeWardrobeScan(
  userId: string,
  frameNotes: string[],
  idToken?: string
): Promise<WardrobeFinalizeResult> {
  const response = await fetch(
    `${API_BASE_URL}/v1/agents/wardrobe/analyze-and-save/${userId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
      body: JSON.stringify({ frame_notes: frameNotes })
    }
  );
  if (!response.ok) {
    throw new Error("Failed to finalize wardrobe scan");
  }
  return response.json();
}

export async function extractWardrobeCard(
  userId: string,
  payload: {
    phase: string;
    image_base64: string;
    mime_type: string;
    note?: string;
    current_draft?: WardrobeCardDraft;
  },
  idToken?: string
): Promise<WardrobeCardExtractResult> {
  const response = await fetch(
    `${API_BASE_URL}/v1/agents/wardrobe/extract-card/${userId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
      body: JSON.stringify(payload)
    }
  );
  if (!response.ok) {
    throw new Error("Failed to extract wardrobe card");
  }
  return response.json();
}

export async function dispatchWardrobeTool(
  userId: string,
  payload: {
    function_name: string;
    args: Record<string, unknown>;
    image_base64?: string;
  },
  idToken?: string
): Promise<WardrobeToolDispatchResult> {
  const response = await fetch(`${API_BASE_URL}/v1/wardrobe/tool/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Failed to dispatch wardrobe tool (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function getWardrobeItems(
  userId: string,
  idToken?: string
): Promise<WardrobeItem[]> {
  const response = await fetch(`${API_BASE_URL}/v1/wardrobe/${userId}`, {
    headers: authHeaders(idToken)
  });
  if (!response.ok) {
    throw new Error("Failed to load wardrobe items");
  }
  return response.json();
}

export async function logWardrobeOutfit(
  userId: string,
  payload: {
    item_ids: string[];
    date?: string;
  },
  idToken?: string
): Promise<WardrobeLogOutfitResult> {
  const response = await fetch(`${API_BASE_URL}/v1/wardrobe/log-outfit/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Failed to log outfit (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function optimizeWardrobe(
  userId: string,
  idToken?: string
): Promise<WardrobeOptimizeResult> {
  const response = await fetch(`${API_BASE_URL}/v1/agents/wardrobe/optimize/${userId}`, {
    method: "POST",
    headers: authHeaders(idToken)
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Failed to run optimizer (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function getWardrobeLogs(
  userId: string,
  idToken?: string
): Promise<WearLogEntry[]> {
  const response = await fetch(`${API_BASE_URL}/v1/wardrobe/logs/${userId}`, {
    headers: authHeaders(idToken)
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Failed to load wardrobe logs (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function deleteWardrobeItem(
  userId: string,
  itemId: string,
  idToken?: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/v1/wardrobe/${userId}/${itemId}`, {
    method: "DELETE",
    headers: authHeaders(idToken)
  });
  if (!response.ok) {
    throw new Error("Failed to delete wardrobe item");
  }
}

export async function updateWardrobeItem(
  userId: string,
  itemId: string,
  payload: {
    phase?: string;
    category?: string;
    title?: string;
    color?: string;
    style?: string;
    fabric_type?: string;
    condition?: string;
    estimated_fit?: string;
    note?: string;
    last_worn_date?: string;
    flagged_for_donation?: boolean;
  },
  idToken?: string
): Promise<WardrobeItem> {
  const response = await fetch(`${API_BASE_URL}/v1/wardrobe/${userId}/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to update wardrobe item");
  }
  return response.json();
}

export async function generateMarketplaceListing(
  userId: string,
  itemId: string,
  idToken?: string
): Promise<MarketplaceListingResult> {
  const response = await fetch(
    `${API_BASE_URL}/v1/wardrobe/${userId}/${itemId}/generate-listing`,
    {
      method: "POST",
      headers: authHeaders(idToken)
    }
  );
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Failed to generate listing (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function enhanceWardrobeItemSnippet(
  userId: string,
  itemId: string,
  payload?: {
    item_snippet_base64?: string;
    mime_type?: string;
  },
  idToken?: string
): Promise<EnhanceSnippetResult> {
  const response = await fetch(
    `${API_BASE_URL}/v1/wardrobe/${userId}/${itemId}/enhance`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
      body: JSON.stringify(payload ?? {})
    }
  );
  if (!response.ok) {
    throw new Error("Failed to enhance wardrobe item snippet");
  }
  return response.json();
}

export async function enhanceWardrobePreview(
  userId: string,
  payload: {
    image_base64: string;
    mime_type?: string;
  },
  idToken?: string
): Promise<EnhancePreviewResult> {
  const response = await fetch(`${API_BASE_URL}/v1/wardrobe/${userId}/enhance-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Failed to enhance wardrobe preview (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function createWardrobeItem(
  userId: string,
  payload: {
    phase: string;
    category: string;
    title?: string;
    color?: string;
    style?: string;
    fabric_type?: string;
    condition?: string;
    estimated_fit?: string;
    note?: string;
    image_base64?: string;
    item_snippet_base64?: string;
  },
  idToken?: string
): Promise<WardrobeItem> {
  const response = await fetch(`${API_BASE_URL}/v1/wardrobe/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to save wardrobe item");
  }
  return response.json();
}

export async function getUserStyleProfile(
  userId: string,
  idToken?: string
): Promise<UserStyleProfile> {
  const response = await fetch(`${API_BASE_URL}/v1/users/${userId}/style-profile`, {
    headers: authHeaders(idToken)
  });
  if (!response.ok) {
    throw new Error("Failed to load user style profile");
  }
  return response.json();
}

export async function upsertUserStylePhoto(
  userId: string,
  payload: {
    image_base64: string;
    mime_type?: string;
  },
  idToken?: string
): Promise<UserStyleProfile> {
  const response = await fetch(`${API_BASE_URL}/v1/users/${userId}/style-profile/photo`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Failed to save style photo (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function generateTryOn(
  userId: string,
  payload: {
    item_ids: string[];
    style_note?: string;
  },
  idToken?: string
): Promise<TryOnResult> {
  const response = await fetch(`${API_BASE_URL}/v1/users/${userId}/try-on`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(idToken) },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Failed to generate try-on (${response.status}): ${detail}`);
  }
  return response.json();
}
