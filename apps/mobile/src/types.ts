export type WishlistItem = {
  id: string;
  category: string;
  color?: string;
  size?: string;
  notes?: string;
  is_ai_suggested?: boolean;
  inspiration_image_url?: string;
  reasoning?: string;
};

export type WishlistScoutCard = {
  id: string;
  origin: "ai" | "manual";
  category: string;
  color?: string;
  notes?: string;
  inspirationImageUrl?: string;
  reasoning: string;
  liveMatch?: NearbyStore | null;
};

export type InventoryItem = {
  id?: string;
  title: string;
  category: string;
  color?: string;
  size?: string;
  price: number;
  condition?: string;
  image_url?: string;
};

export type AIStoreEvaluation = {
  vibe_check: string;
  best_for: string[];
  sustainability_score: number;
};

export type FavoriteStore = {
  store_id: string;
  name?: string;
  category?: string;
  created_at: string;
};

export type NearbyStore = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string;
  google_categories?: string[];
  rating?: number;
  address?: string;
  distance_meters?: number;
  match_type?: "exact" | "generic";
  ai_evaluation: AIStoreEvaluation;
  wishlist_relevance?: number;
  composite_score?: number;
  is_favorite?: boolean;
  match_reason?: string;
  match_score?: number;
};

export type DirectoryStore = NearbyStore & {
  city: string;
  city_key: string;
  last_updated: string;
  source_queries: string[];
};

export type DirectoryRefreshResult = {
  city: string;
  city_key: string;
  refreshed_count: number;
  source_query_count: number;
  refreshed_at: string;
};

export type MatchResult = {
  user_id: string;
  wishlist_item_id: string;
  score: number;
  explanation: string;
};

export type NotificationRecord = {
  id: string;
  user_id: string;
  store_id: string;
  inventory_item_id: string;
  wishlist_item_id: string;
  score: number;
  explanation: string;
  created_at: string;
};

export type DemoFlowResult = {
  wardrobe_summary: string;
  wardrobe_gaps: string[];
  created_wishlist_items: WishlistItem[];
  wishlist_total: number;
  drop_item_id: string;
  match_count: number;
  notification_count: number;
  matches: MatchResult[];
  notifications: NotificationRecord[];
};

export type LiveEphemeralTokenResult = {
  token: string;
  model: string;
  expires_at?: string;
  new_session_expires_at?: string;
  api_version: string;
};

export type WardrobeGuideResult = {
  phase: string;
  instruction: string;
  next_phase?: string;
};

export type WardrobeFinalizeResult = {
  summary: string;
  gaps: string[];
  created_wishlist_items: WishlistItem[];
};

export type WardrobeItem = {
  id: string;
  phase: string;
  category: string;
  title?: string;
  color?: string;
  style?: string;
  fabric_type?: string;
  condition?: string;
  estimated_fit?: string;
  note?: string;
  image_url?: string;
  image_base64?: string;
  item_snippet_base64?: string;
  wear_count: number;
  last_worn_date?: string;
  flagged_for_donation: boolean;
  marketplace_listing?: MarketplaceListing;
  created_at: string;
};

export type MarketplaceListing = {
  title: string;
  description: string;
  suggested_price: number;
  generated_at: string;
};

export type MarketplaceListingResult = {
  item_id: string;
  cached: boolean;
  listing: MarketplaceListing;
};

export type WearLog = {
  id: string;
  user_id: string;
  date: string;
  item_ids: string[];
  created_at: string;
};

export type WearLogEntry = {
  wear_log: WearLog;
  items: WardrobeItem[];
  style_intent?: string;
};

export type WardrobeStatsColorShare = {
  color: string;
  count: number;
  percent: number;
};

export type WardrobeCostPerWearLeader = {
  item_id: string;
  title: string;
  category: string;
  color?: string;
  image_url?: string;
  item_snippet_base64?: string;
  estimated_price: number;
  cost_per_wear: number;
  wear_count: number;
};

export type WardrobeStats = {
  utilization_rate: number;
  dominant_colors: WardrobeStatsColorShare[];
  cost_per_wear_leaders: WardrobeCostPerWearLeader[];
  sustainability_avg: number;
  most_worn_categories: Array<{ category: string; wears: number }>;
  most_worn_colors: Array<{ color: string; wears: number }>;
  outfit_streak_days: number;
  ai_note?: string;
};

export type WardrobeLogOutfitResult = {
  wear_log: WearLog;
  updated_items: WardrobeItem[];
  updated_count: number;
};

export type WardrobeOptimizeResult = {
  flagged_item_ids: string[];
  flagged_count: number;
  gaps: string[];
  created_wishlist_items: WishlistItem[];
  wishlist_total: number;
  style_intent_count: number;
  stats: WardrobeStats;
};

export type WardrobeFrameAnalyzeResult = {
  item: WardrobeItem;
  agent_feedback: string;
  instruction: string;
  next_phase?: string;
  phase_count: number;
};

export type WardrobeCardDraft = {
  phase: string;
  category?: string;
  title?: string;
  color?: string;
  material?: string;
  style?: string;
  fit?: string;
  condition?: string;
  note?: string;
};

export type WardrobeCardExtractResult = {
  is_clothing: boolean;
  ready_for_next_item: boolean;
  draft: WardrobeCardDraft;
  missing_fields: string[];
  question_for_user: string;
  feedback: string;
};

export type WardrobeToolDispatchResult = {
  function_name: string;
  result: Record<string, unknown>;
};

export type EnhanceSnippetResult = {
  item_id: string;
  enhanced: boolean;
  item_snippet_base64?: string;
  error?: string;
};

export type EnhancePreviewResult = {
  enhanced: boolean;
  image_base64?: string;
  error?: string;
};

export type UserStyleProfile = {
  user_id: string;
  model_photo_base64?: string;
  model_photo_updated_at?: string;
  last_tryon_image_base64?: string;
  last_tryon_updated_at?: string;
};

export type TryOnResult = {
  generated: boolean;
  image_base64?: string;
  used_item_ids: string[];
  error?: string;
};
