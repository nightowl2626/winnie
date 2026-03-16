export type ConciergeMode = "concierge" | "scan" | "stylist" | "wishlist" | "shop";

export type ConciergeHandoffType = "soft" | "hard";

export type ConciergeRoute = {
  targetMode: ConciergeMode;
  handoffType: ConciergeHandoffType;
  reason: string;
  bootstrapPayload?: Record<string, unknown>;
};

export type ConciergeHandoffItemContext = {
  category?: string;
  color?: string;
  material?: string;
  notes?: string;
};

export type ConciergeHandoffContext = {
  id: string;
  sourceMode: "concierge" | "scan" | "stylist" | "wishlist" | "shop";
  targetMode: "scan" | "stylist" | "wishlist" | "shop";
  triggerUtterance: string;
  summary: string;
  sessionGoal?: string | null;
  activeStoreId?: string | null;
  activeCity?: string | null;
  currentGarmentId?: string | null;
  selectedClosetItemIds?: string[];
  recentWishlistItemIds?: string[];
  recentWebResults?: Array<{ title: string; url: string; domain?: string }>;
  itemContext?: ConciergeHandoffItemContext;
  eventContext?: string;
  bootstrapText: string;
  createdAtMs: number;
};

export type ConciergeTranscriptLine = {
  id: string;
  mode: ConciergeMode;
  role: "agent" | "system" | "user";
  text: string;
  timestamp: number;
};

export type ConciergeSessionState = {
  activeMode: ConciergeMode;
  previousMode: ConciergeMode | null;
  sessionGoal: string | null;
  handoffReason: string | null;
  currentInputMode: "camera" | "mic";
  currentGarmentId: string | null;
  selectedClosetItemIds: string[];
  recentWishlistItemIds: string[];
  activeStoreId: string | null;
  activeCity: string | null;
  recentWebResults: Array<{ title: string; url: string; domain?: string }>;
  lastUserUtterance: string | null;
  pendingHandoff: ConciergeHandoffContext | null;
  transcriptThread: ConciergeTranscriptLine[];
};
