import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  LayoutChangeEvent,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import ActiveTabContent from "./src/components/ActiveTabContent";
import AppOverlays from "./src/components/AppOverlays";
import AuroraBackground from "./src/components/ui/AuroraBackground";
import AnimatedPressable from "./src/components/ui/AnimatedPressable";
import WishlistVisualPreview from "./src/components/ui/WishlistVisualPreview";
import { loadWebFonts } from "./src/design/fonts";
import type { AuroraMode } from "./src/design/aurora";
import { C, styles } from "./src/styles/appStyles";
import {
  useCalendarLogViewModels,
  useClosetViewModels,
  useConciergeViewModels,
  useHomeViewModels,
  useWishlistViewModels,
} from "./src/hooks/useTabViewModels";
import { useWishlistAgentSession } from "./src/hooks/useWishlistAgentSession";
import {
  buildConciergeRoute,
} from "./src/concierge/routing";
import type {
  ConciergeHandoffContext,
  ConciergeSessionState,
} from "./src/concierge/types";
import { MAX_SHOP_MAP_MARKERS, SHOP_FRAME_STREAM_INTERVAL_MS } from "./src/shop/constants";
import type { ShopCoords, ShopGeoPermission } from "./src/shop/types";
import {
  estimateDistanceMeters,
  shopSearchRadiusForZoom,
} from "./src/shop/utils/geo";
import {
  buildShopStaticMapUrl,
  filterShopStoresByQuery,
  filterShopStoresByViewport,
  hasShopSearchAreaChange,
  projectShopOverlayMarkers,
} from "./src/shop/utils/map";
import {
  normalizeSustainabilityScore,
} from "./src/shop/utils/sustainability";
import { extractColorTokens } from "./src/utils/colors";

import {
  addFavoriteStore,
  createWardrobeItem,
  createLiveEphemeralToken,
  deleteFavoriteStore,
  deleteWishlistItem,
  deleteWardrobeItem,
  dispatchWardrobeTool,
  enhanceWardrobeItemSnippet,
  enhanceWardrobePreview,
  extractWardrobeCard,
  fetchDirectoryStores,
  fetchNearbyShops,
  finalizeWardrobeScan,
  generateMarketplaceListing,
  generateTryOn,
  getFavoriteStores,
  getWardrobeLogs,
  getWishlist,
  getWardrobeItems,
  logWardrobeOutfit,
  matchWishlistItemToNearbyShops,
  optimizeWardrobe,
  refreshDirectoryStores,
  upsertWishlistItem,
  getUserStyleProfile,
  upsertUserStylePhoto,
  updateWardrobeItem,
} from "./src/api";
import { ensureAuthSession } from "./src/auth";
import { createLiveTextClient, type LiveClientHandle } from "./src/live";
import type { LiveLine, LiveStatus } from "./src/live/types";
import type {
  FavoriteStore,
  UserStyleProfile,
  MarketplaceListing,
  NearbyStore,
  WearLogEntry,
  WardrobeCardDraft,
  WardrobeItem,
  WishlistItem,
  WishlistScoutCard,
  WardrobeOptimizeResult,
} from "./src/types";

const PHASES = ["auto"] as const;
const APP_STORE_LABEL = "Winnie";
const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const GOOGLE_MAPS_PUBLIC_KEY = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
const AUTO_CAPTURE_INTERVAL_MS = 4200;
const SIGNALLED_CAPTURE_MAX_AGE_MS = 15000;
const CAPTURE_ENHANCEMENT_WAIT_MS = 12000;
const ENHANCE_RETRY_COOLDOWN_MS = 15000;
const ENABLE_CLOSET_RETRY_ENHANCEMENT = false;
const STYLIST_CARD_POSITIONS = [
  { x: -210, y: -70 },
  { x: 0, y: -200 },
  { x: 210, y: -70 },
  { x: -150, y: 145 },
  { x: 150, y: 145 },
] as const;

const LIVE_CARD_FIELDS = [
  { key: "category", label: "Category" },
  { key: "color", label: "Color" },
  { key: "fabric_type", label: "Fabric" },
  { key: "style", label: "Style" },
  { key: "estimated_fit", label: "Fit" },
  { key: "note", label: "Extra notes" },
] as const;

const REQUIRED_LIVE_FIELDS = ["category", "color", "fabric_type"] as const;
const FIRST_RUN_TUTORIAL_STORAGE_KEY = "winnie:first-run-tutorial-v1";

type Tab = "home" | "closet" | "wishlist" | "shop";
type AgentMode = "scan" | "stylist" | "wishlist" | "shop";
type ShopBrowseMode = "nearby" | "directory";
type StylistExternalSuggestion = {
  slot: string;
  title: string;
  url: string;
  aestheticGoal?: string;
  aestheticMatch?: string;
  physicalStores?: string[];
  searchQueries?: string[];
};
type StylistWebResult = {
  title: string;
  url: string;
  domain?: string;
};
type MarketplaceListingModalState = {
  itemId: string;
  itemTitle: string;
  listing: MarketplaceListing;
};
const LOG_CATEGORY_ORDER = ["tops", "bottoms", "outerwear", "formalwear", "shoes", "other"] as const;

function formatUsd(value: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (Platform.OS === "web") {
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return true;
    }
    return false;
  }
  return false;
}

function toDataUri(base64?: string): string | undefined {
  if (!base64) {
    return undefined;
  }
  const trimmed = base64.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }
  // Detect PNG (base64 of \x89PNG starts with "iVBOR")
  const mime = trimmed.startsWith("iVBOR") ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${trimmed}`;
}

function resolveImageUri(
  primaryBase64?: string,
  secondaryBase64?: string,
  imageUrl?: string
): string | undefined {
  return toDataUri(primaryBase64 ?? secondaryBase64) || cleanValue(imageUrl);
}

function toClosetEditorDraft(item: WardrobeItem): ClosetEditorDraft {
  return {
    phase: item.phase ?? "",
    category: item.category ?? "",
    title: item.title ?? "",
    color: item.color ?? "",
    fabric_type: item.fabric_type ?? "",
    style: item.style ?? "",
    estimated_fit: item.estimated_fit ?? "",
    note: item.note ?? "",
    condition: item.condition ?? "",
  };
}

function applyStyleProfile(
  profile: UserStyleProfile | null | undefined,
  setPhoto: (next: string) => void,
  setUpdatedAt: (next: string) => void,
  setTryOn: (next: string) => void
): void {
  if (!profile) {
    setPhoto("");
    setUpdatedAt("");
    return;
  }
  setPhoto((profile.model_photo_base64 || "").trim());
  setUpdatedAt((profile.model_photo_updated_at || "").trim());
  const lastTryOn = (profile.last_tryon_image_base64 || "").trim();
  if (lastTryOn) {
    setTryOn(lastTryOn);
  }
}

function formatPhaseLabel(phase: string): string {
  return phase.slice(0, 1).toUpperCase() + phase.slice(1);
}

function statusLabel(status: LiveStatus): string {
  if (status === "connected") {
    return "Agent Live";
  }
  if (status === "connecting") {
    return "Connecting";
  }
  if (status === "error") {
    return "Agent Error";
  }
  return "Agent Offline";
}

function maskKey(value: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "<missing>";
  }
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}...(${trimmed.length})`;
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)} (${trimmed.length})`;
}

function resolveColorSwatch(color: string): { backgroundColor: string; borderColor?: string } {
  const normalized = color.trim().toLowerCase();
  switch (normalized) {
    case "black":
      return { backgroundColor: "#161616" };
    case "white":
      return { backgroundColor: "#FFFFFF", borderColor: "#D6D6D6" };
    case "gray":
      return { backgroundColor: "#9AA0A6" };
    case "brown":
      return { backgroundColor: "#8B5A3C" };
    case "beige":
    case "cream":
    case "tan":
      return { backgroundColor: "#D8C29D" };
    case "red":
      return { backgroundColor: "#C73C33" };
    case "orange":
      return { backgroundColor: "#E7872C" };
    case "yellow":
      return { backgroundColor: "#E5C542" };
    case "green":
    case "sage green":
      return { backgroundColor: "#6D8F63" };
    case "blue":
      return { backgroundColor: "#4C78C9" };
    case "navy":
      return { backgroundColor: "#243B6B" };
    case "purple":
      return { backgroundColor: "#7E57C2" };
    case "pink":
      return { backgroundColor: "#E48CB2" };
    case "gold":
      return { backgroundColor: "#C9A227" };
    case "silver":
      return { backgroundColor: "#B9C0C8" };
    case "multicolor":
      return { backgroundColor: "#E5D7F4", borderColor: "#A774D1" };
    default:
      return { backgroundColor: "#CBB9A5" };
  }
}

function latestLineText(lines: LiveLine[]): string | undefined {
  return lines[0]?.text?.trim() || undefined;
}

function hasMeaningfulCardValue(value?: string): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized) && !["unknown", "n/a", "na", "none", "null"].includes(normalized);
}

function isEnhancedSnippetBase64(base64?: string): boolean {
  const raw = (base64 || "").trim();
  if (!raw) {
    return false;
  }
  if (raw.startsWith("data:image/png")) {
    return true;
  }
  return raw.startsWith("iVBOR");
}

function isLiveCardReady(item: ParsedLiveWardrobe["payload"] | null): boolean {
  if (!item) return false;
  return REQUIRED_LIVE_FIELDS.every((key) => hasMeaningfulCardValue(item[key]));
}

function toCardFingerprint(item: {
  phase: string;
  category: string;
  color?: string;
  fabric_type?: string;
  style?: string;
  condition?: string;
  estimated_fit?: string;
}): string {
  return [
    item.phase,
    item.category,
    item.color ?? "",
    item.fabric_type ?? "",
    item.style ?? "",
    item.condition ?? "",
    item.estimated_fit ?? ""
  ]
    .map((value) => value.trim().toLowerCase())
    .join("|");
}

function buildImageSignature(base64?: string): string {
  const raw = (base64 || "").trim();
  if (!raw) {
    return "";
  }
  const head = raw.slice(0, 64);
  const tail = raw.slice(-64);
  return `${raw.length}:${head}:${tail}`;
}

type ParsedLiveWardrobe = {
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
  };
  feedback: string;
  missingFields: string[];
  questionForUser: string;
  readyForNextItem: boolean;
};

type ClosetEditorDraft = {
  phase: string;
  category: string;
  title: string;
  color: string;
  fabric_type: string;
  style: string;
  estimated_fit: string;
  note: string;
  condition: string;
};

function normalizeImagePayload(
  base64OrDataUri: string,
  fallbackMimeType = "image/jpeg"
): { data: string; mimeType: string } {
  let current = (base64OrDataUri || "").trim();
  let mimeType = fallbackMimeType.toLowerCase();
  for (let i = 0; i < 3; i += 1) {
    const match = current.match(/^data:([^;,]+)(?:;[^,]*)?,([\s\S]*)$/i);
    if (!match) {
      break;
    }
    mimeType = (match[1] || mimeType).toLowerCase();
    current = (match[2] || "").trim();
  }
  return {
    data: current.replace(/\s+/g, ""),
    mimeType
  };
}

async function buildItemSnippetBase64(
  base64OrDataUri: string,
  mimeType = "image/jpeg"
): Promise<string> {
  const normalized = normalizeImagePayload(base64OrDataUri, mimeType || "image/jpeg");
  const sourceMimeType = normalized.mimeType;
  const sourceBase64 = normalized.data;

  if (!sourceBase64) {
    return "";
  }

  if (Platform.OS !== "web") {
    return sourceBase64;
  }

  const anyGlobal = globalThis as any;
  const ImageCtor = anyGlobal.Image;
  const doc = anyGlobal.document;
  if (!ImageCtor || !doc?.createElement) {
    return sourceBase64;
  }

  return new Promise((resolve) => {
    const image = new ImageCtor();
    image.onload = () => {
      try {
        const sourceWidth = Number(image.width) || 0;
        const sourceHeight = Number(image.height) || 0;
        if (!sourceWidth || !sourceHeight) {
          resolve(sourceBase64);
          return;
        }

        const canvas = doc.createElement("canvas");
        const targetWidth = 576;
        const targetHeight = 768;
        const inset = 32;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(sourceBase64);
          return;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        const scale = Math.min(
          (targetWidth - inset * 2) / sourceWidth,
          (targetHeight - inset * 2) / sourceHeight
        );
        const drawWidth = Math.max(1, Math.round(sourceWidth * scale));
        const drawHeight = Math.max(1, Math.round(sourceHeight * scale));
        const dx = Math.round((targetWidth - drawWidth) / 2);
        const dy = Math.round((targetHeight - drawHeight) / 2);
        ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight, dx, dy, drawWidth, drawHeight);
        const outputDataUri = canvas.toDataURL("image/jpeg", 0.84);
        const outputBase64 = outputDataUri.split(",", 2)[1];
        resolve(outputBase64 || sourceBase64);
      } catch {
        resolve(sourceBase64);
      }
    };
    image.onerror = () => resolve(sourceBase64);
    image.src = `data:${sourceMimeType};base64,${sourceBase64}`;
  });
}

function cleanValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseJsonFromText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const direct = JSON.parse(trimmed) as Record<string, unknown>;
    if (direct && typeof direct === "object") {
      return direct;
    }
  } catch {
    // continue with extraction
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      const parsed = JSON.parse(fenced[1]) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // continue with brace extraction
    }
  }

  const braces = trimmed.match(/\{[\s\S]*\}/);
  if (braces?.[0]) {
    try {
      const parsed = JSON.parse(braces[0]) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function feedbackFromLiveText(text: string): string {
  const parsed = parseJsonFromText(text);
  if (parsed) {
    return (
      cleanValue(parsed.feedback) ??
      cleanValue(parsed.note) ??
      "Frame captured. Show the next garment with full front view."
    );
  }
  const clean = text.trim();
  if (!clean) {
    return "Frame captured. Show the next garment with full front view.";
  }
  return clean;
}

function toParsedWardrobe(
  phase: string,
  imageBase64: string,
  liveText: string,
  existingPayload?: ParsedLiveWardrobe["payload"] | null
): ParsedLiveWardrobe {
  const parsed = parseJsonFromText(liveText);
  const normalizedPhase = phase.trim().toLowerCase();
  const category = (
    cleanValue(parsed?.category)?.toLowerCase() ||
    cleanValue(existingPayload?.category)?.toLowerCase() ||
    normalizedPhase
  );
  const feedback =
    cleanValue(parsed?.feedback) ??
    "Item captured. Show a different garment or angle for better coverage.";
  const missingFieldsRaw = parsed?.missing_fields;
  const missingFields = Array.isArray(missingFieldsRaw)
    ? missingFieldsRaw
        .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
        .filter(Boolean)
    : [];

  const questionForUser =
    cleanValue(parsed?.question_for_user) ??
    (missingFields.length
      ? `I still need: ${missingFields.join(", ")}.`
      : "Show a clearer angle if any details are missing.");

  const readyForNextItem = Boolean(
    parsed?.ready_for_next_item === true || parsed?.complete === true
  );

  return {
    payload: {
      phase: normalizedPhase,
      category,
      title: cleanValue(parsed?.title) ?? cleanValue(existingPayload?.title),
      color: cleanValue(parsed?.color)?.toLowerCase() ?? cleanValue(existingPayload?.color),
      style: cleanValue(parsed?.style)?.toLowerCase() ?? cleanValue(existingPayload?.style),
      fabric_type:
        cleanValue(parsed?.fabric_type)?.toLowerCase() ?? cleanValue(existingPayload?.fabric_type),
      condition:
        cleanValue(parsed?.condition)?.toLowerCase() ?? cleanValue(existingPayload?.condition),
      estimated_fit:
        cleanValue(parsed?.estimated_fit)?.toLowerCase() ?? cleanValue(existingPayload?.estimated_fit),
      note: cleanValue(parsed?.note) ?? cleanValue(existingPayload?.note),
      image_base64: imageBase64,
      item_snippet_base64: imageBase64
    },
    feedback,
    missingFields,
    questionForUser,
    readyForNextItem
  };
}

function extractSampleRate(mimeType?: string): number {
  if (!mimeType) {
    return 24000;
  }
  const match = mimeType.match(/rate=([0-9]+)/i);
  if (!match?.[1]) {
    return 24000;
  }
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 24000;
  }
  return parsed;
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const anyGlobal = globalThis as { atob?: (value: string) => string };
  if (!anyGlobal.atob) {
    throw new Error("Base64 decode is unavailable in this runtime");
  }
  const binary = anyGlobal.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function encodeBytesToBase64(bytes: Uint8Array): string {
  const anyGlobal = globalThis as { btoa?: (value: string) => string };
  if (!anyGlobal.btoa) {
    throw new Error("Base64 encode is unavailable in this runtime");
  }
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return anyGlobal.btoa(binary);
}

function pcm16BytesToFloat32(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(Math.floor(bytes.byteLength / 2));
  for (let i = 0; i < samples.length; i += 1) {
    const value = view.getInt16(i * 2, true);
    samples[i] = value / 0x8000;
  }
  return samples;
}

function float32ToPcm16Bytes(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    const intValue = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
    view.setInt16(i * 2, intValue, true);
  }
  return bytes;
}

function downsampleFloat32(
  input: Float32Array,
  inputRate: number,
  outputRate: number
): Float32Array {
  if (outputRate >= inputRate) {
    return input;
  }
  const ratio = inputRate / outputRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);
  let outputIndex = 0;
  let inputIndex = 0;
  while (outputIndex < outputLength) {
    const nextInputIndex = Math.round((outputIndex + 1) * ratio);
    let total = 0;
    let count = 0;
    for (let i = inputIndex; i < nextInputIndex && i < input.length; i += 1) {
      total += input[i] ?? 0;
      count += 1;
    }
    output[outputIndex] = count > 0 ? total / count : 0;
    outputIndex += 1;
    inputIndex = nextInputIndex;
  }
  return output;
}

// Load web fonts on startup
loadWebFonts();

export default function App() {
  const window = useWindowDimensions();
  const useSideBySideEditor = window.width >= 860;
  const cameraRef = useRef<CameraView | null>(null);
  const liveClientRef = useRef<LiveClientHandle | null>(null);
  const stylistClientRef = useRef<LiveClientHandle | null>(null);
  const captureInFlightRef = useRef(false);
  const inputAudioContextRef = useRef<any>(null);
  const inputMediaStreamRef = useRef<any>(null);
  const inputProcessorRef = useRef<any>(null);
  const inputSourceRef = useRef<any>(null);
  const inputSilentGainRef = useRef<any>(null);
  const outputAudioContextRef = useRef<any>(null);
  const outputPlaybackCursorRef = useRef(0);
  const stylistInputAudioContextRef = useRef<any>(null);
  const stylistInputMediaStreamRef = useRef<any>(null);
  const stylistInputProcessorRef = useRef<any>(null);
  const stylistInputSourceRef = useRef<any>(null);
  const stylistInputSilentGainRef = useRef<any>(null);
  const stylistOutputAudioContextRef = useRef<any>(null);
  const stylistOutputPlaybackCursorRef = useRef(0);
  const stylistSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stylistRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stylistRetryAttemptRef = useRef(0);
  const stylistShouldReconnectRef = useRef(false);
  const homeSummaryPulseAnim = useRef(new Animated.Value(0)).current;
  const stylistVoiceBreathAnim = useRef(new Animated.Value(0)).current;
  const stylistSpeechAnim = useRef(new Animated.Value(0)).current;
  const shopClientRef = useRef<LiveClientHandle | null>(null);
  const shopInputAudioContextRef = useRef<any>(null);
  const shopInputMediaStreamRef = useRef<any>(null);
  const shopInputProcessorRef = useRef<any>(null);
  const shopInputSourceRef = useRef<any>(null);
  const shopInputSilentGainRef = useRef<any>(null);
  const shopOutputAudioContextRef = useRef<any>(null);
  const shopOutputPlaybackCursorRef = useRef(0);
  const shopFrameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shopLastFrameBase64Ref = useRef("");
  const shopLatestStoreItemRef = useRef("");
  const shopLastSuggestedIdsRef = useRef<string[]>([]);
  const shopAutoRefreshDoneRef = useRef(false);
  const shopAutoDirectoryAttemptedRef = useRef(false);
  const shopPlacesCooldownUntilRef = useRef(0);
  const shopSuppressNextNativeViewportRef = useRef(false);
  const shopMapCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const shopMapZoomRef = useRef(10);
  const shopMapLastWheelAtRef = useRef(0);
  const shopMapLastTapMsRef = useRef(0);
  const shopMapDragStartRef = useRef<{
    x: number;
    y: number;
    center: { lat: number; lng: number };
  } | null>(null);
  const shopMapDraggedRef = useRef(false);
  const shopDragAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const shopDragDxRef = useRef(0);
  const shopDragDyRef = useRef(0);
  const shopZoomScaleAnim = useRef(new Animated.Value(1)).current;
  const shopPinchActiveRef = useRef(false);
  const shopPinchStartDistRef = useRef(0);
  const shopPinchStartZoomRef = useRef(0);
  const shopPinchScaleRef = useRef(1);
  const shopCarouselRef = useRef<ScrollView | null>(null);
  const conciergeClientRef = useRef<LiveClientHandle | null>(null);
  const conciergeInputAudioContextRef = useRef<any>(null);
  const conciergeInputMediaStreamRef = useRef<any>(null);
  const conciergeInputProcessorRef = useRef<any>(null);
  const conciergeInputSourceRef = useRef<any>(null);
  const conciergeInputSilentGainRef = useRef<any>(null);
  const conciergeOutputAudioContextRef = useRef<any>(null);
  const conciergeOutputPlaybackCursorRef = useRef(0);
  const wishlistVoiceBreathAnim = useRef(new Animated.Value(0)).current;
  const wishlistSpeechAnim = useRef(new Animated.Value(0)).current;
  const lastSavedFingerprintRef = useRef("");
  const lastSavedImageSigRef = useRef("");
  const lastSavedAtRef = useRef(0);
  const lastCoordinatorDigestRef = useRef("");
  const lastFrameBase64Ref = useRef("");
  const conciergeSessionRef = useRef<ConciergeSessionState>({
    activeMode: "concierge",
    previousMode: null,
    sessionGoal: null,
    handoffReason: null,
    currentInputMode: "mic",
    currentGarmentId: null,
    selectedClosetItemIds: [],
    recentWishlistItemIds: [],
    activeStoreId: null,
    activeCity: null,
    recentWebResults: [],
    lastUserUtterance: null,
    pendingHandoff: null,
    transcriptThread: [],
  });
  const consumedHandoffIdRef = useRef("");
  const handleRouteToolCallRef = useRef<
    | ((
        sourceMode: "concierge" | AgentMode,
        args: Record<string, unknown>
      ) => Promise<Record<string, unknown>>)
    | null
  >(null);
  const signaledCaptureBase64Ref = useRef("");
  const signaledCaptureAtRef = useRef(0);
  const signaledCaptureEnhancedRef = useRef(false);
  const captureEnhancementInFlightRef = useRef(false);
  const captureEnhancementTokenRef = useRef(0);
  const captureEnhancementPromiseRef = useRef<Promise<void> | null>(null);
  const enhancementAttemptAtRef = useRef<Map<string, number>>(new Map());
  const enhancementInFlightRef = useRef<Set<string>>(new Set());
  const pendingItemRef = useRef<ParsedLiveWardrobe["payload"] | null>(null);
  const lockedSnippetRef = useRef<string>("");
  const lockedImageRef = useRef<string>("");

  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [authLoading, setAuthLoading] = useState(true);
  const [firstRunTutorialVisible, setFirstRunTutorialVisible] = useState(false);
  const [userId, setUserId] = useState("demo-user");
  const [idToken, setIdToken] = useState<string | undefined>(undefined);
  const [authMode, setAuthMode] = useState<"firebase" | "demo">("demo");

  const [activeAgentSession, setActiveAgentSession] = useState<AgentMode | null>(null);
  const [conciergeSession, setConciergeSession] = useState<ConciergeSessionState>({
    activeMode: "concierge",
    previousMode: null,
    sessionGoal: null,
    handoffReason: null,
    currentInputMode: "mic",
    currentGarmentId: null,
    selectedClosetItemIds: [],
    recentWishlistItemIds: [],
    activeStoreId: null,
    activeCity: null,
    recentWebResults: [],
    lastUserUtterance: null,
    pendingHandoff: null,
    transcriptThread: [],
  });
  const [isPortalVisible, setIsPortalVisible] = useState(false);
  const [isConciergeVisible, setIsConciergeVisible] = useState(false);
  const [conciergeRootStatus, setConciergeRootStatus] = useState<LiveStatus>("offline");
  const [conciergeRootModelName, setConciergeRootModelName] = useState("");
  const [conciergeRootLines, setConciergeRootLines] = useState<LiveLine[]>([]);
  const [conciergeRootMicStreaming, setConciergeRootMicStreaming] = useState(false);
  const [conciergeRootSpeakerEnabled, setConciergeRootSpeakerEnabled] = useState(true);
  const [scanStarted, setScanStarted] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [instruction, setInstruction] = useState(
    "When scan starts, I will guide you in real time while your camera explores your wardrobe."
  );
  const [latestFeedback, setLatestFeedback] = useState("");
  const [capturedItems, setCapturedItems] = useState<WardrobeItem[]>([]);
  const [pendingItem, setPendingItem] = useState<ParsedLiveWardrobe["payload"] | null>(null);
  const [captureProcessing, setCaptureProcessing] = useState(false);
  const [scanSummary, setScanSummary] = useState("");
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("offline");
  const [liveLines, setLiveLines] = useState<LiveLine[]>([]);
  const [liveModelName, setLiveModelName] = useState("");
  const [micStreaming, setMicStreaming] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [enhancingIds, setEnhancingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [editorDraft, setEditorDraft] = useState<ClosetEditorDraft | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [selectedTryOnItemIds, setSelectedTryOnItemIds] = useState<Set<string>>(new Set());
  const [styleProfilePhotoBase64, setStyleProfilePhotoBase64] = useState("");
  const [styleProfileUpdatedAt, setStyleProfileUpdatedAt] = useState("");
  const [stylePhotoSaving, setStylePhotoSaving] = useState(false);
  const [tryOnBusy, setTryOnBusy] = useState(false);
  const [tryOnModalVisible, setTryOnModalVisible] = useState(false);
  const [tryOnImageBase64, setTryOnImageBase64] = useState("");
  const [stylistModalVisible, setStylistModalVisible] = useState(false);
  const [stylistStatus, setStylistStatus] = useState<LiveStatus>("offline");
  const [stylistModelName, setStylistModelName] = useState("");
  const [stylistLines, setStylistLines] = useState<LiveLine[]>([]);
  const [stylistMicStreaming, setStylistMicStreaming] = useState(false);
  const [stylistSpeakerEnabled, setStylistSpeakerEnabled] = useState(true);
  const [stylistSuggestedItemIds, setStylistSuggestedItemIds] = useState<Set<string>>(new Set());
  const [stylistLastCloseCode, setStylistLastCloseCode] = useState<number | null>(null);
  const [stylistExternalSuggestions, setStylistExternalSuggestions] = useState<
    StylistExternalSuggestion[]
  >([]);
  const [stylistWebSearchQueries, setStylistWebSearchQueries] = useState<string[]>([]);
  const [stylistWebResults, setStylistWebResults] = useState<StylistWebResult[]>([]);
  const [stylistAgentSpeaking, setStylistAgentSpeaking] = useState(false);
  const [shopStatus, setShopStatus] = useState<LiveStatus>("offline");
  const [shopModelName, setShopModelName] = useState("");
  const [shopLines, setShopLines] = useState<LiveLine[]>([]);
  const [shopMicStreaming, setShopMicStreaming] = useState(false);
  const [shopSpeakerEnabled, setShopSpeakerEnabled] = useState(true);
  const [shopSuggestedItemIds, setShopSuggestedItemIds] = useState<Set<string>>(new Set());
  const [shopTryOnImageBase64, setShopTryOnImageBase64] = useState("");
  const [shopTryOnModalVisible, setShopTryOnModalVisible] = useState(false);
  const [shopAssistantActive, setShopAssistantActive] = useState(false);
  const [shopGeoPermission, setShopGeoPermission] = useState<ShopGeoPermission>("unknown");
  const [shopLocation, setShopLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [shopStores, setShopStores] = useState<NearbyStore[]>([]);
  const [shopStoresLoading, setShopStoresLoading] = useState(false);
  const [shopStoresError, setShopStoresError] = useState("");
  const [shopBrowseMode, setShopBrowseMode] = useState<ShopBrowseMode>("nearby");
  const [shopDirectoryCityDraft, setShopDirectoryCityDraft] = useState("");
  const [shopDirectoryCity, setShopDirectoryCity] = useState("");
  const [shopDirectoryRefreshBusy, setShopDirectoryRefreshBusy] = useState(false);
  const [shopSelectedStoreId, setShopSelectedStoreId] = useState("");
  const [shopFavoriteStores, setShopFavoriteStores] = useState<FavoriteStore[]>([]);
  const [shopFavoritesOnly, setShopFavoritesOnly] = useState(false);
  const [shopFavoriteBusyIds, setShopFavoriteBusyIds] = useState<Set<string>>(new Set());
  const [shopSearchQuery, setShopSearchQuery] = useState("");
  const [shopMatchMode, setShopMatchMode] = useState(false);
  const [shopMatchLoading, setShopMatchLoading] = useState(false);
  const [shopMatchedStores, setShopMatchedStores] = useState<NearbyStore[]>([]);
  const [shopMatchedWishlistCard, setShopMatchedWishlistCard] = useState<WishlistScoutCard | null>(
    null
  );
  const [shopMapCenter, setShopMapCenter] = useState<ShopCoords | null>(null);
  const [shopMapZoom, setShopMapZoom] = useState(10);
  const [shopMapSize, setShopMapSize] = useState<{ width: number; height: number }>({
    width: 320,
    height: 280
  });
  const [shopLastLoadedCenter, setShopLastLoadedCenter] = useState<ShopCoords | null>(null);
  const [shopLastLoadedZoom, setShopLastLoadedZoom] = useState(10);
  const [shopMapDirty, setShopMapDirty] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistDeletingIds, setWishlistDeletingIds] = useState<Set<string>>(new Set());
  const [wishlistFormCategory, setWishlistFormCategory] = useState("");
  const [wishlistFormColor, setWishlistFormColor] = useState("");
  const [wishlistFormNotes, setWishlistFormNotes] = useState("");
  const [wishlistFormBusy, setWishlistFormBusy] = useState(false);
  const [wishlistViewMode, setWishlistViewMode] = useState<"ai" | "manual">("ai");
  const [wishlistDetailCard, setWishlistDetailCard] = useState<WishlistScoutCard | null>(null);
  const [dailyLogSelectionIds, setDailyLogSelectionIds] = useState<Set<string>>(new Set());
  const [dailyLogBusy, setDailyLogBusy] = useState(false);
  const [calendarLogDate, setCalendarLogDate] = useState("");
  const [calendarLogModalVisible, setCalendarLogModalVisible] = useState(false);
  const [calendarLogCategoryTab, setCalendarLogCategoryTab] = useState("all");
  const [calendarLogColorFilter, setCalendarLogColorFilter] = useState("all");
  const [calendarLogSearchQuery, setCalendarLogSearchQuery] = useState("");
  const [closetCategoryTab, setClosetCategoryTab] = useState("all");
  const [closetColorFilter, setClosetColorFilter] = useState("all");
  const [closetSearchQuery, setClosetSearchQuery] = useState("");
  const [wearLogs, setWearLogs] = useState<WearLogEntry[]>([]);
  const [optimizerBusy, setOptimizerBusy] = useState(false);
  const [optimizerResult, setOptimizerResult] = useState<WardrobeOptimizeResult | null>(null);
  const [listingBusyIds, setListingBusyIds] = useState<Set<string>>(new Set());
  const [listingModal, setListingModal] = useState<MarketplaceListingModalState | null>(null);
  const [listingKeepBusy, setListingKeepBusy] = useState(false);

  const shopCarouselCardWidth = Math.min(380, Math.max(300, window.width - 72));

  const currentPhase = PHASES[0];
  const lastCapture = capturedItems[0];
  const selectedTryOnCount = selectedTryOnItemIds.size;
  const selectedTryOnPreviewItems = useMemo(
    () => capturedItems.filter((item) => selectedTryOnItemIds.has(item.id)).slice(0, 6),
    [capturedItems, selectedTryOnItemIds]
  );
  const tryOnPreviewSlots = useMemo(
    () => Array.from({ length: 6 }, (_, index) => selectedTryOnPreviewItems[index] ?? null),
    [selectedTryOnPreviewItems]
  );
  const hasModelPhoto = Boolean(styleProfilePhotoBase64.trim());
  const latestScanLine = latestLineText(liveLines);
  const latestConciergeRootLine = latestLineText(conciergeRootLines);
  const latestStylistLine = latestLineText(stylistLines);
  const latestShopLine = latestLineText(shopLines);
  const shopSourceStores = useMemo(
    () => (shopMatchMode ? shopMatchedStores : shopStores),
    [shopMatchMode, shopMatchedStores, shopStores]
  );
  const shopScopedStores = useMemo(
    () =>
      shopFavoritesOnly
        ? shopSourceStores.filter((store) => Boolean(store.is_favorite))
        : shopSourceStores,
    [shopFavoritesOnly, shopSourceStores]
  );
  const shopVisibleStores = useMemo(
    () => filterShopStoresByQuery(shopScopedStores, shopSearchQuery),
    [shopScopedStores, shopSearchQuery]
  );
  const shopPerimeterStores = useMemo(
    () =>
      filterShopStoresByViewport(shopVisibleStores, {
        mapCenter: shopMapCenter,
        fallbackCenter: shopLocation,
        zoom: shopMapZoom
      }),
    [shopLocation, shopMapCenter, shopMapZoom, shopVisibleStores]
  );
  const shopSelectedStore = useMemo(
    () => shopPerimeterStores.find((store) => store.id === shopSelectedStoreId) || null,
    [shopPerimeterStores, shopSelectedStoreId]
  );
  const shopScoutHeadline = useMemo(() => {
    if (!shopMatchMode || !shopMatchedWishlistCard) {
      return {
        eyebrow: "Personalized Scout",
        title: shopBrowseMode === "directory" && shopDirectoryCity ? `Shop Radar: ${shopDirectoryCity}` : "Shop Radar",
        body:
          shopBrowseMode === "directory" && shopDirectoryCity
            ? `Browsing the saved city directory for ${shopDirectoryCity}. Move around freely without re-querying stores.`
            : "Browse nearby secondhand clothing stores around you."
      };
    }
    const label = [shopMatchedWishlistCard.color, shopMatchedWishlistCard.category]
      .filter(Boolean)
      .join(" ")
      .trim();
    return {
      eyebrow: "Style Scout",
      title: label ? `Matchmaker: ${label}` : `Matchmaker: ${shopMatchedWishlistCard.category}`,
      body: shopMatchedWishlistCard.reasoning || "Focused nearby matches for this wishlist item."
    };
  }, [shopBrowseMode, shopDirectoryCity, shopMatchMode, shopMatchedWishlistCard]);
  const shopStaticMapUrl = useMemo(
    () =>
      buildShopStaticMapUrl({
        apiKey: GOOGLE_MAPS_PUBLIC_KEY,
        mapCenter: shopMapCenter,
        fallbackCenter: shopLocation,
        zoom: shopMapZoom,
        stores: shopPerimeterStores,
        selectedStore: shopSelectedStore,
        maxMarkers: MAX_SHOP_MAP_MARKERS
      }),
    [shopLocation, shopMapCenter, shopMapZoom, shopPerimeterStores, shopSelectedStore]
  );
  const shopOverlayMarkers = useMemo(
    () =>
      projectShopOverlayMarkers({
        mapCenter: shopMapCenter,
        fallbackCenter: shopLocation,
        size: shopMapSize,
        zoom: shopMapZoom,
        stores: shopPerimeterStores,
        maxMarkers: MAX_SHOP_MAP_MARKERS
      }),
    [shopLocation, shopMapCenter, shopMapSize, shopMapZoom, shopPerimeterStores]
  );
  const shopNeedsSearchAreaRefresh = useMemo(
    () =>
      shopBrowseMode === "nearby" &&
      !shopMatchMode &&
      shopMapDirty &&
      hasShopSearchAreaChange({
        currentCenter: shopMapCenter,
        loadedCenter: shopLastLoadedCenter,
        currentZoom: shopMapZoom,
        loadedZoom: shopLastLoadedZoom
      }),
    [
      shopBrowseMode,
      shopLastLoadedCenter,
      shopLastLoadedZoom,
      shopMapCenter,
      shopMapDirty,
      shopMapZoom,
      shopMatchMode
    ]
  );

  useEffect(() => {
    conciergeSessionRef.current = conciergeSession;
  }, [conciergeSession]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(homeSummaryPulseAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(homeSummaryPulseAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => {
      pulseLoop.stop();
      homeSummaryPulseAnim.stopAnimation();
    };
  }, [homeSummaryPulseAnim]);

  const patchConciergeSession = useCallback(
    (
      updater:
        | Partial<Omit<ConciergeSessionState, "transcriptThread">>
        | ((
            current: ConciergeSessionState
          ) => Partial<Omit<ConciergeSessionState, "transcriptThread">>)
    ) => {
      setConciergeSession((current) => {
        const patch = typeof updater === "function" ? updater(current) : updater;
        return {
          ...current,
          ...patch,
        };
      });
    },
    []
  );

  const appendConciergeTranscript = useCallback(
    (mode: ConciergeSessionState["activeMode"], role: LiveLine["role"], text: string) => {
      const clean = text.trim();
      if (!clean) {
        return;
      }
      setConciergeSession((current) => ({
        ...current,
        transcriptThread: [
          {
            id: `${Date.now()}-${Math.random()}`,
            mode,
            role,
            text: clean,
            timestamp: Date.now(),
          },
          ...current.transcriptThread,
        ].slice(0, 40),
        lastUserUtterance: role === "user" ? clean : current.lastUserUtterance,
      }));
    },
    []
  );

  const buildHandoffBootstrapText = useCallback((handoff: ConciergeHandoffContext) => {
    const parts: string[] = [];
    if (handoff.summary) {
      parts.push(handoff.summary);
    } else if (handoff.triggerUtterance) {
      parts.push(`The user just said: "${handoff.triggerUtterance}"`);
    }
    if (handoff.eventContext) {
      parts.push(`Event or goal context: ${handoff.eventContext}.`);
    } else if (handoff.sessionGoal) {
      parts.push(`Session goal: ${handoff.sessionGoal}.`);
    }
    if (handoff.itemContext) {
      const itemBits = [
        handoff.itemContext.color,
        handoff.itemContext.category,
        handoff.itemContext.material,
      ].filter(Boolean);
      if (itemBits.length) {
        parts.push(`Item context: ${itemBits.join(" ")}.`);
      }
      if (handoff.itemContext.notes) {
        parts.push(`Notes: ${handoff.itemContext.notes}.`);
      }
    }
    if (handoff.selectedClosetItemIds?.length) {
      parts.push(`Selected closet item IDs: ${handoff.selectedClosetItemIds.join(", ")}.`);
    }
    if (handoff.activeStoreId) {
      parts.push(`Active store ID: ${handoff.activeStoreId}.`);
    }
    if (handoff.activeCity) {
      parts.push(`Active city: ${handoff.activeCity}.`);
    }
    return (
      `Context handoff from ${handoff.sourceMode}: ${parts.join(" ")} ` +
      "Continue naturally from here and do not ask the user to repeat the request unless a critical detail is missing."
    ).trim();
  }, []);

  const createPendingHandoff = useCallback(
    (
      sourceMode: "concierge" | AgentMode,
      targetMode: AgentMode,
      args: Record<string, unknown>
    ): ConciergeHandoffContext => {
      const current = conciergeSessionRef.current;
      const normalizeText = (value: unknown) =>
        typeof value === "string" && value.trim() ? value.trim() : "";
      const rawItemContext =
        args.item_context && typeof args.item_context === "object" && !Array.isArray(args.item_context)
          ? (args.item_context as Record<string, unknown>)
          : null;
      const itemContext =
        rawItemContext || normalizeText(args.category) || normalizeText(args.color) || normalizeText(args.material) || normalizeText(args.notes)
          ? {
              category: normalizeText(rawItemContext?.category ?? args.category),
              color: normalizeText(rawItemContext?.color ?? args.color),
              material: normalizeText(rawItemContext?.material ?? args.material),
              notes: normalizeText(rawItemContext?.notes ?? args.notes),
            }
          : undefined;
      const triggerUtterance =
        normalizeText(args.trigger_utterance) ||
        normalizeText(args.user_request) ||
        current.lastUserUtterance ||
        normalizeText(args.reason) ||
        `Switching from ${sourceMode} to ${targetMode}.`;
      const summary =
        normalizeText(args.summary) ||
        (itemContext?.category || itemContext?.color
          ? `The user wants to continue in ${targetMode} with ${[itemContext.color, itemContext.category].filter(Boolean).join(" ")} context.`
          : normalizeText(args.reason) || `Continue the existing conversation in ${targetMode}.`);
      const eventContext = normalizeText(args.event_context) || current.sessionGoal || "";
      const handoff: ConciergeHandoffContext = {
        id: `${Date.now()}-${Math.random()}`,
        sourceMode,
        targetMode,
        triggerUtterance,
        summary,
        sessionGoal: current.sessionGoal,
        activeStoreId: current.activeStoreId,
        activeCity: current.activeCity,
        currentGarmentId: current.currentGarmentId,
        selectedClosetItemIds: current.selectedClosetItemIds,
        recentWishlistItemIds: current.recentWishlistItemIds,
        recentWebResults: current.recentWebResults,
        itemContext,
        eventContext: eventContext || undefined,
        bootstrapText: "",
        createdAtMs: Date.now(),
      };
      handoff.bootstrapText = buildHandoffBootstrapText(handoff);
      return handoff;
    },
    [buildHandoffBootstrapText]
  );

  const sendPendingHandoffToClient = useCallback(
    async (
      targetMode: AgentMode,
      client: LiveClientHandle | null,
      appendLine: (role: LiveLine["role"], text: string) => void
    ) => {
      const handoff = conciergeSessionRef.current.pendingHandoff;
      if (!client || !handoff || handoff.targetMode !== targetMode) {
        return;
      }
      const consumeKey = `${targetMode}:${handoff.id}`;
      if (consumedHandoffIdRef.current === consumeKey) {
        return;
      }
      consumedHandoffIdRef.current = consumeKey;
      try {
        await client.sendText(handoff.bootstrapText);
        appendLine("system", `[handoff] continued from ${handoff.sourceMode}.`);
        patchConciergeSession((current) =>
          current.pendingHandoff?.id === handoff.id
            ? {
                pendingHandoff: null,
                handoffReason: handoff.summary || current.handoffReason,
                lastUserUtterance: handoff.triggerUtterance || current.lastUserUtterance,
              }
            : {}
        );
      } catch {
        consumedHandoffIdRef.current = "";
        appendLine("system", "[handoff] could not deliver continuity context.");
      }
    },
    [patchConciergeSession]
  );

  const appendConciergeRootLine = useCallback(
    (role: LiveLine["role"], text: string) => {
      const clean = text.trim();
      if (!clean) {
        return;
      }
      appendConciergeTranscript("concierge", role, clean);
      setConciergeRootLines((existing) => {
        const next: LiveLine = {
          id: `${Date.now()}-${Math.random()}`,
          role,
          text: clean,
        };
        return [next, ...existing].slice(0, 16);
      });
    },
    [appendConciergeTranscript]
  );

  useEffect(() => {
    if (!shopDirectoryCity.trim()) {
      return;
    }
    patchConciergeSession({
      activeCity: shopDirectoryCity.trim(),
    });
  }, [patchConciergeSession, shopDirectoryCity]);

  useEffect(() => {
    patchConciergeSession({
      currentGarmentId: pendingItem ? "pending" : null,
    });
  }, [patchConciergeSession, pendingItem]);

  const appendLiveLine = useCallback((role: LiveLine["role"], text: string) => {
    const clean = text.trim();
    if (!clean) {
      return;
    }
    appendConciergeTranscript("scan", role, clean);
    setLiveLines((existing) => {
      const next: LiveLine = {
        id: `${Date.now()}-${Math.random()}`,
        role,
        text: clean
      };
      return [next, ...existing].slice(0, 8);
    });
  }, [appendConciergeTranscript]);

  const appendStylistLine = useCallback((role: LiveLine["role"], text: string) => {
    const clean = text.trim();
    if (!clean) {
      return;
    }
    appendConciergeTranscript("stylist", role, clean);
    setStylistLines((existing) => {
      const next: LiveLine = {
        id: `${Date.now()}-${Math.random()}`,
        role,
        text: clean
      };
      return [next, ...existing].slice(0, 16);
    });
  }, [appendConciergeTranscript]);

  const appendShopLine = useCallback((role: LiveLine["role"], text: string) => {
    const clean = text.trim();
    if (!clean) {
      return;
    }
    appendConciergeTranscript("shop", role, clean);
    setShopLines((existing) => {
      const next: LiveLine = {
        id: `${Date.now()}-${Math.random()}`,
        role,
        text: clean
      };
      return [next, ...existing].slice(0, 16);
    });
  }, [appendConciergeTranscript]);

  const appendWishlistLine = useCallback((role: LiveLine["role"], text: string) => {
    appendConciergeTranscript("wishlist", role, text);
  }, [appendConciergeTranscript]);

  const deliverWishlistPendingHandoff = useCallback(
    (client: LiveClientHandle, appendLine: (role: LiveLine["role"], text: string) => void) =>
      sendPendingHandoffToClient("wishlist", client, appendLine),
    [sendPendingHandoffToClient]
  );

  const wishlistAgent = useWishlistAgentSession({
    userId,
    idToken,
    liveModel: LIVE_MODEL,
    appendTranscript: appendWishlistLine,
    patchConciergeSession,
    routeHandlerRef: handleRouteToolCallRef,
    deliverPendingHandoff: deliverWishlistPendingHandoff,
    setWishlistItems,
  });

  const {
    modalVisible: wishlistAgentModalVisible,
    setModalVisible: setWishlistAgentModalVisible,
    status: wishlistAgentStatus,
    micStreaming: wishlistAgentMicStreaming,
    speakerEnabled: wishlistAgentSpeakerEnabled,
    setSpeakerEnabled: setWishlistAgentSpeakerEnabled,
    speaking: wishlistAgentSpeaking,
    lines: wishlistAgentLines,
    startSession: startWishlistAgentSession,
    closeSession: closeWishlistAgentSession,
    startMicStreaming: startWishlistAgentMicStreaming,
    stopMicStreaming: stopWishlistAgentMicStreaming,
    ensureSession: ensureWishlistConciergeSession,
    openAgent: openWishlistAgent,
    closeAgent: closeWishlistAgent,
  } = wishlistAgent;

  const stylistSurfaceActive =
    stylistModalVisible || (isConciergeVisible && activeAgentSession === "stylist");
  const wishlistSurfaceActive =
    wishlistAgentModalVisible || (isConciergeVisible && activeAgentSession === "wishlist");

  const closeConciergeRootSession = useCallback(async () => {
    try {
      if (conciergeInputProcessorRef.current) {
        conciergeInputProcessorRef.current.disconnect();
      }
      if (conciergeInputSourceRef.current) {
        conciergeInputSourceRef.current.disconnect();
      }
      if (conciergeInputSilentGainRef.current) {
        conciergeInputSilentGainRef.current.disconnect();
      }
      if (conciergeInputMediaStreamRef.current?.getTracks) {
        const tracks = conciergeInputMediaStreamRef.current.getTracks();
        for (const track of tracks) {
          track.stop();
        }
      }
      if (conciergeInputAudioContextRef.current?.close) {
        await conciergeInputAudioContextRef.current.close();
      }
    } catch {
      // ignore
    } finally {
      conciergeInputProcessorRef.current = null;
      conciergeInputSourceRef.current = null;
      conciergeInputSilentGainRef.current = null;
      conciergeInputMediaStreamRef.current = null;
      conciergeInputAudioContextRef.current = null;
      setConciergeRootMicStreaming(false);
    }

    const conciergeClient = conciergeClientRef.current;
    conciergeClientRef.current = null;
    if (conciergeClient) {
      try {
        await conciergeClient.close();
      } catch {
        appendConciergeRootLine("system", "Concierge session closed with a warning.");
      }
    }

    try {
      if (conciergeOutputAudioContextRef.current?.close) {
        await conciergeOutputAudioContextRef.current.close();
      }
    } catch {
      // ignore
    } finally {
      conciergeOutputAudioContextRef.current = null;
      conciergeOutputPlaybackCursorRef.current = 0;
    }
    setConciergeRootStatus("offline");
    setConciergeRootModelName("");
  }, [appendConciergeRootLine]);

  const playWebPcmAudioChunk = useCallback(
    async ({
      enabled,
      audioContextRef,
      playbackCursorRef,
      base64Data,
      mimeType,
      onError,
    }: {
      enabled: boolean;
      audioContextRef: React.MutableRefObject<any>;
      playbackCursorRef: React.MutableRefObject<number>;
      base64Data: string;
      mimeType?: string;
      onError: () => void;
    }) => {
      if (!enabled || Platform.OS !== "web") {
        return;
      }
      try {
        const anyWindow = globalThis as any;
        if (!anyWindow.AudioContext && !anyWindow.webkitAudioContext) {
          return;
        }
        const normalized = normalizeImagePayload(base64Data, mimeType || "audio/pcm;rate=24000");
        if (!normalized.data) {
          return;
        }
        if (!audioContextRef.current) {
          const AudioContextClass = anyWindow.AudioContext || anyWindow.webkitAudioContext;
          audioContextRef.current = new AudioContextClass({
            sampleRate: extractSampleRate(normalized.mimeType || mimeType)
          });
          playbackCursorRef.current = audioContextRef.current.currentTime;
        }
        const outputContext = audioContextRef.current;
        if (outputContext.state === "suspended") {
          await outputContext.resume();
        }
        const bytes = decodeBase64ToBytes(normalized.data);
        const samples = pcm16BytesToFloat32(bytes);
        const sampleRate = extractSampleRate(normalized.mimeType || mimeType);
        const buffer = outputContext.createBuffer(1, samples.length, sampleRate);
        buffer.copyToChannel(samples, 0);
        const source = outputContext.createBufferSource();
        source.buffer = buffer;
        source.connect(outputContext.destination);
        const startAt = Math.max(outputContext.currentTime, playbackCursorRef.current);
        source.start(startAt);
        playbackCursorRef.current = startAt + buffer.duration;
      } catch {
        onError();
      }
    },
    []
  );

  const playConciergeRootAudioChunk = useCallback(
    async (base64Data: string, mimeType?: string) => {
      await playWebPcmAudioChunk({
        enabled: conciergeRootSpeakerEnabled,
        audioContextRef: conciergeOutputAudioContextRef,
        playbackCursorRef: conciergeOutputPlaybackCursorRef,
        base64Data,
        mimeType,
        onError: () => appendConciergeRootLine("system", "Could not play concierge audio chunk."),
      });
    },
    [appendConciergeRootLine, conciergeRootSpeakerEnabled, playWebPcmAudioChunk]
  );

  const startConciergeRootMicStreaming = useCallback(
    async (silent = false) => {
      if (conciergeRootMicStreaming) {
        return;
      }
      if (Platform.OS !== "web") {
        return;
      }
      try {
        const anyWindow = globalThis as any;
        const nav = anyWindow.navigator;
        if (!nav?.mediaDevices?.getUserMedia) {
          throw new Error("getUserMedia unavailable");
        }
        const stream = await nav.mediaDevices.getUserMedia({ audio: true });
        const AudioContextCtor = anyWindow.AudioContext || anyWindow.webkitAudioContext;
        const context = new AudioContextCtor();
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(4096, 1, 1);
        const silentGain = context.createGain();
        silentGain.gain.value = 0;

        processor.onaudioprocess = (event: any) => {
          const conciergeClient = conciergeClientRef.current;
          if (!conciergeClient) {
            return;
          }
          const channelData = event.inputBuffer?.getChannelData?.(0);
          if (!channelData) {
            return;
          }
          const downsampled = downsampleFloat32(channelData, context.sampleRate, 16000);
          const pcmBytes = float32ToPcm16Bytes(downsampled);
          const encoded = encodeBytesToBase64(pcmBytes);
          void conciergeClient.sendRealtimeAudio({
            data: encoded,
            mimeType: "audio/pcm;rate=16000",
          });
        };

        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(context.destination);

        conciergeInputAudioContextRef.current = context;
        conciergeInputMediaStreamRef.current = stream;
        conciergeInputProcessorRef.current = processor;
        conciergeInputSourceRef.current = source;
        conciergeInputSilentGainRef.current = silentGain;
        setConciergeRootMicStreaming(true);
      } catch {
        setConciergeRootMicStreaming(false);
        if (!silent) {
          Alert.alert(
            "Mic stream error",
            "Could not start microphone streaming. Check browser microphone permissions."
          );
        }
      }
    },
    [appendConciergeRootLine, conciergeRootMicStreaming]
  );

  const stopConciergeRootMicStreaming = useCallback(async () => {
    try {
      if (conciergeInputProcessorRef.current) {
        conciergeInputProcessorRef.current.disconnect();
      }
      if (conciergeInputSourceRef.current) {
        conciergeInputSourceRef.current.disconnect();
      }
      if (conciergeInputSilentGainRef.current) {
        conciergeInputSilentGainRef.current.disconnect();
      }
      if (conciergeInputMediaStreamRef.current?.getTracks) {
        const tracks = conciergeInputMediaStreamRef.current.getTracks();
        for (const track of tracks) {
          track.stop();
        }
      }
      if (conciergeInputAudioContextRef.current?.close) {
        await conciergeInputAudioContextRef.current.close();
      }
      const conciergeClient = conciergeClientRef.current;
      if (conciergeClient) {
        await conciergeClient.endAudioStream();
      }
    } catch {
      // ignore cleanup errors
    } finally {
      conciergeInputProcessorRef.current = null;
      conciergeInputSourceRef.current = null;
      conciergeInputSilentGainRef.current = null;
      conciergeInputMediaStreamRef.current = null;
      conciergeInputAudioContextRef.current = null;
      setConciergeRootMicStreaming(false);
    }
  }, []);

  const refreshFavoriteStores = useCallback(
    async (resolvedUserId: string, resolvedToken?: string) => {
      try {
        const favorites = await getFavoriteStores(resolvedUserId, resolvedToken);
        setShopFavoriteStores(favorites);
      } catch {
        setShopFavoriteStores([]);
      }
    },
    []
  );

  useEffect(() => {
    shopMapCenterRef.current = shopMapCenter;
  }, [shopMapCenter]);

  useEffect(() => {
    shopMapZoomRef.current = shopMapZoom;
  }, [shopMapZoom]);

  useEffect(() => {
    if (!shopPerimeterStores.length) {
      if (shopSelectedStoreId) {
        setShopSelectedStoreId("");
      }
      return;
    }
    if (!shopPerimeterStores.some((store) => store.id === shopSelectedStoreId)) {
      setShopSelectedStoreId(shopPerimeterStores[0]?.id || "");
    }
  }, [shopPerimeterStores, shopSelectedStoreId]);

  useEffect(() => {
    const index = shopPerimeterStores.findIndex((store) => store.id === shopSelectedStoreId);
    if (index < 0 || !shopCarouselRef.current) {
      return;
    }
    shopCarouselRef.current.scrollTo({
      x: index * (shopCarouselCardWidth + 14),
      animated: true
    });
  }, [shopCarouselCardWidth, shopPerimeterStores, shopSelectedStoreId]);

  const markStylistSpeaking = useCallback(() => {
    setStylistAgentSpeaking(true);
    if (stylistSpeakingTimeoutRef.current) {
      clearTimeout(stylistSpeakingTimeoutRef.current);
    }
    stylistSpeakingTimeoutRef.current = setTimeout(() => {
      setStylistAgentSpeaking(false);
      stylistSpeakingTimeoutRef.current = null;
    }, 420);
  }, []);

  const closeLiveSession = useCallback(async () => {
    try {
      if (inputProcessorRef.current) {
        inputProcessorRef.current.disconnect();
      }
      if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
      }
      if (inputSilentGainRef.current) {
        inputSilentGainRef.current.disconnect();
      }
      if (inputMediaStreamRef.current?.getTracks) {
        const tracks = inputMediaStreamRef.current.getTracks();
        for (const track of tracks) {
          track.stop();
        }
      }
      if (inputAudioContextRef.current?.close) {
        await inputAudioContextRef.current.close();
      }
    } catch {
      // ignore
    } finally {
      inputProcessorRef.current = null;
      inputSourceRef.current = null;
      inputSilentGainRef.current = null;
      inputMediaStreamRef.current = null;
      inputAudioContextRef.current = null;
      setMicStreaming(false);
    }

    const liveClient = liveClientRef.current;
    liveClientRef.current = null;
    if (liveClient) {
      try {
        await liveClient.close();
      } catch {
        appendLiveLine("system", "Live session closed with a warning.");
      }
    }
    try {
      if (outputAudioContextRef.current?.close) {
        await outputAudioContextRef.current.close();
      }
    } catch {
      // ignore
    } finally {
      outputAudioContextRef.current = null;
      outputPlaybackCursorRef.current = 0;
    }
    setLiveStatus("offline");
    setLiveModelName("");
    lastCoordinatorDigestRef.current = "";
    lastFrameBase64Ref.current = "";
    signaledCaptureBase64Ref.current = "";
    signaledCaptureAtRef.current = 0;
    signaledCaptureEnhancedRef.current = false;
    captureEnhancementInFlightRef.current = false;
    captureEnhancementTokenRef.current += 1;
    captureEnhancementPromiseRef.current = null;
    enhancementAttemptAtRef.current.clear();
    enhancementInFlightRef.current.clear();
    setCaptureProcessing(false);
  }, [appendLiveLine]);

  const sendCoordinatorUpdate = useCallback(
    async (input: {
      phase: string;
      isClothing: boolean;
      readyForNextItem: boolean;
      missingFields: string[];
      questionForUser?: string;
      feedback?: string;
      draft?: {
        category?: string;
        title?: string;
        color?: string;
        material?: string;
        style?: string;
        fit?: string;
        note?: string;
      };
    }) => {
      const liveClient = liveClientRef.current;
      if (!liveClient) {
        return;
      }

      const digest = JSON.stringify({
        phase: input.phase,
        is_clothing: input.isClothing,
        ready_for_next_item: input.readyForNextItem,
        missing_fields: input.missingFields,
        category: input.draft?.category ?? "",
        color: input.draft?.color ?? "",
        material: input.draft?.material ?? "",
        note: input.draft?.note ?? ""
      });
      if (digest === lastCoordinatorDigestRef.current) {
        return;
      }
      lastCoordinatorDigestRef.current = digest;

      const coordinatorMessage =
        "Coordinator update for wardrobe call. " +
        `Phase=${input.phase}. ` +
        `is_clothing=${input.isClothing}. ` +
        `ready_for_next_item=${input.readyForNextItem}. ` +
        `missing_fields=${input.missingFields.length ? input.missingFields.join(",") : "none"}. ` +
        `draft_category=${input.draft?.category ?? "unknown"}. ` +
        `draft_color=${input.draft?.color ?? "unknown"}. ` +
        `draft_material=${input.draft?.material ?? "unknown"}. ` +
        `draft_style=${input.draft?.style ?? "unknown"}. ` +
        `draft_fit=${input.draft?.fit ?? "unknown"}. ` +
        `draft_note=${input.draft?.note ?? ""}. ` +
        `question_for_user=${input.questionForUser ?? ""}. ` +
        `feedback=${input.feedback ?? ""}. ` +
        "Behavior policy: act as a wardrobe classifier coach, one garment at a time, " +
        "ask exactly one short question for the next missing field, never include internal reasoning, " +
        "never ask for extra notes, only record extra notes when user volunteers them, " +
        "follow this strict lifecycle for every garment: identify visible attributes, call capture_item_photo once when centered, wait for 'Capture Locked', then call save_clothing_item, " +
        "and when card is complete say exactly: Great, we can scan the next item.";
      try {
        await liveClient.sendText(coordinatorMessage);
      } catch {
        appendLiveLine("system", "Coordinator sync to live agent failed.");
      }
    },
    [appendLiveLine]
  );

  const syncPendingCardFromTool = useCallback(
    (
      functionName: string,
      args: Record<string, unknown> | undefined,
      result?: Record<string, unknown>
    ) => {
      if (
        functionName !== "save_clothing_item" &&
        functionName !== "update_clothing_item" &&
        functionName !== "get_clothing_item"
      ) {
        return;
      }

      const readText = (
        source: Record<string, unknown> | undefined,
        key: string,
        lower = true
      ): string | undefined => {
        if (!source) {
          return undefined;
        }
        const raw = source[key];
        if (typeof raw !== "string" && typeof raw !== "number") {
          return undefined;
        }
        const text = String(raw).trim();
        if (!text) {
          return undefined;
        }
        return lower ? text.toLowerCase() : text;
      };

      const current = pendingItemRef.current;
      const nextCategory =
        readText(args, "category") ??
        readText(result, "category") ??
        current?.category;
      const nextColor =
        readText(args, "color") ??
        readText(result, "color") ??
        current?.color;
      const nextMaterial =
        readText(args, "material") ??
        readText(args, "fabric_type") ??
        readText(result, "material") ??
        readText(result, "fabric_type") ??
        current?.fabric_type;
      const nextStyle =
        readText(args, "style") ??
        readText(result, "style") ??
        current?.style;
      const nextCondition =
        readText(args, "condition") ??
        readText(result, "condition") ??
        current?.condition;
      const nextFit =
        readText(args, "fit") ??
        readText(args, "estimated_fit") ??
        readText(result, "fit") ??
        readText(result, "estimated_fit") ??
        current?.estimated_fit;
      const nextTitle =
        readText(args, "title", false) ??
        readText(result, "title", false) ??
        current?.title;
      const nextNote =
        readText(args, "extra_notes", false) ??
        readText(args, "note", false) ??
        readText(result, "extra_notes", false) ??
        readText(result, "note", false) ??
        current?.note;

      const hasPatchData =
        Boolean(nextCategory) ||
        Boolean(nextColor) ||
        Boolean(nextMaterial) ||
        Boolean(nextStyle) ||
        Boolean(nextCondition) ||
        Boolean(nextFit) ||
        Boolean(nextTitle) ||
        Boolean(nextNote);
      if (!hasPatchData && !current) {
        return;
      }

      const basePhase =
        readText(args, "phase") ??
        readText(result, "phase") ??
        current?.phase ??
        currentPhase;
      const baseCategory = nextCategory ?? current?.category ?? basePhase;
      const fallbackImage =
        current?.image_base64 || lockedImageRef.current || lastFrameBase64Ref.current || undefined;
      const fallbackSnippet =
        current?.item_snippet_base64 ||
        lockedSnippetRef.current ||
        lastFrameBase64Ref.current ||
        undefined;

      const nextPayload: ParsedLiveWardrobe["payload"] = {
        phase: basePhase,
        category: baseCategory,
        title: nextTitle ?? `${formatPhaseLabel(baseCategory)} item`,
        color: nextColor,
        fabric_type: nextMaterial,
        style: nextStyle,
        condition: nextCondition,
        estimated_fit: nextFit,
        note: nextNote,
        image_base64: fallbackImage,
        item_snippet_base64: fallbackSnippet,
      };

      pendingItemRef.current = nextPayload;
      setPendingItem(nextPayload);
    },
    [currentPhase]
  );

  const rememberSignaledCapture = useCallback(async (base64: string) => {
    const clean = (base64 || "").trim();
    if (!clean) {
      return;
    }
    signaledCaptureEnhancedRef.current = false;
    signaledCaptureBase64Ref.current = clean;
    signaledCaptureAtRef.current = Date.now();
    lastFrameBase64Ref.current = clean;
    lockedImageRef.current = clean;
    setCaptureProcessing(true);

    const snippet = await buildItemSnippetBase64(clean, "image/jpeg");
    if (snippet) {
      lockedSnippetRef.current = snippet;
    }

    const current = pendingItemRef.current;
    const nextPayload: ParsedLiveWardrobe["payload"] = current
      ? {
          ...current,
          image_base64: clean,
          item_snippet_base64: snippet || current.item_snippet_base64 || clean,
        }
      : {
          phase: currentPhase,
          category: "unknown",
          title: "Clothing item",
          image_base64: clean,
          item_snippet_base64: snippet || clean,
        };
    pendingItemRef.current = nextPayload;
    setPendingItem(nextPayload);
    const immediateMissingFields = [
      !hasMeaningfulCardValue(nextPayload.category) ? "category" : null,
      !hasMeaningfulCardValue(nextPayload.color) ? "color" : null,
      !hasMeaningfulCardValue(nextPayload.fabric_type) ? "material" : null,
    ].filter(Boolean) as string[];
    void sendCoordinatorUpdate({
      phase: nextPayload.phase ?? currentPhase,
      isClothing: true,
      readyForNextItem: immediateMissingFields.length === 0,
      missingFields: immediateMissingFields,
      questionForUser:
        immediateMissingFields.length > 0
          ? `Ask for ${immediateMissingFields[0]} next.`
          : "Card is complete. Ask to scan next item.",
      feedback: "Capture Locked. Continue filling the card.",
      draft: {
        category: nextPayload.category,
        title: nextPayload.title,
        color: nextPayload.color,
        material: nextPayload.fabric_type,
        style: nextPayload.style,
        fit: nextPayload.estimated_fit,
        note: nextPayload.note,
      },
    });
    const token = captureEnhancementTokenRef.current + 1;
    captureEnhancementTokenRef.current = token;
    captureEnhancementInFlightRef.current = true;
    appendLiveLine("system", "[capture] Enhancing snapped frame...");
    const enhancementTask = (async () => {
      try {
        const enhanced = await enhanceWardrobePreview(
          userId,
          {
            image_base64: clean,
            mime_type: "image/jpeg",
          },
          idToken
        );
        if (captureEnhancementTokenRef.current !== token) {
          return;
        }
        if (enhanced.enhanced && enhanced.image_base64) {
          const normalized = normalizeImagePayload(enhanced.image_base64, "image/png");
          if (!normalized.data) {
            return;
          }
          const enhancedBase64 = normalized.data;
          const enhancedSnippet =
            (await buildItemSnippetBase64(enhancedBase64, "image/png")) || enhancedBase64;
          signaledCaptureBase64Ref.current = enhancedBase64;
          signaledCaptureAtRef.current = Date.now();
          signaledCaptureEnhancedRef.current = true;
          lastFrameBase64Ref.current = enhancedBase64;
          lockedImageRef.current = enhancedBase64;
          lockedSnippetRef.current = enhancedSnippet;
          const currentPending = pendingItemRef.current;
          const updatedPayload: ParsedLiveWardrobe["payload"] = currentPending
            ? {
                ...currentPending,
                image_base64: enhancedBase64,
                item_snippet_base64: enhancedSnippet,
              }
            : {
                phase: currentPhase,
                category: "unknown",
                title: "Clothing item",
                image_base64: enhancedBase64,
                item_snippet_base64: enhancedSnippet,
              };
          pendingItemRef.current = updatedPayload;
          setPendingItem(updatedPayload);
          const missingAfterEnhance = [
            !hasMeaningfulCardValue(updatedPayload.category) ? "category" : null,
            !hasMeaningfulCardValue(updatedPayload.color) ? "color" : null,
            !hasMeaningfulCardValue(updatedPayload.fabric_type) ? "material" : null,
          ].filter(Boolean) as string[];
          void sendCoordinatorUpdate({
            phase: updatedPayload.phase ?? currentPhase,
            isClothing: true,
            readyForNextItem: missingAfterEnhance.length === 0,
            missingFields: missingAfterEnhance,
            questionForUser:
              missingAfterEnhance.length > 0
                ? `Ask for ${missingAfterEnhance[0]} next.`
                : "Card is complete. Ask to scan next item.",
            feedback: "Capture Locked. Enhanced photo ready. Continue with missing fields.",
            draft: {
              category: updatedPayload.category,
              title: updatedPayload.title,
              color: updatedPayload.color,
              material: updatedPayload.fabric_type,
              style: updatedPayload.style,
              fit: updatedPayload.estimated_fit,
              note: updatedPayload.note,
            },
          });
          appendLiveLine("system", "[capture] Enhanced frame ready and locked.");
          console.log(
            `[capture-signal] ${JSON.stringify({
              phase: updatedPayload.phase,
              category: updatedPayload.category,
              enhanced: true,
              bytes: enhancedBase64.length
            })}`
          );
        } else if (enhanced.error) {
          appendLiveLine("system", `[capture] Enhancement skipped: ${enhanced.error}`);
        }
      } catch (error) {
        console.warn("[capture] enhancement failed", error);
        appendLiveLine("system", "[capture] Enhancement unavailable. Using original frame.");
      } finally {
        if (captureEnhancementTokenRef.current === token) {
          captureEnhancementInFlightRef.current = false;
          captureEnhancementPromiseRef.current = null;
          setCaptureProcessing(false);
        }
      }
    })();
    captureEnhancementPromiseRef.current = enhancementTask;
    void enhancementTask;
  }, [appendLiveLine, currentPhase, idToken, sendCoordinatorUpdate, userId]);

  const captureLiveVideoFrameBase64 = useCallback(async (): Promise<string | undefined> => {
    if (Platform.OS !== "web") {
      return lastFrameBase64Ref.current || undefined;
    }

    try {
      const anyGlobal = globalThis as any;
      const doc = anyGlobal.document;
      if (!doc?.querySelectorAll || !doc?.createElement) {
        return lastFrameBase64Ref.current || undefined;
      }
      const videoElements = Array.from(doc.querySelectorAll("video")) as Array<{
        videoWidth?: number;
        videoHeight?: number;
      }>;
      const activeVideo = videoElements.find(
        (video) => Number(video.videoWidth) > 0 && Number(video.videoHeight) > 0
      );
      if (!activeVideo) {
        return lastFrameBase64Ref.current || undefined;
      }

      const width = Math.max(1, Number(activeVideo.videoWidth) || 0);
      const height = Math.max(1, Number(activeVideo.videoHeight) || 0);
      if (!width || !height) {
        return lastFrameBase64Ref.current || undefined;
      }

      const canvas = doc.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.style.display = "none";
      const context = canvas.getContext("2d");
      if (!context) {
        return lastFrameBase64Ref.current || undefined;
      }

      context.drawImage(activeVideo as any, 0, 0, width, height);
      const dataUri = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUri.split(",", 2)[1]?.trim();
      if (base64) {
        lastFrameBase64Ref.current = base64;
        return base64;
      }
    } catch {
      // ignore and fallback below
    }
    return lastFrameBase64Ref.current || undefined;
  }, []);

  const stopMicStreaming = useCallback(async () => {
    try {
      if (inputProcessorRef.current) {
        inputProcessorRef.current.disconnect();
      }
      if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
      }
      if (inputSilentGainRef.current) {
        inputSilentGainRef.current.disconnect();
      }
      if (inputMediaStreamRef.current?.getTracks) {
        const tracks = inputMediaStreamRef.current.getTracks();
        for (const track of tracks) {
          track.stop();
        }
      }
      if (inputAudioContextRef.current?.close) {
        await inputAudioContextRef.current.close();
      }
      const liveClient = liveClientRef.current;
      if (liveClient) {
        await liveClient.endAudioStream();
      }
    } catch {
      // ignore cleanup errors
    } finally {
      inputProcessorRef.current = null;
      inputSourceRef.current = null;
      inputSilentGainRef.current = null;
      inputMediaStreamRef.current = null;
      inputAudioContextRef.current = null;
      setMicStreaming(false);
    }
  }, []);

  const playAudioChunk = useCallback(
    async (base64Data: string, mimeType?: string) => {
      await playWebPcmAudioChunk({
        enabled: speakerEnabled,
        audioContextRef: outputAudioContextRef,
        playbackCursorRef: outputPlaybackCursorRef,
        base64Data,
        mimeType,
        onError: () => appendLiveLine("system", "Could not play agent audio chunk."),
      });
    },
    [appendLiveLine, playWebPcmAudioChunk, speakerEnabled]
  );

  const startMicStreaming = useCallback(
    async (silent = false) => {
      if (Platform.OS !== "web") {
        if (!silent) {
          Alert.alert("Voice mode", "Mic streaming is currently supported on web in this build.");
        }
        return;
      }
      if (micStreaming) {
        return;
      }
      const liveClient = liveClientRef.current;
      if (!liveClient) {
        if (!silent) {
          Alert.alert("Live session", "Start live agent session before enabling mic.");
        }
        return;
      }

      try {
        const anyWindow = globalThis as any;
        const mediaDevices = anyWindow.navigator?.mediaDevices;
        if (!mediaDevices?.getUserMedia) {
          throw new Error("getUserMedia unavailable");
        }
        const stream = await mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = anyWindow.AudioContext || anyWindow.webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("AudioContext unavailable");
        }

        const context = new AudioContextClass();
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(4096, 1, 1);
        const silentGain = context.createGain();
        silentGain.gain.value = 0;

        processor.onaudioprocess = (event: any) => {
          const channelData = event.inputBuffer?.getChannelData(0);
          if (!channelData) {
            return;
          }
          const downsampled = downsampleFloat32(channelData, context.sampleRate, 16000);
          const pcmBytes = float32ToPcm16Bytes(downsampled);
          const encoded = encodeBytesToBase64(pcmBytes);
          void liveClient.sendRealtimeAudio({
            data: encoded,
            mimeType: "audio/pcm;rate=16000"
          });
        };

        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(context.destination);

        inputAudioContextRef.current = context;
        inputMediaStreamRef.current = stream;
        inputProcessorRef.current = processor;
        inputSourceRef.current = source;
        inputSilentGainRef.current = silentGain;
        setMicStreaming(true);
      } catch {
        setMicStreaming(false);
        if (!silent) {
          Alert.alert(
            "Mic stream error",
            "Could not start microphone streaming. Check browser microphone permissions."
          );
        }
      }
    },
    [appendLiveLine, micStreaming]
  );

  const clearStylistRetry = useCallback(() => {
    if (stylistRetryTimeoutRef.current) {
      clearTimeout(stylistRetryTimeoutRef.current);
      stylistRetryTimeoutRef.current = null;
    }
  }, []);

  const closeStylistSession = useCallback(async () => {
    stylistShouldReconnectRef.current = false;
    stylistRetryAttemptRef.current = 0;
    setStylistLastCloseCode(null);
    clearStylistRetry();
    try {
      if (stylistInputProcessorRef.current) {
        stylistInputProcessorRef.current.disconnect();
      }
      if (stylistInputSourceRef.current) {
        stylistInputSourceRef.current.disconnect();
      }
      if (stylistInputSilentGainRef.current) {
        stylistInputSilentGainRef.current.disconnect();
      }
      if (stylistInputMediaStreamRef.current?.getTracks) {
        const tracks = stylistInputMediaStreamRef.current.getTracks();
        for (const track of tracks) {
          track.stop();
        }
      }
      if (stylistInputAudioContextRef.current?.close) {
        await stylistInputAudioContextRef.current.close();
      }
    } catch {
      // ignore
    } finally {
      stylistInputProcessorRef.current = null;
      stylistInputSourceRef.current = null;
      stylistInputSilentGainRef.current = null;
      stylistInputMediaStreamRef.current = null;
      stylistInputAudioContextRef.current = null;
      setStylistMicStreaming(false);
    }

    const stylistClient = stylistClientRef.current;
    stylistClientRef.current = null;
    if (stylistClient) {
      try {
        await stylistClient.close();
      } catch {
        appendStylistLine("system", "Stylist session closed with a warning.");
      }
    }
    try {
      if (stylistOutputAudioContextRef.current?.close) {
        await stylistOutputAudioContextRef.current.close();
      }
    } catch {
      // ignore
    } finally {
      stylistOutputAudioContextRef.current = null;
      stylistOutputPlaybackCursorRef.current = 0;
    }
    if (stylistSpeakingTimeoutRef.current) {
      clearTimeout(stylistSpeakingTimeoutRef.current);
      stylistSpeakingTimeoutRef.current = null;
    }
    setStylistAgentSpeaking(false);
    setStylistStatus("offline");
    setStylistModelName("");
  }, [appendStylistLine, clearStylistRetry]);

  const playStylistAudioChunk = useCallback(
    async (base64Data: string, mimeType?: string) => {
      markStylistSpeaking();
      await playWebPcmAudioChunk({
        enabled: stylistSpeakerEnabled,
        audioContextRef: stylistOutputAudioContextRef,
        playbackCursorRef: stylistOutputPlaybackCursorRef,
        base64Data,
        mimeType,
        onError: () => appendStylistLine("system", "Could not play stylist audio chunk."),
      });
    },
    [appendStylistLine, markStylistSpeaking, playWebPcmAudioChunk, stylistSpeakerEnabled]
  );

  const startStylistMicStreaming = useCallback(
    async (silent = false) => {
      if (Platform.OS !== "web") {
        if (!silent) {
          Alert.alert("Voice mode", "Mic streaming is currently supported on web in this build.");
        }
        return;
      }
      if (stylistMicStreaming) {
        return;
      }
      const stylistClient = stylistClientRef.current;
      if (!stylistClient) {
        if (!silent) {
          Alert.alert("Stylist session", "Connect stylist before enabling mic.");
        }
        return;
      }

      try {
        const anyWindow = globalThis as any;
        const mediaDevices = anyWindow.navigator?.mediaDevices;
        if (!mediaDevices?.getUserMedia) {
          throw new Error("getUserMedia unavailable");
        }
        const stream = await mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = anyWindow.AudioContext || anyWindow.webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("AudioContext unavailable");
        }

        const context = new AudioContextClass();
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(4096, 1, 1);
        const silentGain = context.createGain();
        silentGain.gain.value = 0;

        processor.onaudioprocess = (event: any) => {
          const channelData = event.inputBuffer?.getChannelData(0);
          if (!channelData) {
            return;
          }
          const downsampled = downsampleFloat32(channelData, context.sampleRate, 16000);
          const pcmBytes = float32ToPcm16Bytes(downsampled);
          const encoded = encodeBytesToBase64(pcmBytes);
          void stylistClient.sendRealtimeAudio({
            data: encoded,
            mimeType: "audio/pcm;rate=16000"
          });
        };

        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(context.destination);

        stylistInputAudioContextRef.current = context;
        stylistInputMediaStreamRef.current = stream;
        stylistInputProcessorRef.current = processor;
        stylistInputSourceRef.current = source;
        stylistInputSilentGainRef.current = silentGain;
        setStylistMicStreaming(true);
      } catch {
        setStylistMicStreaming(false);
        if (!silent) {
          Alert.alert(
            "Mic stream error",
            "Could not start microphone streaming. Check browser microphone permissions."
          );
        }
      }
    },
    [appendStylistLine, stylistMicStreaming]
  );

  const stopStylistMicStreaming = useCallback(async () => {
    try {
      if (stylistInputProcessorRef.current) {
        stylistInputProcessorRef.current.disconnect();
      }
      if (stylistInputSourceRef.current) {
        stylistInputSourceRef.current.disconnect();
      }
      if (stylistInputSilentGainRef.current) {
        stylistInputSilentGainRef.current.disconnect();
      }
      if (stylistInputMediaStreamRef.current?.getTracks) {
        const tracks = stylistInputMediaStreamRef.current.getTracks();
        for (const track of tracks) {
          track.stop();
        }
      }
      if (stylistInputAudioContextRef.current?.close) {
        await stylistInputAudioContextRef.current.close();
      }
      const stylistClient = stylistClientRef.current;
      if (stylistClient) {
        await stylistClient.endAudioStream();
      }
    } catch {
      // ignore cleanup errors
    } finally {
      stylistInputProcessorRef.current = null;
      stylistInputSourceRef.current = null;
      stylistInputSilentGainRef.current = null;
      stylistInputMediaStreamRef.current = null;
      stylistInputAudioContextRef.current = null;
      setStylistMicStreaming(false);
    }
  }, []);

  const stopShopFrameStreaming = useCallback(() => {
    if (shopFrameIntervalRef.current) {
      clearInterval(shopFrameIntervalRef.current);
      shopFrameIntervalRef.current = null;
    }
  }, []);

  const closeShopSession = useCallback(async () => {
    stopShopFrameStreaming();
    try {
      if (shopInputProcessorRef.current) {
        shopInputProcessorRef.current.disconnect();
      }
      if (shopInputSourceRef.current) {
        shopInputSourceRef.current.disconnect();
      }
      if (shopInputSilentGainRef.current) {
        shopInputSilentGainRef.current.disconnect();
      }
      if (shopInputMediaStreamRef.current?.getTracks) {
        const tracks = shopInputMediaStreamRef.current.getTracks();
        for (const track of tracks) {
          track.stop();
        }
      }
      if (shopInputAudioContextRef.current?.close) {
        await shopInputAudioContextRef.current.close();
      }
    } catch {
      // ignore
    } finally {
      shopInputProcessorRef.current = null;
      shopInputSourceRef.current = null;
      shopInputSilentGainRef.current = null;
      shopInputMediaStreamRef.current = null;
      shopInputAudioContextRef.current = null;
      setShopMicStreaming(false);
    }

    const shopClient = shopClientRef.current;
    shopClientRef.current = null;
    if (shopClient) {
      try {
        await shopClient.close();
      } catch {
        appendShopLine("system", "Shop assistant session closed with a warning.");
      }
    }

    try {
      if (shopOutputAudioContextRef.current?.close) {
        await shopOutputAudioContextRef.current.close();
      }
    } catch {
      // ignore
    } finally {
      shopOutputAudioContextRef.current = null;
      shopOutputPlaybackCursorRef.current = 0;
    }
    shopLastFrameBase64Ref.current = "";
    shopLatestStoreItemRef.current = "";
    shopLastSuggestedIdsRef.current = [];
    setShopStatus("offline");
    setShopModelName("");
    setShopSuggestedItemIds(new Set());
  }, [appendShopLine, stopShopFrameStreaming]);

  const playShopAudioChunk = useCallback(
    async (base64Data: string, mimeType?: string) => {
      await playWebPcmAudioChunk({
        enabled: shopSpeakerEnabled,
        audioContextRef: shopOutputAudioContextRef,
        playbackCursorRef: shopOutputPlaybackCursorRef,
        base64Data,
        mimeType,
        onError: () => appendShopLine("system", "Could not play shop assistant audio chunk."),
      });
    },
    [appendShopLine, playWebPcmAudioChunk, shopSpeakerEnabled]
  );

  const captureShopFrameBase64 = useCallback(async (): Promise<string | undefined> => {
    if (Platform.OS === "web") {
      const frame = await captureLiveVideoFrameBase64();
      if (frame) {
        shopLastFrameBase64Ref.current = frame;
      }
      return frame;
    }
    if (!cameraRef.current) {
      return shopLastFrameBase64Ref.current || undefined;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.65,
        base64: true,
        skipProcessing: true
      });
      const normalized = normalizeImagePayload(photo?.base64 || "", "image/jpeg");
      if (!normalized.data) {
        return shopLastFrameBase64Ref.current || undefined;
      }
      shopLastFrameBase64Ref.current = normalized.data;
      return normalized.data;
    } catch {
      return shopLastFrameBase64Ref.current || undefined;
    }
  }, [captureLiveVideoFrameBase64]);

  const requestShopCoordinates = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    if (Platform.OS === "web") {
      const nav = (globalThis as any).navigator as
        | { geolocation?: { getCurrentPosition?: Function } }
        | undefined;
      const geo = nav?.geolocation;
      const getCurrentPosition = geo?.getCurrentPosition;
      if (typeof getCurrentPosition !== "function") {
        console.error("[shop-map][geo] navigator.geolocation unavailable");
        setShopGeoPermission("error");
        setShopStoresError("Location is unavailable in this browser.");
        return null;
      }
      return await new Promise((resolve) => {
        getCurrentPosition.call(
          geo,
          (position: any) => {
            setShopGeoPermission("granted");
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error: any) => {
            console.error(
              `[shop-map][geo] denied_or_failed code=${String(error?.code)} message=${String(
                error?.message || ""
              )}`
            );
            if (error?.code === 1) {
              setShopGeoPermission("denied");
              setShopStoresError("Location permission denied. You can still launch the assistant.");
            } else {
              setShopGeoPermission("error");
              setShopStoresError("Could not detect your location.");
            }
            resolve(null);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      });
    }

    try {
      const Location = require("expo-location");
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        console.error(`[shop-map][geo] native permission denied status=${permission.status}`);
        setShopGeoPermission("denied");
        setShopStoresError("Location permission denied. You can still launch the assistant.");
        return null;
      }
      setShopGeoPermission("granted");
      const position = await Location.getCurrentPositionAsync({});
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
    } catch (error) {
      console.error("[shop-map][geo] native location failed", error);
      setShopGeoPermission("error");
      setShopStoresError(
        "Location support is unavailable. Install expo-location to enable nearby store lookup."
      );
      return null;
    }
  }, []);

  const resolveShopCityFromCoords = useCallback(async (coords: ShopCoords): Promise<string> => {
    if (Platform.OS === "web") {
      return "";
    }
    try {
      const Location = require("expo-location");
      if (typeof Location?.reverseGeocodeAsync !== "function") {
        return "";
      }
      const [result] = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng
      });
      const parts = [
        String(result?.city || "").trim(),
        String(result?.region || "").trim()
      ].filter(Boolean);
      return parts.join(", ");
    } catch (error) {
      console.warn("[shop-map][geo] reverse geocode failed", error);
      return "";
    }
  }, []);

  const refreshShopDashboard = useCallback(
    async (forceLocationRequest = false, centerOverride?: ShopCoords) => {
      if (shopStoresLoading) {
        return;
      }
      const now = Date.now();
      if (now < shopPlacesCooldownUntilRef.current) {
        const seconds = Math.max(1, Math.ceil((shopPlacesCooldownUntilRef.current - now) / 1000));
        const message = `Places API rate-limited. Retry in ${seconds}s.`;
        setShopStoresError(message);
        return;
      }
      setShopStoresLoading(true);
      setShopStoresError("");
      try {
        setShopBrowseMode("nearby");
        setShopDirectoryCity("");
        let coords = centerOverride || shopMapCenterRef.current || shopLocation;
        if (!coords || forceLocationRequest) {
          coords = await requestShopCoordinates();
        }
        if (!coords) {
          setShopStores([]);
          return;
        }
        setShopLocation(coords);
        setShopMapCenter((current) =>
          current && !forceLocationRequest && !centerOverride ? current : { lat: coords.lat, lng: coords.lng }
        );
        setShopLastLoadedCenter({ lat: coords.lat, lng: coords.lng });
        setShopLastLoadedZoom(shopMapZoomRef.current);
        setShopMapDirty(false);
        const radiusMeters = shopSearchRadiusForZoom(shopMapZoomRef.current);
        const rows = await fetchNearbyShops(coords.lat, coords.lng, {
          radiusMeters,
          city: shopDirectoryCityDraft.trim() || shopDirectoryCity.trim() || undefined,
          userId: userId || undefined,
          idToken
        });
        const withDistance = rows
          .map((row) => ({
            ...row,
            distance_meters:
              typeof row.distance_meters === "number"
                ? row.distance_meters
                : estimateDistanceMeters(coords, { lat: row.lat, lng: row.lng })
          }))
          .sort((a, b) => {
            const byScore = Number(b.composite_score || 0) - Number(a.composite_score || 0);
            if (Math.abs(byScore) > 0.0001) {
              return byScore;
            }
            return Number(a.distance_meters || 0) - Number(b.distance_meters || 0);
          });
        setShopStores(withDistance);
        setShopSelectedStoreId((current) => {
          if (current && withDistance.some((row) => row.id === current)) {
            return current;
          }
          return withDistance[0]?.id || "";
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load nearby stores.";
        console.error("[shop-map][dashboard] refresh failed", error);
        if (message.includes("(429)") || message.toLowerCase().includes("resource_exhausted")) {
          shopPlacesCooldownUntilRef.current = Date.now() + 65_000;
        }
        setShopStoresError(message);
        setShopStores([]);
      } finally {
        setShopStoresLoading(false);
      }
    },
    [
      idToken,
      requestShopCoordinates,
      shopDirectoryCity,
      shopDirectoryCityDraft,
      shopLocation,
      shopStoresLoading,
      userId
    ]
  );

  const loadShopDirectory = useCallback(
    async (cityOverride?: string, options?: { rethrow?: boolean }) => {
      const cityName = String(cityOverride ?? shopDirectoryCityDraft).trim();
      if (!cityName) {
        setShopStoresError("Enter a city to load its store directory.");
        return;
      }
      if (shopStoresLoading) {
        return;
      }
      setShopStoresLoading(true);
      setShopStoresError("");
      try {
        const rows = await fetchDirectoryStores(cityName, {
          userId: userId || undefined,
          idToken
        });
        if (!rows.length) {
          throw new Error(`No saved directory data found for ${cityName}.`);
        }
        const origin = shopMapCenterRef.current || shopLocation;
        const withDistance = rows.map((row) => ({
          ...row,
          distance_meters: origin
            ? estimateDistanceMeters(origin, { lat: row.lat, lng: row.lng })
            : undefined
        }));
        setShopBrowseMode("directory");
        setShopDirectoryCity(cityName);
        setShopDirectoryCityDraft(cityName);
        setShopFavoritesOnly(false);
        setShopMatchMode(false);
        setShopMatchedStores([]);
        setShopMatchedWishlistCard(null);
        setShopStores(withDistance);
        setShopSelectedStoreId((current) => {
          if (current && withDistance.some((row) => row.id === current)) {
            return current;
          }
          return withDistance[0]?.id || "";
        });
        if (withDistance[0] && !shopMapCenterRef.current) {
          setShopMapCenter({ lat: withDistance[0].lat, lng: withDistance[0].lng });
        }
        setShopLastLoadedCenter(shopMapCenterRef.current || origin || null);
        setShopLastLoadedZoom(shopMapZoomRef.current);
        setShopMapDirty(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load the city directory.";
        console.error("[shop-map][directory] load failed", error);
        setShopStoresError(message);
        if (options?.rethrow) {
          throw error;
        }
      } finally {
        setShopStoresLoading(false);
      }
    },
    [idToken, shopDirectoryCityDraft, shopLocation, shopStoresLoading, userId]
  );

  const initializeShopDashboard = useCallback(async () => {
    if (shopStoresLoading) {
      return;
    }
    const coords = shopMapCenterRef.current || shopLocation || (await requestShopCoordinates());
    if (coords) {
      setShopLocation(coords);
      setShopMapCenter((current) => current || coords);
    }
    const resolvedCity = coords ? await resolveShopCityFromCoords(coords) : "";
    if (resolvedCity) {
      setShopDirectoryCityDraft(resolvedCity);
      try {
        await loadShopDirectory(resolvedCity, { rethrow: true });
        return;
      } catch {
        // loadShopDirectory handles UI error state; fall back to nearby below.
      }
    }
    await refreshShopDashboard(false, coords || undefined);
  }, [
    loadShopDirectory,
    refreshShopDashboard,
    requestShopCoordinates,
    resolveShopCityFromCoords,
    shopLocation,
    shopStoresLoading
  ]);

  const refreshShopDirectorySnapshot = useCallback(async () => {
    const cityName = String(shopDirectoryCity || shopDirectoryCityDraft).trim();
    if (!cityName || shopDirectoryRefreshBusy) {
      return;
    }
    setShopDirectoryRefreshBusy(true);
    setShopStoresError("");
    try {
      const coords = shopMapCenterRef.current || shopLocation || (await requestShopCoordinates());
      if (!coords) {
        throw new Error("Location is required to refresh this city directory.");
      }
      await refreshDirectoryStores(
        {
          city: cityName,
          center_lat: coords.lat,
          center_lng: coords.lng,
          radius_meters: Math.max(12000, shopSearchRadiusForZoom(shopMapZoomRef.current)),
          max_results: 240
        },
        idToken
      );
      await loadShopDirectory(cityName);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not refresh the city directory.";
      console.error("[shop-map][directory] refresh failed", error);
      setShopStoresError(message);
    } finally {
      setShopDirectoryRefreshBusy(false);
    }
  }, [
    idToken,
    loadShopDirectory,
    requestShopCoordinates,
    shopDirectoryCity,
    shopDirectoryCityDraft,
    shopDirectoryRefreshBusy,
    shopLocation
  ]);

  const toggleFavoriteShopStore = useCallback(
    async (store: NearbyStore) => {
      const storeId = String(store.id || "").trim();
      if (!storeId || !userId) {
        return;
      }
      if (shopFavoriteBusyIds.has(storeId)) {
        return;
      }
      setShopFavoriteBusyIds((current) => new Set(current).add(storeId));
      const nextFavorite = !Boolean(store.is_favorite);
      setShopStores((current) =>
        current.map((row) =>
          row.id === storeId
            ? {
                ...row,
                is_favorite: nextFavorite
              }
            : row
        )
      );
      try {
        if (nextFavorite) {
          const saved = await addFavoriteStore(
            userId,
            {
              store_id: storeId,
              name: store.name,
              category: store.category
            },
            idToken
          );
          setShopFavoriteStores((current) => {
            const without = current.filter((row) => row.store_id !== storeId);
            return [saved, ...without];
          });
        } else {
          await deleteFavoriteStore(userId, storeId, idToken);
          setShopFavoriteStores((current) => current.filter((row) => row.store_id !== storeId));
        }
      } catch (error) {
        setShopStores((current) =>
          current.map((row) =>
            row.id === storeId
              ? {
                  ...row,
                  is_favorite: !nextFavorite
                }
              : row
          )
        );
        const message = error instanceof Error ? error.message : "Could not update favorite store.";
        Alert.alert("Favorite store", message);
      } finally {
        setShopFavoriteBusyIds((current) => {
          const next = new Set(current);
          next.delete(storeId);
          return next;
        });
      }
    },
    [idToken, shopFavoriteBusyIds, userId]
  );

  const openStoreInMaps = useCallback(async (store: NearbyStore) => {
    const query = encodeURIComponent(store.name || "thrift store");
    const latLng = `${store.lat},${store.lng}`;
    const url =
      `https://www.google.com/maps/search/?api=1&query=${query}%20${encodeURIComponent(latLng)}`;
    try {
      if (Platform.OS === "web") {
        const anyGlobal = globalThis as any;
        if (typeof anyGlobal.open === "function") {
          anyGlobal.open(url, "_blank", "noopener,noreferrer");
          return;
        }
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Map unavailable", "Could not open this location in maps.");
    }
  }, []);

  const onShopMapLayout = useCallback((event: LayoutChangeEvent) => {
    const width = Number(event.nativeEvent.layout.width || 0);
    const height = Number(event.nativeEvent.layout.height || 0);
    if (!width || !height) {
      return;
    }
    setShopMapSize((current) => {
      if (Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1) {
        return current;
      }
      return { width, height };
    });
  }, []);

  const onShopMapDragStart = useCallback(
    (event: any) => {
      const center = shopMapCenterRef.current || shopLocation;
      if (!center) {
        return;
      }
      shopMapDraggedRef.current = false;
      shopPinchActiveRef.current = false;
      shopDragDxRef.current = 0;
      shopDragDyRef.current = 0;
      shopDragAnim.setValue({ x: 0, y: 0 });
      shopZoomScaleAnim.setValue(1);
      shopMapDragStartRef.current = {
        x: Number(event?.nativeEvent?.pageX || 0),
        y: Number(event?.nativeEvent?.pageY || 0),
        center: { ...center }
      };
    },
    [shopDragAnim, shopZoomScaleAnim, shopLocation]
  );

  const onShopMapDragMove = useCallback(
    (event: any) => {
      const touches = event?.nativeEvent?.touches;

      // Pinch-to-zoom (two fingers)
      if (touches?.length >= 2) {
        const dist = Math.hypot(
          touches[1].pageX - touches[0].pageX,
          touches[1].pageY - touches[0].pageY
        );
        if (!shopPinchActiveRef.current) {
          shopPinchActiveRef.current = true;
          shopPinchStartDistRef.current = dist;
          shopPinchStartZoomRef.current = shopMapZoomRef.current;
          shopPinchScaleRef.current = 1;
        } else if (shopPinchStartDistRef.current > 0) {
          const ratio = Math.max(0.4, Math.min(2.5, dist / shopPinchStartDistRef.current));
          shopPinchScaleRef.current = ratio;
          shopZoomScaleAnim.setValue(ratio);
        }
        return;
      }

      // Single-finger pan — animate visually, don't update state
      if (shopPinchActiveRef.current) {
        return;
      }
      const start = shopMapDragStartRef.current;
      if (!start) {
        return;
      }
      const x = Number(event?.nativeEvent?.pageX || 0);
      const y = Number(event?.nativeEvent?.pageY || 0);
      const dx = x - start.x;
      const dy = y - start.y;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
        return;
      }
      shopMapDraggedRef.current = true;
      shopDragDxRef.current = dx;
      shopDragDyRef.current = dy;
      shopDragAnim.setValue({ x: dx, y: dy });
    },
    [shopDragAnim, shopZoomScaleAnim]
  );

  const onShopMapWheel = useCallback(
    (event: any) => {
      if (Platform.OS !== "web") {
        return;
      }
      const now = Date.now();
      if (now - shopMapLastWheelAtRef.current < 80) {
        return;
      }
      shopMapLastWheelAtRef.current = now;
      const deltaY = Number(event?.nativeEvent?.deltaY ?? event?.deltaY ?? 0);
      if (!Number.isFinite(deltaY) || deltaY === 0) {
        return;
      }
      if (typeof event?.preventDefault === "function") {
        event.preventDefault();
      }
      setShopMapDirty(true);
      setShopMapZoom((current) =>
        Math.max(5, Math.min(18, current + (deltaY < 0 ? 1 : -1)))
      );
    },
    []
  );

  const onShopStaticMapLoad = useCallback(() => {
    shopDragAnim.setValue({ x: 0, y: 0 });
    shopZoomScaleAnim.setValue(1);
    shopDragDxRef.current = 0;
    shopDragDyRef.current = 0;
  }, [shopDragAnim, shopZoomScaleAnim]);

  const onShopStaticMapError = useCallback(
    (event: any) => {
      const detail = (event as any)?.nativeEvent?.error || (event as any)?.type || "unknown";
      console.error(`[shop-map][static] failed detail=${String(detail)}`);
      shopDragAnim.setValue({ x: 0, y: 0 });
      shopZoomScaleAnim.setValue(1);
    },
    [shopDragAnim, shopZoomScaleAnim]
  );

  const onShopMapDragEnd = useCallback(async () => {
    // Handle pinch end
    if (shopPinchActiveRef.current) {
      shopPinchActiveRef.current = false;
      const scale = shopPinchScaleRef.current;
      shopPinchScaleRef.current = 1;
      // Don't reset shopZoomScaleAnim yet — wait for image onLoad
      const zoomDelta = Math.log2(Math.max(0.4, Math.min(2.5, scale)));
      const newZoom = Math.max(
        5,
        Math.min(18, Math.round(shopPinchStartZoomRef.current + zoomDelta))
      );
      setShopMapDirty(true);
      setShopMapZoom(newZoom);
      return;
    }

    const start = shopMapDragStartRef.current;
    const didDrag = shopMapDraggedRef.current;
    shopMapDragStartRef.current = null;
    if (!start?.center) {
      return;
    }
    if (!didDrag) {
      const now = Date.now();
      if (now - shopMapLastTapMsRef.current <= 320) {
        setShopMapDirty(true);
        setShopMapZoom((current) => Math.max(5, Math.min(18, current + 1)));
        shopMapLastTapMsRef.current = 0;
      } else {
        shopMapLastTapMsRef.current = now;
      }
      return;
    }
    shopMapLastTapMsRef.current = 0;
    shopMapDraggedRef.current = false;

    // Compute new center from drag delta
    const dx = shopDragDxRef.current;
    const dy = shopDragDyRef.current;
    // Don't reset shopDragAnim yet — wait for image onLoad
    const width = Math.max(1, shopMapSize.width);
    const height = Math.max(1, shopMapSize.height);
    const zoom = shopMapZoomRef.current;
    const lngPerPixel = 360 / (256 * Math.pow(2, zoom));
    const latPerPixel = 170 / (256 * Math.pow(2, zoom));
    const latAdjust = Math.max(0.2, Math.cos((start.center.lat * Math.PI) / 180));
    let nextLat = start.center.lat + dy * latPerPixel * (280 / height);
    let nextLng = start.center.lng - (dx * lngPerPixel * (320 / width)) / latAdjust;
    nextLat = Math.max(-85, Math.min(85, nextLat));
    nextLng = Math.max(-180, Math.min(180, nextLng));
    setShopMapDirty(true);
    setShopMapCenter({ lat: nextLat, lng: nextLng });
  }, [shopDragAnim, shopMapSize.height, shopMapSize.width]);

  const onShopCarouselMomentumEnd = useCallback(
    (event: any) => {
      const x = Number(event?.nativeEvent?.contentOffset?.x || 0);
      const step = shopCarouselCardWidth + 14;
      const index = Math.max(0, Math.round(x / step));
      const nextStore = shopPerimeterStores[index];
      if (!nextStore) {
        return;
      }
      setShopSelectedStoreId(nextStore.id);
      setShopMapDirty(false);
      setShopMapCenter({ lat: nextStore.lat, lng: nextStore.lng });
    },
    [shopCarouselCardWidth, shopPerimeterStores]
  );

  const onShopMapSelectStore = useCallback((store: NearbyStore) => {
    if (Platform.OS !== "web") {
      shopSuppressNextNativeViewportRef.current = true;
    }
    setShopSelectedStoreId(store.id);
    setShopMapDirty(false);
    setShopMapCenter({ lat: store.lat, lng: store.lng });
  }, []);

  const onShopNativeViewportChange = useCallback(
    (next: { center: ShopCoords; zoom: number }) => {
      if (shopSuppressNextNativeViewportRef.current) {
        shopSuppressNextNativeViewportRef.current = false;
        setShopMapCenter(next.center);
        setShopMapZoom(next.zoom);
        return;
      }
      setShopMapDirty(true);
      setShopMapCenter(next.center);
      setShopMapZoom(next.zoom);
    },
    []
  );

  const startShopMicStreaming = useCallback(
    async (silent = false) => {
      if (Platform.OS !== "web") {
        if (!silent) {
          Alert.alert("Voice mode", "Mic streaming is currently supported on web in this build.");
        }
        return;
      }
      if (shopMicStreaming) {
        return;
      }
      const shopClient = shopClientRef.current;
      if (!shopClient) {
        if (!silent) {
          Alert.alert("Shop assistant", "Connect shop assistant before enabling mic.");
        }
        return;
      }
      try {
        const anyWindow = globalThis as any;
        const mediaDevices = anyWindow.navigator?.mediaDevices;
        if (!mediaDevices?.getUserMedia) {
          throw new Error("getUserMedia unavailable");
        }
        const stream = await mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = anyWindow.AudioContext || anyWindow.webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("AudioContext unavailable");
        }
        const context = new AudioContextClass();
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(4096, 1, 1);
        const silentGain = context.createGain();
        silentGain.gain.value = 0;

        processor.onaudioprocess = (event: any) => {
          const channelData = event.inputBuffer?.getChannelData(0);
          if (!channelData) {
            return;
          }
          const downsampled = downsampleFloat32(channelData, context.sampleRate, 16000);
          const pcmBytes = float32ToPcm16Bytes(downsampled);
          const encoded = encodeBytesToBase64(pcmBytes);
          void shopClient.sendRealtimeAudio({
            data: encoded,
            mimeType: "audio/pcm;rate=16000"
          });
        };

        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(context.destination);

        shopInputAudioContextRef.current = context;
        shopInputMediaStreamRef.current = stream;
        shopInputProcessorRef.current = processor;
        shopInputSourceRef.current = source;
        shopInputSilentGainRef.current = silentGain;
        setShopMicStreaming(true);
      } catch {
        setShopMicStreaming(false);
        if (!silent) {
          Alert.alert(
            "Mic stream error",
            "Could not start microphone streaming. Check browser microphone permissions."
          );
        }
      }
    },
    [appendShopLine, shopMicStreaming]
  );

  const stopShopMicStreaming = useCallback(async () => {
    try {
      if (shopInputProcessorRef.current) {
        shopInputProcessorRef.current.disconnect();
      }
      if (shopInputSourceRef.current) {
        shopInputSourceRef.current.disconnect();
      }
      if (shopInputSilentGainRef.current) {
        shopInputSilentGainRef.current.disconnect();
      }
      if (shopInputMediaStreamRef.current?.getTracks) {
        const tracks = shopInputMediaStreamRef.current.getTracks();
        for (const track of tracks) {
          track.stop();
        }
      }
      if (shopInputAudioContextRef.current?.close) {
        await shopInputAudioContextRef.current.close();
      }
      const shopClient = shopClientRef.current;
      if (shopClient) {
        await shopClient.endAudioStream();
      }
    } catch {
      // ignore cleanup errors
    } finally {
      shopInputProcessorRef.current = null;
      shopInputSourceRef.current = null;
      shopInputSilentGainRef.current = null;
      shopInputMediaStreamRef.current = null;
      shopInputAudioContextRef.current = null;
      setShopMicStreaming(false);
    }
  }, []);

  const startShopSession = useCallback(async (selectedStore?: NearbyStore | null) => {
    if (!cameraPermission?.granted) {
      const granted = await requestCameraPermission();
      if (!granted?.granted) {
        Alert.alert(
          "Camera permission required",
          "Please allow camera access to use the in-store shopping assistant."
        );
        return;
      }
    }
    await closeShopSession();
    setShopStatus("connecting");
    setShopSuggestedItemIds(new Set());
    shopLastSuggestedIdsRef.current = [];
    patchConciergeSession({
      activeMode: "shop",
      activeStoreId: selectedStore?.id || null,
      activeCity: shopDirectoryCity || conciergeSessionRef.current.activeCity,
      handoffReason: selectedStore
        ? `Opening store assist at ${selectedStore.name}.`
        : "Opening store assist for live in-store decisions.",
    });
    appendShopLine("system", "Starting in-store shopping assistant...");
    appendShopLine("system", `Trying Live model ${LIVE_MODEL}...`);

    try {
      const token = await createLiveEphemeralToken(userId, idToken, {
        model: LIVE_MODEL,
        mode: "shop",
        uses: 1,
        session_ttl_seconds: 1800,
        new_session_ttl_seconds: 300,
        enable_session_resumption: false
      });
      const connectedModel = token.model || LIVE_MODEL;
      const storeContext = selectedStore
        ? `Selected store context: ${selectedStore.name}. Category: ${
            selectedStore.category || "secondhand shop"
          }. Vibe: ${selectedStore.ai_evaluation?.vibe_check || "unknown"}. Best for: ${
            selectedStore.ai_evaluation?.best_for?.join(", ") || "none"
          }. Sustainability score: ${normalizeSustainabilityScore(
            selectedStore.ai_evaluation?.sustainability_score
          )}/100. Wishlist relevance: ${Number(selectedStore.wishlist_relevance || 0).toFixed(2)}.`
        : "";
      const shopClient = await createLiveTextClient({
        ephemeralToken: token.token,
        model: connectedModel,
        voiceName: "Zephyr",
        systemInstruction:
          "You are an in-store shopping assistant. " +
          "The user is walking in a store and showing items on camera. " +
          "Assess whether the item is worth buying and suggest closet pairings. " +
          "Before naming any pairing, call search_closet_for_matches and only mention items returned by that tool. " +
          "Never invent closet items. " +
          "When user asks for a try-on preview, call capture_store_item first, then call generate_in_store_tryon using closet_item_ids from your latest search result. " +
          "Do not call generate_in_store_tryon with empty closet_item_ids. " +
          "If the user changes tasks and wants wishlist help, styling, or wardrobe scanning instead, call route_to_specialist. Include a short summary of what they want next and any obvious item or event context. " +
          "Keep answers short and practical. " +
          (selectedStore
            ? "Open with a brief greeting that references the selected store and one useful specialty tag. "
            : "") +
          storeContext,
        onEvent: (event) => {
          if (event.includes("session open")) {
            setShopStatus("connected");
          }
          if (event.includes("session closed")) {
            setShopStatus("offline");
            shopClientRef.current = null;
            stopShopFrameStreaming();
            void stopShopMicStreaming();
            appendShopLine("system", event);
          }
          if (event.includes("error")) {
            setShopStatus("error");
            appendShopLine("system", event);
          }
        },
        onText: (text) => {
          appendShopLine("agent", feedbackFromLiveText(text));
        },
        onAudioChunk: (data, mimeType) => {
          void playShopAudioChunk(data, mimeType);
        },
        onToolCall: async (functionName, args) => {
          if (functionName === "route_to_specialist") {
            appendShopLine("system", `[route] ${JSON.stringify(args)}`);
            if (!handleRouteToolCallRef.current) {
              return { error: "Route handler unavailable" };
            }
            return handleRouteToolCallRef.current("shop", args);
          }
          const allowed =
            functionName === "search_closet_for_matches" ||
            functionName === "capture_store_item" ||
            functionName === "generate_in_store_tryon";
          if (!allowed) {
            appendShopLine("system", `[tool] blocked ${functionName}`);
            return { error: "Unsupported tool in shop mode" };
          }
          appendShopLine("system", `[tool] call ${functionName} ${JSON.stringify(args)}`);

          if (functionName === "capture_store_item") {
            const frame = await captureShopFrameBase64();
            if (!frame) {
              return { status: "no_frame", captured: false };
            }
            shopLatestStoreItemRef.current = frame;
            return {
              status: "captured",
              captured: true,
              bytes: frame.length,
              captured_at_ms: Date.now()
            };
          }

          let imageBase64: string | undefined;
          let toolArgs = { ...args } as Record<string, unknown>;
          if (functionName === "generate_in_store_tryon") {
            imageBase64 = shopLatestStoreItemRef.current || (await captureShopFrameBase64());
            if (imageBase64) {
              shopLatestStoreItemRef.current = imageBase64;
            }
            const idsFromArray = Array.isArray(toolArgs.closet_item_ids)
              ? toolArgs.closet_item_ids
                  .map((value) => String(value).trim())
                  .filter((value) => Boolean(value))
              : [];
            const idsFromCsv =
              typeof toolArgs.closet_item_ids_csv === "string"
                ? toolArgs.closet_item_ids_csv
                    .split(",")
                    .map((value) => value.trim())
                    .filter((value) => Boolean(value))
                : [];
            const ids = idsFromArray.length ? idsFromArray : idsFromCsv;
            if (!ids.length && shopLastSuggestedIdsRef.current.length) {
              toolArgs = {
                ...toolArgs,
                closet_item_ids: [...shopLastSuggestedIdsRef.current]
              };
              appendShopLine(
                "system",
                `[tool] generate_in_store_tryon using latest matched closet ids: ${shopLastSuggestedIdsRef.current.join(", ")}`
              );
            }
          }

          const response = await dispatchWardrobeTool(
            userId,
            {
              function_name: functionName,
              args: toolArgs,
              image_base64: imageBase64
            },
            idToken
          );
          const result = response.result as Record<string, unknown>;

          if (functionName === "search_closet_for_matches") {
            const selectedFromIds = Array.isArray(result.selected_item_ids)
              ? result.selected_item_ids
                  .map((value) => String(value).trim())
                  .filter((value) => Boolean(value))
              : [];
            const selectedFromItems = Array.isArray(result.items)
              ? result.items
                  .map((row) =>
                    row && typeof row === "object" && "id" in (row as Record<string, unknown>)
                      ? String((row as Record<string, unknown>).id || "").trim()
                      : ""
                  )
                  .filter((value) => Boolean(value))
              : [];
            const selected = selectedFromIds.length ? selectedFromIds : selectedFromItems;
            shopLastSuggestedIdsRef.current = selected;
            setShopSuggestedItemIds(new Set(selected));
            patchConciergeSession({
              selectedClosetItemIds: selected,
              activeStoreId: selectedStore?.id || conciergeSessionRef.current.activeStoreId,
            });
            appendShopLine("system", `[tool] matches ${selected.length}`);
            return {
              status: String(result.status ?? "ok"),
              count: Number(result.count ?? selected.length),
              selected_item_ids: selected,
              items: Array.isArray(result.items) ? result.items.slice(0, 8) : []
            };
          }

          if (functionName === "generate_in_store_tryon") {
            const generated = Boolean(result.generated);
            const outBase64 =
              typeof result.image_base64 === "string" ? result.image_base64 : "";
            const usedIds = Array.isArray(result.used_closet_item_ids)
              ? result.used_closet_item_ids
                  .map((value) => String(value).trim())
                  .filter((value) => Boolean(value))
              : [];
            if (usedIds.length) {
              shopLastSuggestedIdsRef.current = usedIds;
              setShopSuggestedItemIds(new Set(usedIds));
            }
            if (generated && outBase64) {
              setShopTryOnImageBase64(outBase64);
              setShopTryOnModalVisible(true);
              appendShopLine("system", `[try-on] preview ready bytes=${outBase64.length}`);
            }
            return {
              status: String(result.status ?? (generated ? "ok" : "error")),
              generated,
              used_closet_item_ids: usedIds,
              error: typeof result.error === "string" ? result.error : undefined
            };
          }

          return result;
        }
      });

      shopClientRef.current = shopClient;
      setShopStatus("connected");
      setShopModelName(connectedModel);
      appendShopLine("system", `Shop assistant connected on ${connectedModel}.`);
      if (selectedStore) {
        appendShopLine(
          "system",
          `[store] ${selectedStore.name} · ${selectedStore.category || "Secondhand"}`
        );
      }
      void sendPendingHandoffToClient("shop", shopClient, appendShopLine);
      void startShopMicStreaming(true);

      stopShopFrameStreaming();
      shopFrameIntervalRef.current = setInterval(() => {
        const client = shopClientRef.current;
        if (!client) {
          return;
        }
        void (async () => {
          const frame = await captureShopFrameBase64();
          if (!frame) {
            return;
          }
          try {
            await client.sendRealtimeMedia({
              data: frame,
              mimeType: "image/jpeg"
            });
          } catch {
            // ignore transient stream send errors
          }
        })();
      }, SHOP_FRAME_STREAM_INTERVAL_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setShopStatus("error");
      appendShopLine("system", `Shop assistant unavailable. ${message}`);
    }
  }, [
    appendShopLine,
    cameraPermission?.granted,
    captureShopFrameBase64,
    closeShopSession,
    patchConciergeSession,
    idToken,
    playShopAudioChunk,
    requestCameraPermission,
    sendPendingHandoffToClient,
    shopDirectoryCity,
    startShopMicStreaming,
    stopShopFrameStreaming,
    stopShopMicStreaming,
    userId
  ]);

  const startStylistSession = useCallback(async (retryAttempt = 0) => {
    stylistShouldReconnectRef.current = true;
    clearStylistRetry();
    if (retryAttempt === 0) {
      await closeStylistSession();
      stylistRetryAttemptRef.current = 0;
    }
    setStylistSuggestedItemIds(new Set());
    setStylistExternalSuggestions([]);
    setStylistWebSearchQueries([]);
    setStylistWebResults([]);
    setStylistLastCloseCode(null);
    setStylistStatus("connecting");
    appendStylistLine(
      "system",
      retryAttempt > 0 ? `Reconnecting outfit stylist (attempt ${retryAttempt})...` : "Connecting outfit stylist..."
    );
    appendStylistLine("system", `Trying Live model ${LIVE_MODEL}...`);

    try {
      const token = await createLiveEphemeralToken(userId, idToken, {
        model: LIVE_MODEL,
        mode: "stylist",
        uses: 1,
        session_ttl_seconds: 1800,
        new_session_ttl_seconds: 300,
        enable_session_resumption: false
      });
      const connectedModel = token.model || LIVE_MODEL;
      const stylistClient = await createLiveTextClient({
        ephemeralToken: token.token,
        model: connectedModel,
        voiceName: "Zephyr",
        systemInstruction:
          "You are a live outfit stylist helping the user pick clothes from their closet. " +
          "This is NOT a wardrobe scan and NOT cataloging. " +
          "Never ask to scan, capture, catalog, or intake garments. " +
          "Assume the closet is already available via tool access. " +
          "Keep responses concise and natural. " +
          "Always call fetch_closet immediately after the user's first styling request to establish a wardrobe baseline. " +
          "Use fetch_closet to inspect available items. " +
          "When the user asks for current web options, what to buy online, or explicitly asks you to look on the internet, call search_web_for_shopping before answering. " +
          "If the user clearly says they are missing a garment they want to own, check fetch_wishlist when useful to avoid duplicates and call add_wishlist_item silently. " +
          "When the user asks for a full outfit (top/bottom/shoes) for an event, or clearly lacks a key piece for that outfit, call build_complete_outfit with event_context (and base_item_id if provided). " +
          "If build_complete_outfit shows a missing slot and the user wants real shopping options, follow it with search_web_for_shopping. " +
          "If the user explicitly wants live garment scanning or in-store camera help instead, call route_to_specialist. Include a short summary of what they want next and any obvious item or event context. " +
          "Whenever you recommend an outfit, call fetch_closet again with selected_item_ids_csv containing comma-separated chosen item IDs so they appear on screen. " +
          "When user asks to swap one piece, keep the other selected items and change only that piece.",
        responseModalities: ["AUDIO"],
        onEvent: (event) => {
          if (event.includes("session open")) {
            setStylistStatus("connected");
            stylistRetryAttemptRef.current = 0;
            setStylistLastCloseCode(null);
            clearStylistRetry();
          }
          if (event.includes("session closed")) {
            setStylistStatus("offline");
            const codeMatch = event.match(/code=([0-9]+)/);
            setStylistLastCloseCode(codeMatch?.[1] ? Number(codeMatch[1]) : null);
            stylistClientRef.current = null;
            void stopStylistMicStreaming();
            appendStylistLine("system", event);
          }
          if (event.includes("error")) {
            setStylistStatus("error");
            appendStylistLine("system", event);
          }
          if (event.includes("tool_response_error")) {
            appendStylistLine("system", event);
          }
        },
        onText: (text) => {
          markStylistSpeaking();
          appendStylistLine("agent", feedbackFromLiveText(text));
        },
        onAudioChunk: (data, mimeType) => {
          void playStylistAudioChunk(data, mimeType);
        },
        onGrounding: ({ webSearchQueries, webResults }) => {
          setStylistWebSearchQueries(webSearchQueries);
          setStylistWebResults(webResults);
          if (webResults.length) {
            appendStylistLine("system", `[web] grounded results ${webResults.length}`);
          }
        },
        onToolCall: async (functionName, args) => {
          if (functionName === "route_to_specialist") {
            appendStylistLine("system", `[route] ${JSON.stringify(args)}`);
            if (!handleRouteToolCallRef.current) {
              return { error: "Route handler unavailable" };
            }
            return handleRouteToolCallRef.current("stylist", args);
          }
          const allowedTool =
            functionName === "fetch_closet" ||
            functionName === "fetch_wishlist" ||
            functionName === "add_wishlist_item" ||
            functionName === "log_unmet_style_intent" ||
            functionName === "build_complete_outfit" ||
            functionName === "search_web_for_shopping";
          if (!allowedTool) {
            appendStylistLine("system", `[tool] blocked ${functionName} (not allowed in stylist mode)`);
            return { error: "Unsupported tool in stylist mode" };
          }
          appendStylistLine("system", `[tool] call ${functionName} ${JSON.stringify(args)}`);
          const response = await dispatchWardrobeTool(
            userId,
            {
              function_name: functionName,
              args
            },
            idToken
          );
          const result = response.result as Record<string, unknown>;
          if (functionName === "fetch_closet") {
            const selected = Array.isArray(result.selected_item_ids)
              ? result.selected_item_ids
                  .map((value) => String(value).trim())
                  .filter((value) => Boolean(value))
              : [];
            setStylistSuggestedItemIds(new Set(selected));
            patchConciergeSession({
              activeMode: "stylist",
              selectedClosetItemIds: selected,
            });
            if (selected.length) {
              appendStylistLine("system", `[outfit] showing ${selected.length} selected item(s).`);
            }

            const compactItems = Array.isArray(result.items)
              ? result.items.slice(0, 12).map((raw) => {
                  const row = raw as Record<string, unknown>;
                  const read = (key: string) => {
                    const value = row[key];
                    return value == null ? null : String(value);
                  };
                  return {
                    id: read("id"),
                    title: read("title"),
                    category: read("category"),
                    color: read("color"),
                    fabric_type: read("fabric_type"),
                    style: read("style"),
                    estimated_fit: read("estimated_fit"),
                    note: read("note")
                  };
                })
              : [];
            appendStylistLine("system", `[tool] result ${functionName}`);
            return {
              status: String(result.status ?? "ok"),
              count: Number(result.count ?? compactItems.length) || compactItems.length,
              selected_item_ids: selected,
              items: compactItems
            };
          }
          if (functionName === "fetch_wishlist") {
            const compactItems = Array.isArray(result.items)
              ? result.items.slice(0, 12).map((raw) => {
                  const row = raw as Record<string, unknown>;
                  const read = (key: string) => {
                    const value = row[key];
                    return value == null ? null : String(value);
                  };
                  return {
                    id: read("id"),
                    category: read("category"),
                    color: read("color"),
                    size: read("size"),
                    notes: read("notes")
                  };
                })
              : [];
            appendStylistLine("system", `[tool] result ${functionName}`);
            return {
              status: String(result.status ?? "ok"),
              count: Number(result.count ?? compactItems.length) || compactItems.length,
              items: compactItems
            };
          }
          if (functionName === "add_wishlist_item") {
            const item = result.item && typeof result.item === "object"
              ? (result.item as Record<string, unknown>)
              : null;
            const savedId =
              item?.id != null ? String(item.id).trim() : "";
            if (savedId) {
              patchConciergeSession((current) => ({
                recentWishlistItemIds: [savedId, ...current.recentWishlistItemIds].slice(0, 8),
                handoffReason: "Saved that missing piece to wishlist without leaving the styling conversation.",
              }));
            }
            appendStylistLine(
              "system",
              `[wishlist] added ${String(item?.category || args.category || "item")}.`
            );
            return {
              status: String(result.status ?? "saved"),
              item: item
                ? {
                    id: item.id ? String(item.id) : undefined,
                    category: item.category ? String(item.category) : undefined,
                    color: item.color ? String(item.color) : undefined,
                    size: item.size ? String(item.size) : undefined,
                    notes: item.notes ? String(item.notes) : undefined
                  }
                : undefined
            };
          }
          if (functionName === "log_unmet_style_intent") {
            appendStylistLine("system", "[memory] style intent logged.");
            return {
              status: String(result.status ?? "logged"),
              intent_id: result.intent_id ? String(result.intent_id) : undefined
            };
          }
          if (functionName === "build_complete_outfit") {
            const selected = Array.isArray(result.selected_item_ids)
              ? result.selected_item_ids
                  .map((value) => String(value).trim())
                  .filter((value) => Boolean(value))
              : [];
            setStylistSuggestedItemIds(new Set(selected));
            patchConciergeSession({
              activeMode: "stylist",
              selectedClosetItemIds: selected,
              sessionGoal:
                typeof args.event_context === "string" && args.event_context.trim()
                  ? args.event_context.trim()
                  : conciergeSessionRef.current.sessionGoal,
            });
            const suggestions = Array.isArray(result.external_suggestions)
              ? result.external_suggestions.slice(0, 3).map((row) => {
                  const value = row as Record<string, unknown>;
                  return {
                    slot: String(value.slot || ""),
                    title: String(value.target_item || value.title || ""),
                    url: String(value.search_url || value.url || ""),
                    aestheticGoal:
                      typeof value.aesthetic_goal === "string"
                        ? value.aesthetic_goal
                        : undefined,
                    aestheticMatch:
                      typeof value.aesthetic_match === "string"
                        ? value.aesthetic_match
                        : undefined,
                    physicalStores: Array.isArray(value.physical_stores)
                      ? value.physical_stores
                          .map((entry) => String(entry).trim())
                          .filter((entry) => Boolean(entry))
                      : [],
                    searchQueries: Array.isArray(value.search_queries)
                      ? value.search_queries
                          .map((entry) => String(entry).trim())
                          .filter((entry) => Boolean(entry))
                      : [],
                  };
                }).filter((row) => Boolean(row.url.trim()))
              : [];
            setStylistExternalSuggestions(suggestions);
            for (const suggestion of suggestions) {
              appendStylistLine(
                "system",
                `[shopping] ${suggestion.slot || "item"}: ${
                  suggestion.aestheticGoal || suggestion.title
                } -> ${suggestion.url}`
              );
            }
            appendStylistLine(
              "system",
              `[tool] outfit ready closet_items=${selected.length} external_suggestions=${suggestions.length}`
            );
            return {
              status: String(result.status ?? "ok"),
              selected_item_ids: selected,
              missing_slots: Array.isArray(result.missing_slots) ? result.missing_slots : [],
              complete_from_closet: Boolean(result.complete_from_closet),
              external_suggestions: suggestions,
              created_wishlist_items: Array.isArray(result.created_wishlist_items)
                ? result.created_wishlist_items
                : [],
              logged_style_intents: Array.isArray(result.logged_style_intents)
                ? result.logged_style_intents
                : [],
              tts_summary:
                typeof result.tts_summary === "string" ? result.tts_summary : undefined
            };
          }
          if (functionName === "search_web_for_shopping") {
            const searchQueries = Array.isArray(result.search_queries)
              ? result.search_queries
                  .map((value) => String(value).trim())
                  .filter((value) => Boolean(value))
              : [];
            const webResults = Array.isArray(result.results)
              ? result.results
                  .flatMap((row) => {
                    const value = row as Record<string, unknown>;
                    const url = String(value.url || "").trim();
                    if (!url) {
                      return [];
                    }
                    return [{
                      title: String(value.title || url),
                      url,
                      domain:
                        typeof value.domain === "string" && value.domain.trim()
                          ? value.domain.trim()
                          : undefined
                    }];
                  })
              : [];
            setStylistWebSearchQueries(searchQueries);
            setStylistWebResults(webResults);
            patchConciergeSession({
              recentWebResults: webResults.slice(0, 6),
              handoffReason:
                searchQueries.length && searchQueries[0]
                  ? `Looking up current web options for ${searchQueries[0]}.`
                  : "Looking up current web shopping options.",
            });
            appendStylistLine(
              "system",
              `[web] search ${webResults.length} result(s)${
                searchQueries.length ? ` for ${searchQueries[0]}` : ""
              }`
            );
            return {
              status: String(result.status ?? "ok"),
              search_queries: searchQueries,
              results: webResults,
              summary: typeof result.summary === "string" ? result.summary : undefined
            };
          }
          appendStylistLine("system", `[tool] result ${functionName}`);
          return result;
        }
      });
      stylistClientRef.current = stylistClient;
      setStylistStatus("connected");
      setStylistModelName(connectedModel);
      appendStylistLine("system", `Stylist connected on ${connectedModel}.`);
      void sendPendingHandoffToClient("stylist", stylistClient, appendStylistLine);
      void startStylistMicStreaming(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStylistStatus("error");
      appendStylistLine("system", `Stylist unavailable. ${message}`);
    }
  }, [
    appendStylistLine,
    clearStylistRetry,
    closeStylistSession,
    patchConciergeSession,
    idToken,
    markStylistSpeaking,
    playStylistAudioChunk,
    sendPendingHandoffToClient,
    startStylistMicStreaming,
    stopStylistMicStreaming,
    userId
  ]);

  useEffect(() => {
    if (!stylistSurfaceActive || stylistStatus !== "offline") {
      return;
    }
    if (!stylistShouldReconnectRef.current) {
      return;
    }
    if (stylistLastCloseCode !== 1006 && stylistLastCloseCode !== 1011) {
      return;
    }
    if (stylistRetryAttemptRef.current >= 3) {
      appendStylistLine("system", "Stylist reconnect attempts exhausted.");
      setStylistStatus("error");
      return;
    }

    const nextAttempt = stylistRetryAttemptRef.current + 1;
    stylistRetryAttemptRef.current = nextAttempt;
    const delayMs = Math.min(8000, 1000 * Math.pow(2, nextAttempt - 1));
    appendStylistLine(
      "system",
      `Stylist session dropped. Retrying in ${(delayMs / 1000).toFixed(0)}s...`
    );
    clearStylistRetry();
    stylistRetryTimeoutRef.current = setTimeout(() => {
      if (!stylistShouldReconnectRef.current) {
        return;
      }
      void startStylistSession(nextAttempt);
    }, delayMs);

    return () => {
      clearStylistRetry();
    };
  }, [
    appendStylistLine,
    clearStylistRetry,
    startStylistSession,
    stylistLastCloseCode,
    stylistSurfaceActive,
    stylistStatus
  ]);

  const startLiveSession = useCallback(async (phase: string) => {
    await closeLiveSession();
    setLiveStatus("connecting");
    appendLiveLine("system", "Starting Gemini Live wardrobe coach...");
    appendLiveLine("system", `Trying Live model ${LIVE_MODEL}...`);

    try {
      const token = await createLiveEphemeralToken(userId, idToken, {
        model: LIVE_MODEL,
        uses: 1,
        session_ttl_seconds: 1800,
        new_session_ttl_seconds: 300,
        enable_session_resumption: false
      });
      const connectedModel = token.model || LIVE_MODEL;
      const liveClient = await createLiveTextClient({
        ephemeralToken: token.token,
        model: connectedModel,
        voiceName: "Zephyr",
        systemInstruction:
          "You are WardrobeScanAgent on a live video call. " +
          "Your tone is concise, warm, and practical. " +
          "Guide the user to scan one clothing item at a time with camera + voice. " +
          "Only focus on clothing items. If the view is not clothing, ask them to center one garment. " +
          "Use the camera feed to infer visible attributes (especially category and color) when clear. " +
          "Do not claim you cannot see the video if a garment is visible. " +
          "For each garment, ask short follow-up questions for missing details (type, color, material, fit). " +
          "Follow this strict lifecycle for every garment: identify attributes, call capture_item_photo once when centered, wait for the phrase 'Capture Locked', then call save_clothing_item silently. " +
          "Do not ask for extra notes; capture extra notes only if the user volunteers them. " +
          "When enough details are captured, explicitly say: 'Great, we can scan the next item.' " +
          "If the user changes tasks and clearly wants styling, wishlist help, or in-store shopping instead, call route_to_specialist. Include a short summary of what they want next and any obvious garment context. " +
          "Keep responses short (one or two sentences). " +
          "Never output internal reasoning, analysis notes, markdown headings, or meta commentary.",
        onEvent: (event) => {
          if (event.includes("session open")) {
            setLiveStatus("connected");
          }
          if (event.includes("session closed")) {
            setLiveStatus("offline");
            setAutoCapture(false);
            liveClientRef.current = null;
            void stopMicStreaming();
            appendLiveLine("system", event);
          }
          if (event.includes("error")) {
            setLiveStatus("error");
            appendLiveLine("system", event);
          }
        },
        onText: (text) => {
          const feedback = feedbackFromLiveText(text);
          appendLiveLine("agent", feedback);
          setLatestFeedback(feedback);
        },
        onAudioChunk: (data, mimeType) => {
          void playAudioChunk(data, mimeType);
        },
        onToolCall: async (functionName, args) => {
          if (functionName === "route_to_specialist") {
            appendLiveLine("system", `[route] ${JSON.stringify(args)}`);
            if (!handleRouteToolCallRef.current) {
              return { error: "Route handler unavailable" };
            }
            return handleRouteToolCallRef.current("scan", args);
          }
          appendLiveLine(
            "system",
            `[tool] call ${functionName} ${JSON.stringify(args)}`
          );
          syncPendingCardFromTool(functionName, args);
          if (functionName === "capture_item_photo") {
            const captured = await captureLiveVideoFrameBase64();
            if (!captured) {
              const missResult = { status: "no_frame", captured: false };
              appendLiveLine(
                "system",
                `[tool] result ${functionName} ${JSON.stringify(missResult)}`
              );
              return missResult;
            }
            await rememberSignaledCapture(captured);
            const capturedResult = {
              status: "captured",
              captured: true,
              captured_at_ms: Date.now(),
            };
            appendLiveLine(
              "system",
              `[tool] result ${functionName} ${JSON.stringify(capturedResult)}`
            );
            return capturedResult;
          }
          let imageBase64: string | undefined;
          if (functionName === "save_clothing_item") {
            const hasFreshSignaledCapture =
              Boolean(signaledCaptureBase64Ref.current) &&
              Date.now() - signaledCaptureAtRef.current <= SIGNALLED_CAPTURE_MAX_AGE_MS;
            imageBase64 = hasFreshSignaledCapture
              ? signaledCaptureBase64Ref.current
              : await captureLiveVideoFrameBase64();
            if (!hasFreshSignaledCapture && imageBase64) {
              await rememberSignaledCapture(imageBase64);
            }
            if (captureEnhancementInFlightRef.current) {
              appendLiveLine(
                "system",
                "[tool] Waiting for Capture Locked before save..."
              );
              const inFlight = captureEnhancementPromiseRef.current;
              if (inFlight) {
                try {
                  await Promise.race([
                    inFlight,
                    new Promise<void>((resolve) => {
                      setTimeout(resolve, CAPTURE_ENHANCEMENT_WAIT_MS);
                    }),
                  ]);
                } catch {
                  // ignore, proceed with best available frame
                }
              }
            }
            if (signaledCaptureBase64Ref.current) {
              imageBase64 = signaledCaptureBase64Ref.current;
            }
            appendLiveLine(
              "system",
              `[tool] save image_ready enhanced=${String(
                signaledCaptureEnhancedRef.current
              )} bytes=${imageBase64?.length ?? 0}`
            );
          }
          const pendingForSave = pendingItemRef.current;
          const toolArgs =
            functionName === "save_clothing_item"
              ? {
                  ...args,
                  phase:
                    typeof args.phase === "string" && args.phase.trim()
                      ? args.phase
                      : pendingForSave?.phase ?? currentPhase,
                  title:
                    typeof args.title === "string" && args.title.trim()
                      ? args.title
                      : pendingForSave?.title,
                  category:
                    typeof args.category === "string" && args.category.trim()
                      ? args.category
                      : pendingForSave?.category,
                  color:
                    typeof args.color === "string" && args.color.trim()
                      ? args.color
                      : pendingForSave?.color,
                  material:
                    typeof args.material === "string" && args.material.trim()
                      ? args.material
                      : pendingForSave?.fabric_type,
                  fabric_type:
                    typeof args.fabric_type === "string" && args.fabric_type.trim()
                      ? args.fabric_type
                      : pendingForSave?.fabric_type,
                  style:
                    typeof args.style === "string" && args.style.trim()
                      ? args.style
                      : pendingForSave?.style,
                  fit:
                    typeof args.fit === "string" && args.fit.trim()
                      ? args.fit
                      : pendingForSave?.estimated_fit,
                  estimated_fit:
                    typeof args.estimated_fit === "string" && args.estimated_fit.trim()
                      ? args.estimated_fit
                      : pendingForSave?.estimated_fit,
                  condition:
                    typeof args.condition === "string" && args.condition.trim()
                      ? args.condition
                      : pendingForSave?.condition,
                  note:
                    typeof args.note === "string" && args.note.trim()
                      ? args.note
                      : pendingForSave?.note,
                  extra_notes:
                    typeof args.extra_notes === "string" && args.extra_notes.trim()
                      ? args.extra_notes
                      : pendingForSave?.note,
                  image_base64: imageBase64 || pendingForSave?.image_base64 || lockedImageRef.current,
                  item_snippet_base64:
                    pendingForSave?.item_snippet_base64 || lockedSnippetRef.current || imageBase64,
                }
              : args;
          let response;
          try {
            response = await dispatchWardrobeTool(
              userId,
              {
                function_name: functionName,
                args: toolArgs,
                image_base64: imageBase64
              },
              idToken
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown tool dispatch failure";
            appendLiveLine("system", `[tool] error ${functionName} ${message}`);
            return {
              status: "error",
              message,
            };
          }
          appendLiveLine(
            "system",
            `[tool] result ${functionName} ${JSON.stringify(response.result)}`
          );
          syncPendingCardFromTool(functionName, toolArgs, response.result);
          if (functionName === "save_clothing_item") {
            const pending = pendingItemRef.current;
            if (pending) {
              const readyForClosetSave =
                hasMeaningfulCardValue(pending.category) &&
                hasMeaningfulCardValue(pending.color) &&
                hasMeaningfulCardValue(pending.fabric_type);
              if (!readyForClosetSave) {
                appendLiveLine(
                  "system",
                  "[tool] closet_save skipped: card not ready (category/color/material missing)."
                );
              } else {
                const imageBase64ForSave =
                  pending.image_base64 ||
                  lockedImageRef.current ||
                  signaledCaptureBase64Ref.current ||
                  lastFrameBase64Ref.current ||
                  undefined;
                const snippetBase64ForSave =
                  pending.item_snippet_base64 ||
                  lockedSnippetRef.current ||
                  imageBase64ForSave ||
                  undefined;
                const fingerprint = toCardFingerprint({
                  phase: pending.phase ?? currentPhase,
                  category: pending.category,
                  color: pending.color,
                  fabric_type: pending.fabric_type,
                  style: pending.style,
                  condition: pending.condition,
                  estimated_fit: pending.estimated_fit,
                });
                const imageSig = buildImageSignature(snippetBase64ForSave || imageBase64ForSave);
                const now = Date.now();
                const isDuplicate =
                  Boolean(fingerprint) &&
                  fingerprint === lastSavedFingerprintRef.current &&
                imageSig === lastSavedImageSigRef.current &&
                now - lastSavedAtRef.current < 12000;
                if (isDuplicate) {
                  appendLiveLine("system", "[tool] closet_save skipped: duplicate fingerprint+image.");
                } else {
                  const resultObj =
                    response.result && typeof response.result === "object"
                      ? (response.result as Record<string, unknown>)
                      : {};
                  const closetItemRaw = resultObj.closet_item;
                  const mergedFallbackVisual = {
                    image_url:
                      typeof resultObj.image_url === "string" ? resultObj.image_url : undefined,
                    image_base64: imageBase64ForSave,
                    item_snippet_base64: snippetBase64ForSave,
                  };
                  const savedItem =
                    closetItemRaw && typeof closetItemRaw === "object"
                      ? ({
                          ...(closetItemRaw as WardrobeItem),
                          image_url:
                            (closetItemRaw as WardrobeItem).image_url ||
                            mergedFallbackVisual.image_url,
                          image_base64:
                            (closetItemRaw as WardrobeItem).image_base64 ||
                            mergedFallbackVisual.image_base64,
                          item_snippet_base64:
                            (closetItemRaw as WardrobeItem).item_snippet_base64 ||
                            mergedFallbackVisual.item_snippet_base64,
                        } as WardrobeItem)
                      : ({
                          id:
                            (typeof resultObj.item_id === "string" && resultObj.item_id.trim()) ||
                            `${Date.now()}`,
                          phase: pending.phase ?? currentPhase,
                          category: pending.category,
                          title: pending.title,
                          color: pending.color,
                          style: pending.style,
                          fabric_type: pending.fabric_type,
                          condition: pending.condition,
                          estimated_fit: pending.estimated_fit,
                          note: pending.note,
                          image_url: mergedFallbackVisual.image_url,
                          image_base64: mergedFallbackVisual.image_base64,
                          item_snippet_base64: mergedFallbackVisual.item_snippet_base64,
                          created_at: new Date().toISOString(),
                        } as WardrobeItem);
                  lastSavedFingerprintRef.current = fingerprint;
                  lastSavedImageSigRef.current = imageSig;
                  lastSavedAtRef.current = now;
                  setCapturedItems((current) =>
                    current.some((item) => item.id === savedItem.id) ? current : [savedItem, ...current]
                  );
                  pendingItemRef.current = null;
                  setPendingItem(null);
                  lockedSnippetRef.current = "";
                  lockedImageRef.current = "";
                  setInstruction(`Saved ${savedItem.category}. Great, scan the next item.`);
                  appendLiveLine("system", `[tool] closet_saved item_id=${savedItem.id}`);
                  void sendCoordinatorUpdate({
                    phase: pending.phase ?? currentPhase,
                    isClothing: true,
                    readyForNextItem: true,
                    missingFields: [],
                    questionForUser: "Ask user to show the next garment.",
                    feedback: "Item saved. Say exactly: Got it! Next item?",
                    draft: {
                      category: savedItem.category,
                      title: savedItem.title,
                      color: savedItem.color,
                      material: savedItem.fabric_type,
                      style: savedItem.style,
                      fit: savedItem.estimated_fit,
                      note: savedItem.note,
                    },
                  });
                }
              }
            } else {
              appendLiveLine("system", "[tool] closet_save skipped: no pending card.");
            }
            signaledCaptureBase64Ref.current = "";
            signaledCaptureAtRef.current = 0;
            signaledCaptureEnhancedRef.current = false;
            captureEnhancementInFlightRef.current = false;
            captureEnhancementTokenRef.current += 1;
            captureEnhancementPromiseRef.current = null;
            setCaptureProcessing(false);
            const resultObj =
              response.result && typeof response.result === "object"
                ? (response.result as Record<string, unknown>)
                : {};
            return {
              status:
                typeof resultObj.status === "string" ? resultObj.status : "saved",
              item_id:
                typeof resultObj.item_id === "string" ? resultObj.item_id : undefined,
              missing_optional: Array.isArray(resultObj.missing_optional)
                ? resultObj.missing_optional
                : [],
            };
          }
          return response.result;
        }
      });

      liveClientRef.current = liveClient;
      setLiveStatus("connected");
      setLiveModelName(connectedModel);
      appendLiveLine("system", `Live connected on ${connectedModel}.`);
      void sendPendingHandoffToClient("scan", liveClient, appendLiveLine);
      await sendCoordinatorUpdate({
        phase,
        isClothing: true,
        readyForNextItem: false,
        missingFields: ["category", "color", "material"],
        questionForUser: "Ask user to show one garment and confirm type first.",
        feedback: "Session started.",
        draft: {}
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLiveStatus("error");
      appendLiveLine("system", `Gemini Live is unavailable. ${message}`);
    }
  }, [
    appendLiveLine,
    captureLiveVideoFrameBase64,
    closeLiveSession,
    currentPhase,
    idToken,
    playAudioChunk,
    rememberSignaledCapture,
    sendCoordinatorUpdate,
    sendPendingHandoffToClient,
    syncPendingCardFromTool,
    stopMicStreaming,
    userId
  ]);

  const refreshWishlist = useCallback(async (resolvedUserId: string, resolvedToken?: string) => {
    try {
      const wishlist = await getWishlist(resolvedUserId, resolvedToken);
      setWishlistItems(wishlist);
    } catch {
      // keep current wishlist state on transient failures
    }
  }, []);

  const refreshWearLogs = useCallback(async (resolvedUserId: string, resolvedToken?: string) => {
    try {
      const logs = await getWardrobeLogs(resolvedUserId, resolvedToken);
      setWearLogs(logs);
    } catch {
      // keep current wear log state on transient failures
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      setAuthLoading(true);
      setTryOnImageBase64("");
      try {
        const session = await ensureAuthSession();
        setAuthMode(session.mode);
        setUserId(session.userId);
        setIdToken(session.idToken);
        const wardrobe = await getWardrobeItems(session.userId, session.idToken);
        setCapturedItems(wardrobe);
        await refreshWishlist(session.userId, session.idToken);
        await refreshWearLogs(session.userId, session.idToken);
        await refreshFavoriteStores(session.userId, session.idToken);
        try {
          const profile = await getUserStyleProfile(session.userId, session.idToken);
          applyStyleProfile(
            profile,
            setStyleProfilePhotoBase64,
            setStyleProfileUpdatedAt,
            setTryOnImageBase64
          );
        } catch {
          setStyleProfilePhotoBase64("");
          setStyleProfileUpdatedAt("");
        }
      } catch {
        setAuthMode("demo");
        setUserId("demo-user");
        setIdToken(undefined);
        setWishlistItems([]);
        setWearLogs([]);
        setShopFavoriteStores([]);
        setStyleProfilePhotoBase64("");
        setStyleProfileUpdatedAt("");
        setTryOnImageBase64("");
      } finally {
        setAuthLoading(false);
      }
    }
    void bootstrap();
  }, [refreshFavoriteStores, refreshWearLogs, refreshWishlist]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (Platform.OS === "web") {
      try {
        const seen = globalThis.localStorage?.getItem(FIRST_RUN_TUTORIAL_STORAGE_KEY);
        setFirstRunTutorialVisible(seen !== "seen");
        return;
      } catch {
        setFirstRunTutorialVisible(true);
        return;
      }
    }

    setFirstRunTutorialVisible(true);
  }, [authLoading]);

  useEffect(() => {
    return () => {
      if (stylistSpeakingTimeoutRef.current) {
        clearTimeout(stylistSpeakingTimeoutRef.current);
        stylistSpeakingTimeoutRef.current = null;
      }
      void closeLiveSession();
      void closeStylistSession();
      void closeShopSession();
      void closeWishlistAgentSession();
    };
  }, [closeLiveSession, closeStylistSession, closeShopSession, closeWishlistAgentSession]);

  useEffect(() => {
    if (activeTab === "shop") {
      if (
        !shopAssistantActive &&
        !shopAutoRefreshDoneRef.current &&
        !shopMatchMode &&
        !shopMatchLoading &&
        shopBrowseMode === "nearby"
      ) {
        shopAutoRefreshDoneRef.current = true;
        if (!shopAutoDirectoryAttemptedRef.current) {
          shopAutoDirectoryAttemptedRef.current = true;
          void initializeShopDashboard();
        } else {
          void refreshShopDashboard(false);
        }
      }
      return;
    }
    shopAutoRefreshDoneRef.current = false;
    shopAutoDirectoryAttemptedRef.current = false;
    setShopAssistantActive(false);
    void closeShopSession();
  }, [
    activeTab,
    closeShopSession,
    initializeShopDashboard,
    refreshShopDashboard,
    shopAssistantActive,
    shopBrowseMode,
    shopMatchLoading,
    shopMatchMode
  ]);

  useEffect(() => {
    if (!stylistSurfaceActive) {
      return;
    }
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(stylistVoiceBreathAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true
        }),
        Animated.timing(stylistVoiceBreathAnim, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true
        })
      ])
    );
    breathLoop.start();
    return () => {
      breathLoop.stop();
      stylistVoiceBreathAnim.setValue(0);
    };
  }, [stylistSurfaceActive, stylistVoiceBreathAnim]);

  useEffect(() => {
    Animated.timing(stylistSpeechAnim, {
      toValue: stylistAgentSpeaking ? 1 : 0,
      duration: stylistAgentSpeaking ? 120 : 280,
      useNativeDriver: true
    }).start();
  }, [stylistAgentSpeaking, stylistSpeechAnim]);

  useEffect(() => {
    if (!wishlistSurfaceActive) {
      return;
    }
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(wishlistVoiceBreathAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true
        }),
        Animated.timing(wishlistVoiceBreathAnim, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true
        })
      ])
    );
    breathLoop.start();
    return () => {
      breathLoop.stop();
      wishlistVoiceBreathAnim.setValue(0);
    };
  }, [wishlistSurfaceActive, wishlistVoiceBreathAnim]);

  useEffect(() => {
    Animated.timing(wishlistSpeechAnim, {
      toValue: wishlistAgentSpeaking ? 1 : 0,
      duration: wishlistAgentSpeaking ? 120 : 280,
      useNativeDriver: true
    }).start();
  }, [wishlistAgentSpeaking, wishlistSpeechAnim]);

  useEffect(() => {
    const valid = new Set(capturedItems.map((item) => item.id));
    setSelectedTryOnItemIds((current) => {
      let changed = false;
      const next = new Set<string>();
      current.forEach((itemId) => {
        if (valid.has(itemId)) {
          next.add(itemId);
        } else {
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [capturedItems]);

  useEffect(() => {
    const valid = new Set(capturedItems.map((item) => item.id));
    setDailyLogSelectionIds((current) => {
      let changed = false;
      const next = new Set<string>();
      current.forEach((itemId) => {
        if (valid.has(itemId)) {
          next.add(itemId);
        } else {
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [capturedItems]);

  useEffect(() => {
    const valid = new Set(capturedItems.map((item) => item.id));
    setStylistSuggestedItemIds((current) => {
      let changed = false;
      const next = new Set<string>();
      current.forEach((itemId) => {
        if (valid.has(itemId)) {
          next.add(itemId);
        } else {
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [capturedItems]);

  const captureFrame = useCallback(
    async (silent: boolean) => {
      if (!scanStarted || !cameraRef.current || captureInFlightRef.current) {
        return;
      }
      captureInFlightRef.current = true;
      setScanBusy(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.5,
          skipProcessing: true
        });
        const normalizedPhoto = normalizeImagePayload(photo?.base64 || "", "image/jpeg");
        if (!normalizedPhoto.data) {
          throw new Error("camera capture returned no base64 image");
        }
        lastFrameBase64Ref.current = normalizedPhoto.data;
        const liveClient = liveClientRef.current;
        if (!liveClient) {
          throw new Error("live session is not connected");
        }

        await liveClient.sendRealtimeMedia({
          data: normalizedPhoto.data,
          mimeType: normalizedPhoto.mimeType
        });
        const itemSnippetBase64 = await buildItemSnippetBase64(
          normalizedPhoto.data,
          normalizedPhoto.mimeType
        );
        const currentPending = pendingItemRef.current;
        const currentDraft: WardrobeCardDraft | undefined = currentPending
          ? {
              phase: currentPhase,
              category: currentPending.category,
              title: currentPending.title,
              color: currentPending.color,
              material: currentPending.fabric_type,
              style: currentPending.style,
              fit: currentPending.estimated_fit,
              condition: currentPending.condition,
              note: currentPending.note
            }
          : undefined;

        const extracted = await extractWardrobeCard(
          userId,
          {
            phase: currentPhase,
            image_base64: normalizedPhoto.data,
            mime_type: normalizedPhoto.mimeType,
            note: currentPending?.note,
            current_draft: currentDraft
          },
          idToken
        );

        await sendCoordinatorUpdate({
          phase: currentPhase,
          isClothing: extracted.is_clothing,
          readyForNextItem: extracted.ready_for_next_item,
          missingFields: extracted.missing_fields,
          questionForUser: extracted.question_for_user,
          feedback: extracted.feedback,
          draft: {
            category: extracted.draft.category ?? undefined,
            title: extracted.draft.title ?? undefined,
            color: extracted.draft.color ?? undefined,
            material: extracted.draft.material ?? undefined,
            style: extracted.draft.style ?? undefined,
            fit: extracted.draft.fit ?? undefined,
            note: extracted.draft.note ?? undefined
          }
        });

        if (!extracted.is_clothing) {
          setInstruction(extracted.question_for_user || "Please center one clothing item.");
          setLatestFeedback(extracted.feedback);
          return;
        }

        const newCategory = (extracted.draft.category ?? "").trim().toLowerCase();
        const existingCategory = (currentPending?.category ?? "").trim().toLowerCase();
        const isNewGarment =
          !currentPending ||
          (newCategory && newCategory !== currentPhase && newCategory !== existingCategory);

        let useSnippet: string;
        let useImage: string;
        if (!isNewGarment && lockedSnippetRef.current) {
          useSnippet = lockedSnippetRef.current;
          useImage = lockedImageRef.current;
        } else {
          useSnippet = itemSnippetBase64;
          useImage = normalizedPhoto.data;
          lockedSnippetRef.current = itemSnippetBase64;
          lockedImageRef.current = normalizedPhoto.data;
        }

        const nextPayload: ParsedLiveWardrobe["payload"] = {
          phase: currentPhase,
          category: extracted.draft.category ?? currentPending?.category ?? "unknown",
          title: extracted.draft.title ?? currentPending?.title ?? "Clothing item",
          color: extracted.draft.color ?? currentPending?.color,
          style: extracted.draft.style ?? currentPending?.style,
          fabric_type: extracted.draft.material ?? currentPending?.fabric_type,
          condition: extracted.draft.condition ?? currentPending?.condition,
          estimated_fit: extracted.draft.fit ?? currentPending?.estimated_fit,
          note: extracted.draft.note ?? currentPending?.note,
          image_base64: useImage,
          item_snippet_base64: useSnippet
        };

        pendingItemRef.current = nextPayload;
        setPendingItem(nextPayload);
        setLatestFeedback(extracted.feedback);

        const readyToSave =
          extracted.ready_for_next_item &&
          hasMeaningfulCardValue(nextPayload.category) &&
          hasMeaningfulCardValue(nextPayload.color) &&
          hasMeaningfulCardValue(nextPayload.fabric_type);

        if (!readyToSave) {
          setInstruction(extracted.question_for_user || extracted.feedback);
          return;
        }

        if (liveStatus === "connected") {
          setInstruction(
            extracted.feedback ||
              "Card looks complete. I will save it through the live agent tool."
          );
          return;
        }

        const fingerprint = toCardFingerprint({
          phase: nextPayload.phase,
          category: nextPayload.category,
          color: nextPayload.color,
          fabric_type: nextPayload.fabric_type,
          style: nextPayload.style,
          condition: nextPayload.condition,
          estimated_fit: nextPayload.estimated_fit
        });
        const imageSig = buildImageSignature(nextPayload.item_snippet_base64 || nextPayload.image_base64);
        const now = Date.now();
        if (
          fingerprint &&
          fingerprint === lastSavedFingerprintRef.current &&
          imageSig === lastSavedImageSigRef.current &&
          now - lastSavedAtRef.current < 12000
        ) {
          setInstruction("Item card already saved. Show the next garment.");
          return;
        }

        const savedItem = await createWardrobeItem(
          userId,
          {
            ...nextPayload,
            note: nextPayload.note ?? extracted.feedback
          },
          idToken
        );
        lockedSnippetRef.current = "";
        lockedImageRef.current = "";
        signaledCaptureBase64Ref.current = "";
        signaledCaptureAtRef.current = 0;
        const alreadyEnhancedAtCapture = signaledCaptureEnhancedRef.current;
        signaledCaptureEnhancedRef.current = false;
        captureEnhancementInFlightRef.current = false;
        captureEnhancementTokenRef.current += 1;
        captureEnhancementPromiseRef.current = null;
        lastSavedFingerprintRef.current = fingerprint;
        lastSavedImageSigRef.current = imageSig;
        lastSavedAtRef.current = now;
        console.log(
          `[item-card][saved] ${JSON.stringify({
            id: savedItem.id,
            phase: savedItem.phase,
            category: savedItem.category,
            color: savedItem.color,
            material: savedItem.fabric_type,
            style: savedItem.style,
            condition: savedItem.condition,
            fit: savedItem.estimated_fit,
            snippet_bytes: savedItem.item_snippet_base64?.length ?? 0
          })}`
        );
        setCapturedItems((current) => [savedItem, ...current]);
        pendingItemRef.current = null;
        setPendingItem(null);
        setInstruction(extracted.feedback || `Saved ${savedItem.category}. Great, scan the next item.`);

        if (!alreadyEnhancedAtCapture && ENABLE_CLOSET_RETRY_ENHANCEMENT) {
          void queueEnhancementForItem(savedItem);
        }
        await sendCoordinatorUpdate({
          phase: currentPhase,
          isClothing: true,
          readyForNextItem: true,
          missingFields: [],
          questionForUser: "Ask for the next garment now.",
          feedback: "Card saved. Move to next item.",
          draft: {
            category: savedItem.category,
            title: savedItem.title,
            color: savedItem.color,
            material: savedItem.fabric_type,
            style: savedItem.style,
            fit: savedItem.estimated_fit,
            note: savedItem.note
          }
        });
      } catch {
        if (!silent) {
          Alert.alert(
            "Scan error",
            "I could not analyze this frame. Move slower and keep one garment centered."
          );
        }
      } finally {
        captureInFlightRef.current = false;
        setScanBusy(false);
      }
    },
    [currentPhase, idToken, liveStatus, scanStarted, sendCoordinatorUpdate, userId]
  );

  const queueEnhancementForItem = useCallback(
    async (item: WardrobeItem) => {
      const source = (item.item_snippet_base64 || item.image_base64 || "").trim();
      const primaryVisual = source;
      if (!source) {
        return;
      }
      if (isEnhancedSnippetBase64(primaryVisual)) {
        return;
      }
      if (enhancementInFlightRef.current.has(item.id)) {
        return;
      }

      const now = Date.now();
      const lastAttempt = enhancementAttemptAtRef.current.get(item.id) ?? 0;
      if (now - lastAttempt < ENHANCE_RETRY_COOLDOWN_MS) {
        return;
      }

      enhancementAttemptAtRef.current.set(item.id, now);
      enhancementInFlightRef.current.add(item.id);
      setEnhancingIds((prev) => new Set(prev).add(item.id));
      try {
        const enhanced = await enhanceWardrobeItemSnippet(
          userId,
          item.id,
          {
            item_snippet_base64: source,
            mime_type: "image/jpeg",
          },
          idToken
        );
        if (enhanced.enhanced && enhanced.item_snippet_base64) {
          setCapturedItems((current) =>
            current.map((row) =>
              row.id === item.id ? { ...row, item_snippet_base64: enhanced.item_snippet_base64 } : row
            )
          );
        }
      } catch (err) {
        console.warn("[enhance] Failed to enhance snippet for", item.id, err);
      } finally {
        enhancementInFlightRef.current.delete(item.id);
        setEnhancingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [idToken, userId]
  );

  useEffect(() => {
    if (!ENABLE_CLOSET_RETRY_ENHANCEMENT) {
      return;
    }
    const now = Date.now();
    const pendingCount = capturedItems.filter((item) => {
      const primaryVisual = (item.item_snippet_base64 || item.image_base64 || "").trim();
      return Boolean(primaryVisual) && !isEnhancedSnippetBase64(primaryVisual);
    }).length;
    const staleItem = capturedItems.find((item) => {
      const primaryVisual = (item.item_snippet_base64 || item.image_base64 || "").trim();
      if (!primaryVisual) {
        return false;
      }
      if (isEnhancedSnippetBase64(primaryVisual)) {
        return false;
      }
      if (enhancementInFlightRef.current.has(item.id)) {
        return false;
      }
      const lastAttempt = enhancementAttemptAtRef.current.get(item.id) ?? 0;
      return now - lastAttempt >= ENHANCE_RETRY_COOLDOWN_MS;
    });
    if (!staleItem) {
      if (pendingCount > 0) {
        console.log(`[enhance][scan] pending=${pendingCount} queued_now=0`);
      }
      return;
    }
    console.log(`[enhance][scan] pending=${pendingCount} queued_item=${staleItem.id}`);
    void queueEnhancementForItem(staleItem);
  }, [capturedItems, queueEnhancementForItem]);

  useEffect(() => {
    if (!scanStarted || !autoCapture) {
      return;
    }
    const timer = setInterval(() => {
      void captureFrame(true);
    }, AUTO_CAPTURE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [autoCapture, captureFrame, scanStarted]);

  const onStartScan = useCallback(async () => {
    await closeStylistSession();
    setStylistModalVisible(false);
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert(
          "Camera permission required",
          "Please allow camera access to run live wardrobe scan."
        );
        return;
      }
    }

    setScanStarted(true);
    setAutoCapture(true);
    setLatestFeedback("");
    setScanSummary("");
    setCapturedItems([]);
    setSelectedTryOnItemIds(new Set());
    setLiveLines([]);
    pendingItemRef.current = null;
    lockedSnippetRef.current = "";
    lockedImageRef.current = "";
    setPendingItem(null);
    lastSavedFingerprintRef.current = "";
    lastSavedImageSigRef.current = "";
    lastSavedAtRef.current = 0;
    lastCoordinatorDigestRef.current = "";
    lastFrameBase64Ref.current = "";
    signaledCaptureBase64Ref.current = "";
    signaledCaptureAtRef.current = 0;
    signaledCaptureEnhancedRef.current = false;
    captureEnhancementInFlightRef.current = false;
    captureEnhancementTokenRef.current += 1;
    captureEnhancementPromiseRef.current = null;
    enhancementAttemptAtRef.current.clear();
    enhancementInFlightRef.current.clear();
    setCaptureProcessing(false);
    setInstruction(
      "Auto mode is on. Move slowly and keep one garment centered in the frame."
    );
    await startLiveSession(PHASES[0]);
    void startMicStreaming(true);
  }, [
    cameraPermission?.granted,
    closeStylistSession,
    requestCameraPermission,
    startLiveSession,
    startMicStreaming
  ]);

  const onFinalizeScan = useCallback(async () => {
    if (!capturedItems.length) {
      Alert.alert("Nothing captured yet", "Show at least one garment before finishing scan.");
      return;
    }

    setScanBusy(true);
    try {
      const frameNotes = capturedItems.map((item) => {
        return `${item.phase}:${item.category}:${item.color ?? "unknown"}:${item.style ?? "unknown"}`;
      });
      const result = await finalizeWardrobeScan(userId, frameNotes, idToken);
      setScanSummary(result.summary);
      setScanStarted(false);
      setActiveAgentSession((current) => (current === "scan" ? null : current));
      patchConciergeSession({
        handoffReason: "Wardrobe scan complete. The updated closet is ready for styling again.",
        currentGarmentId: null,
      });
      pendingItemRef.current = null;
      lockedSnippetRef.current = "";
      lockedImageRef.current = "";
      setPendingItem(null);
      signaledCaptureBase64Ref.current = "";
      signaledCaptureAtRef.current = 0;
      signaledCaptureEnhancedRef.current = false;
      captureEnhancementInFlightRef.current = false;
      captureEnhancementTokenRef.current += 1;
      captureEnhancementPromiseRef.current = null;
      enhancementAttemptAtRef.current.clear();
      enhancementInFlightRef.current.clear();
      setCaptureProcessing(false);
      await closeLiveSession();

      try {
        const wardrobe = await getWardrobeItems(userId, idToken);
        setCapturedItems(wardrobe);
      } catch {
        // keep in-memory items if reload fails
      }
      await refreshWishlist(userId, idToken);

      Alert.alert(
        "Wardrobe scan complete",
        `Captured items: ${capturedItems.length}\nGenerated wishlist: ${result.created_wishlist_items.length}\nGaps: ${result.gaps.join(", ") || "none"}`
      );
    } catch {
      Alert.alert("Finalize failed", "Could not finish wardrobe analysis.");
    } finally {
      setScanBusy(false);
    }
  }, [capturedItems, closeLiveSession, idToken, patchConciergeSession, refreshWishlist, userId]);

  const onStopScanSession = useCallback(async () => {
    setScanStarted(false);
    setActiveAgentSession((current) => (current === "scan" ? null : current));
    patchConciergeSession({
      handoffReason: "Wardrobe scan paused.",
      currentGarmentId: null,
    });
    setAutoCapture(false);
    pendingItemRef.current = null;
    lockedSnippetRef.current = "";
    lockedImageRef.current = "";
    setPendingItem(null);
    signaledCaptureBase64Ref.current = "";
    signaledCaptureAtRef.current = 0;
    signaledCaptureEnhancedRef.current = false;
    captureEnhancementInFlightRef.current = false;
    captureEnhancementTokenRef.current += 1;
    captureEnhancementPromiseRef.current = null;
    enhancementAttemptAtRef.current.clear();
    enhancementInFlightRef.current.clear();
    setCaptureProcessing(false);
    await closeLiveSession();
    try {
      const wardrobe = await getWardrobeItems(userId, idToken);
      setCapturedItems(wardrobe);
    } catch {
      // keep in-memory items if reload fails
    }
  }, [closeLiveSession, idToken, patchConciergeSession, userId]);

  const onDeleteClosetItem = useCallback(
    (item: WardrobeItem) => {
      const runDelete = async () => {
        try {
          setDeletingIds((prev) => new Set(prev).add(item.id));
          await deleteWardrobeItem(userId, item.id, idToken);
          setCapturedItems((current) => current.filter((row) => row.id !== item.id));
          setSelectedTryOnItemIds((current) => {
            const next = new Set(current);
            next.delete(item.id);
            return next;
          });
          setEnhancingIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          enhancementAttemptAtRef.current.delete(item.id);
          enhancementInFlightRef.current.delete(item.id);
          appendLiveLine("system", `Deleted item: ${item.title ?? item.category}.`);
        } catch (error) {
          console.warn("[closet] delete failed", error);
          Alert.alert("Delete failed", "Could not delete this item right now.");
        } finally {
          setDeletingIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }
      };

      const message = `Remove "${item.title ?? item.category}" from your closet?`;
      if (Platform.OS === "web") {
        const anyGlobal = globalThis as { confirm?: (text: string) => boolean };
        const confirmed = anyGlobal.confirm ? anyGlobal.confirm(message) : true;
        if (confirmed) {
          void runDelete();
        }
        return;
      }

      Alert.alert("Delete item", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void runDelete();
          }
        }
      ]);
    },
    [appendLiveLine, idToken, userId]
  );

  const onOpenClosetItem = useCallback((item: WardrobeItem) => {
    setEditingItem(item);
    setEditorDraft(toClosetEditorDraft(item));
  }, []);

  const onCloseClosetEditor = useCallback(() => {
    if (editorSaving) {
      return;
    }
    setEditingItem(null);
    setEditorDraft(null);
  }, [editorSaving]);

  const onSaveClosetEditor = useCallback(async () => {
    if (!editingItem || !editorDraft || editorSaving) {
      return;
    }
    const category = editorDraft.category.trim().toLowerCase();
    if (!category) {
      Alert.alert("Missing category", "Category is required.");
      return;
    }
    const phase = editorDraft.phase.trim().toLowerCase() || "auto";
    try {
      setEditorSaving(true);
      const updated = await updateWardrobeItem(
        userId,
        editingItem.id,
        {
          phase,
          category,
          title: editorDraft.title.trim() || undefined,
          color: editorDraft.color.trim().toLowerCase() || undefined,
          fabric_type: editorDraft.fabric_type.trim().toLowerCase() || undefined,
          style: editorDraft.style.trim().toLowerCase() || undefined,
          estimated_fit: editorDraft.estimated_fit.trim().toLowerCase() || undefined,
          condition: editorDraft.condition.trim().toLowerCase() || undefined,
          note: editorDraft.note.trim() || undefined,
        },
        idToken
      );
      setCapturedItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setEditingItem(updated);
      setEditorDraft(toClosetEditorDraft(updated));
      Alert.alert("Saved", "Item updated.");
    } catch {
      Alert.alert("Save failed", "Could not update this item.");
    } finally {
      setEditorSaving(false);
    }
  }, [editingItem, editorDraft, editorSaving, idToken, userId]);

  const onToggleTryOnItem = useCallback((itemId: string) => {
    setSelectedTryOnItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const onToggleDailyLogItem = useCallback((itemId: string) => {
    setDailyLogSelectionIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const onOpenCalendarLogModal = useCallback(
    (dateKey: string) => {
      const existing = wearLogs.find((entry) => entry.wear_log.date === dateKey);
      setCalendarLogDate(dateKey);
      setDailyLogSelectionIds(new Set(existing?.wear_log.item_ids || []));
      setCalendarLogCategoryTab("all");
      setCalendarLogColorFilter("all");
      setCalendarLogSearchQuery("");
      setCalendarLogModalVisible(true);
    },
    [wearLogs]
  );

  const onCloseCalendarLogModal = useCallback(() => {
    setCalendarLogModalVisible(false);
    setCalendarLogDate("");
    setDailyLogSelectionIds(new Set());
    setCalendarLogCategoryTab("all");
    setCalendarLogColorFilter("all");
    setCalendarLogSearchQuery("");
  }, []);

  const onLogTodaysOutfit = useCallback(async () => {
    if (dailyLogBusy) {
      return;
    }
    const selected = Array.from(dailyLogSelectionIds);
    if (!selected.length) {
      Alert.alert("Select items", "Choose at least one closet item to log today's outfit.");
      return;
    }
    try {
      setDailyLogBusy(true);
      const result = await logWardrobeOutfit(
        userId,
        {
          item_ids: selected,
          date: calendarLogDate || undefined,
        },
        idToken
      );
      const updatesById = new Map(result.updated_items.map((item) => [item.id, item]));
      setCapturedItems((current) =>
        current.map((item) => {
          const updated = updatesById.get(item.id);
          return updated ?? item;
        })
      );
      setDailyLogSelectionIds(new Set());
      setCalendarLogModalVisible(false);
      setCalendarLogDate("");
      await refreshWearLogs(userId, idToken);
      Alert.alert(
        "Outfit Logged",
        `Logged ${result.updated_count} item${result.updated_count === 1 ? "" : "s"} for ${result.wear_log.date}.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not log today's outfit.";
      Alert.alert("Log Failed", message);
    } finally {
      setDailyLogBusy(false);
    }
  }, [calendarLogDate, dailyLogBusy, dailyLogSelectionIds, idToken, refreshWearLogs, userId]);

  const onRunWardrobeOptimizer = useCallback(async () => {
    if (optimizerBusy) {
      return;
    }
    try {
      setOptimizerBusy(true);
      const result = await optimizeWardrobe(userId, idToken);
      setOptimizerResult(result);
      try {
        const wardrobe = await getWardrobeItems(userId, idToken);
        setCapturedItems(wardrobe);
      } catch {
        // keep current closet snapshot if refresh fails
      }
      await refreshWishlist(userId, idToken);
      await refreshWearLogs(userId, idToken);
      Alert.alert(
        "Optimizer Complete",
        `Flagged to sell: ${result.flagged_count}\nNew wishlist items: ${result.created_wishlist_items.length}\nGaps: ${result.gaps.join(", ") || "none"}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Optimizer failed.";
      Alert.alert("Optimizer Failed", message);
    } finally {
      setOptimizerBusy(false);
    }
  }, [idToken, optimizerBusy, refreshWearLogs, refreshWishlist, userId]);

  const onGenerateMarketplaceListing = useCallback(
    async (item: WardrobeItem) => {
      if (item.marketplace_listing) {
        setListingModal({
          itemId: item.id,
          itemTitle: item.title ?? item.category,
          listing: item.marketplace_listing,
        });
        return;
      }
      if (listingBusyIds.has(item.id)) {
        return;
      }
      setListingBusyIds((current) => {
        const next = new Set(current);
        next.add(item.id);
        return next;
      });
      try {
        const result = await generateMarketplaceListing(userId, item.id, idToken);
        setCapturedItems((current) =>
          current.map((row) =>
            row.id === item.id
              ? {
                  ...row,
                  marketplace_listing: result.listing,
                }
              : row
          )
        );
        setListingModal({
          itemId: item.id,
          itemTitle: item.title ?? item.category,
          listing: result.listing,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not generate listing.";
        Alert.alert("Listing failed", message);
      } finally {
        setListingBusyIds((current) => {
          const next = new Set(current);
          next.delete(item.id);
          return next;
        });
      }
    },
    [idToken, listingBusyIds, userId]
  );

  const onCopyMarketplaceListing = useCallback(async () => {
    if (!listingModal) {
      return;
    }
    const listing = listingModal.listing;
    const text = `${listing.title}\n\nPrice: ${formatUsd(Number(listing.suggested_price || 0))}\n\n${listing.description}`;
    try {
      const copied = await copyTextToClipboard(text);
      if (!copied) {
        Alert.alert(
          "Clipboard unavailable",
          "Clipboard access is unavailable in this runtime. You can still copy manually from this modal."
        );
        return;
      }
      Alert.alert("Copied", "Listing copied to clipboard.");
    } catch {
      Alert.alert("Copy failed", "Could not copy listing.");
    }
  }, [listingModal]);

  const onKeepMarketplaceItem = useCallback(async () => {
    if (!listingModal || listingKeepBusy) {
      return;
    }
    try {
      setListingKeepBusy(true);
      const updated = await updateWardrobeItem(
        userId,
        listingModal.itemId,
        {
          flagged_for_donation: false,
          last_worn_date: new Date().toISOString().slice(0, 10),
        },
        idToken
      );
      setCapturedItems((current) =>
        current.map((row) => (row.id === updated.id ? updated : row))
      );
      setListingModal(null);
      Alert.alert("Updated", "Item is kept and removed from sell alerts.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update item.";
      Alert.alert("Update failed", message);
    } finally {
      setListingKeepBusy(false);
    }
  }, [idToken, listingKeepBusy, listingModal, userId]);

  const {
    stylistSuggestedItems,
    shopSuggestedItems,
    conciergeRecentScanCards,
    conciergePendingScanCard,
    conciergeStylistClosetItems,
    conciergeWishlistItems,
    conciergeShopStores,
  } = useConciergeViewModels({
    capturedItems,
    pendingItem,
    stylistSuggestedItemIds,
    shopSuggestedItemIds,
    wishlistItems,
    shopPerimeterStores,
    resolveImageUri,
  });
  const stylistOverlayItems = useMemo(() => stylistSuggestedItems.slice(0, 5), [stylistSuggestedItems]);
  const stylistOverlayScale = window.width < 720 ? 0.64 : 1;
  const {
    homeStaleItems,
    homeDashboardStats,
    homeSummaryText,
    homeColorPulseEntries,
    homeColorPulseGradient,
    homeColorPulsePrimary,
    wearLogByDate,
    homeWeekCells,
  } = useHomeViewModels({
    capturedItems,
    wearLogs,
    optimizerResult,
    resolveColorSwatch,
    extractColorTokens,
  });
  const colorPulseSize = Math.min(138, Math.max(102, Math.floor(window.width * 0.26)));
  const homeSummaryOrbScale = homeSummaryPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.045],
  });
  const homeSummaryOrbGlowScale = homeSummaryPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.14],
  });
  const homeSummaryOrbGlowOpacity = homeSummaryPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.24, 0.48],
  });
  const { closetCategoryTabs, closetAvailableColors, closetVisibleSections } =
    useClosetViewModels({
      capturedItems,
      closetCategoryTab,
      closetSearchQuery,
      closetColorFilter,
      extractColorTokens,
    });
  const {
    calendarLogCategoryTabs,
    calendarLogAvailableColors,
    calendarLogVisibleSections,
    calendarLogSelectedItems,
  } = useCalendarLogViewModels({
    capturedItems,
    calendarLogCategoryTab,
    calendarLogSearchQuery,
    calendarLogColorFilter,
    dailyLogSelectionIds,
    extractColorTokens,
  });
  const listingModalItem = useMemo(() => {
    if (!listingModal) {
      return null;
    }
    return capturedItems.find((item) => item.id === listingModal.itemId) ?? null;
  }, [capturedItems, listingModal]);
  const { wishlistScoutCards } = useWishlistViewModels({
    optimizerResult,
    wishlistItems,
    wishlistDetailCard,
    shopStores,
    capturedItems,
    extractColorTokens,
  });

  const onUploadModelPhoto = useCallback(() => {
    if (stylePhotoSaving) {
      return;
    }
    if (Platform.OS !== "web") {
      Alert.alert("Not available", "Model photo upload is currently available on web.");
      return;
    }

    const anyGlobal = globalThis as any;
    const doc = anyGlobal.document;
    if (!doc?.createElement) {
      Alert.alert("Upload unavailable", "Could not open file picker in this environment.");
      return;
    }

    const input = doc.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const raw = typeof reader.result === "string" ? reader.result : "";
          const normalized = normalizeImagePayload(raw, "image/jpeg");
          if (!normalized.data) {
            throw new Error("image has no base64 payload");
          }
          setStylePhotoSaving(true);
          const profile = await upsertUserStylePhoto(
            userId,
            {
              image_base64: normalized.data,
              mime_type: normalized.mimeType,
            },
            idToken
          );
          applyStyleProfile(
            profile,
            setStyleProfilePhotoBase64,
            setStyleProfileUpdatedAt,
            setTryOnImageBase64
          );
          appendLiveLine("system", "[try-on] Model photo updated.");
        } catch (error) {
          console.warn("[try-on] model photo upload failed", error);
          Alert.alert("Upload failed", "Could not save your model photo.");
        } finally {
          setStylePhotoSaving(false);
        }
      };
      reader.onerror = () => {
        Alert.alert("Upload failed", "Could not read the selected image.");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [appendLiveLine, idToken, stylePhotoSaving, userId]);

  const onRunTryOn = useCallback(async () => {
    if (tryOnBusy) {
      return;
    }
    const selected = Array.from(selectedTryOnItemIds);
    if (!selected.length) {
      Alert.alert("Select items", "Choose at least one closet item for try-on.");
      return;
    }
    if (!hasModelPhoto) {
      Alert.alert("Add your photo", "Upload your model photo first.");
      return;
    }
    try {
      setTryOnBusy(true);
      appendLiveLine("system", `[try-on] Generating outfit preview for ${selected.length} item(s)...`);
      const result = await generateTryOn(
        userId,
        {
          item_ids: selected,
        },
        idToken
      );
      if (!result.generated || !result.image_base64) {
        throw new Error(result.error || "Try-on generation failed");
      }
      const normalized = normalizeImagePayload(result.image_base64, "image/png");
      if (!normalized.data) {
        throw new Error("Try-on response has no image");
      }
      setTryOnImageBase64(normalized.data);
      setTryOnModalVisible(true);
      setSelectedTryOnItemIds(new Set());
      appendLiveLine(
        "system",
        `[try-on] Ready. output_bytes=${normalized.data.length} items=${result.used_item_ids.length}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Try-on generation failed";
      console.warn("[try-on] generation failed", error);
      Alert.alert("Try-on failed", message);
    } finally {
      setTryOnBusy(false);
    }
  }, [appendLiveLine, hasModelPhoto, idToken, selectedTryOnItemIds, tryOnBusy, userId]);

  const onLaunchShopAssistant = useCallback(async () => {
    setShopAssistantActive(true);
    await startShopSession(shopSelectedStore);
  }, [shopSelectedStore, startShopSession]);

  const onLaunchShopAssistantForStore = useCallback(
    async (store: NearbyStore) => {
      setShopSelectedStoreId(store.id);
      setShopMapDirty(false);
      setShopMapCenter({ lat: store.lat, lng: store.lng });
      setShopAssistantActive(true);
      await startShopSession(store);
    },
    [startShopSession]
  );

  const ensureStylistConciergeSession = useCallback(
    async (reset = false) => {
      setStylistModalVisible(false);
      if (reset) {
        setStylistLines([]);
        setStylistSuggestedItemIds(new Set());
        setStylistExternalSuggestions([]);
        setStylistWebSearchQueries([]);
        setStylistWebResults([]);
      }
      try {
        const wardrobe = await getWardrobeItems(userId, idToken);
        setCapturedItems(wardrobe);
      } catch {
        // keep current list
      }
      if (stylistClientRef.current || stylistStatus === "connecting") {
        return;
      }
      await startStylistSession();
    },
    [idToken, startStylistSession, stylistStatus, userId]
  );

  const prepareStylistSession = useCallback(async () => {
    await ensureStylistConciergeSession(true);
  }, [ensureStylistConciergeSession]);

  const onCloseShopAssistant = useCallback(async () => {
    await closeShopSession();
    setShopAssistantActive(false);
    setActiveAgentSession((current) => (current === "shop" ? null : current));
    patchConciergeSession((current) => ({
      activeStoreId: current.activeMode === "shop" ? null : current.activeStoreId,
    }));
  }, [closeShopSession, patchConciergeSession]);

  const onToggleShopMic = useCallback(() => {
    if (shopMicStreaming) {
      void stopShopMicStreaming();
      return;
    }
    void startShopMicStreaming();
  }, [shopMicStreaming, startShopMicStreaming, stopShopMicStreaming]);

  const onOpenStylistChat = useCallback(async () => {
    setStylistModalVisible(true);
    await prepareStylistSession();
  }, [prepareStylistSession]);

  const onCloseStylistChat = useCallback(async () => {
    setStylistModalVisible(false);
    setActiveAgentSession((current) => (current === "stylist" ? null : current));
    await closeStylistSession();
  }, [closeStylistSession]);

  const onOpenStylistSuggestion = useCallback(async (url: string) => {
    const target = url.trim();
    if (!target) {
      return;
    }
    try {
      if (Platform.OS === "web") {
        const anyGlobal = globalThis as any;
        if (typeof anyGlobal.open === "function") {
          anyGlobal.open(target, "_blank", "noopener,noreferrer");
          return;
        }
      }
      await Linking.openURL(target);
    } catch {
      Alert.alert("Link unavailable", "Could not open this shopping link.");
    }
  }, []);

  const startConciergeRootSession = useCallback(async () => {
    await closeConciergeRootSession();
    setConciergeRootLines([]);
    setConciergeRootStatus("connecting");
    appendConciergeRootLine("system", "Connecting AI concierge...");
    appendConciergeRootLine("system", `Trying Live model ${LIVE_MODEL}...`);

    try {
      const token = await createLiveEphemeralToken(userId, idToken, {
        model: LIVE_MODEL,
        mode: "concierge",
        uses: 1,
        session_ttl_seconds: 1800,
        new_session_ttl_seconds: 300,
        enable_session_resumption: false,
      });
      const connectedModel = token.model || LIVE_MODEL;
      const conciergeClient = await createLiveTextClient({
        ephemeralToken: token.token,
        model: connectedModel,
        voiceName: "Zephyr",
        responseModalities: ["AUDIO"],
        onEvent: (event) => {
          if (event.includes("session open")) {
            setConciergeRootStatus("connected");
          }
          if (event.includes("session closed")) {
            setConciergeRootStatus("offline");
            conciergeClientRef.current = null;
            void stopConciergeRootMicStreaming();
            appendConciergeRootLine("system", event);
          }
          if (event.includes("error")) {
            setConciergeRootStatus("error");
            appendConciergeRootLine("system", event);
          }
        },
        onText: (text) => {
          appendConciergeRootLine("agent", feedbackFromLiveText(text));
        },
        onAudioChunk: (data, mimeType) => {
          void playConciergeRootAudioChunk(data, mimeType);
        },
        onToolCall: async (functionName, args) => {
          if (functionName === "set_session_goal") {
            const goal =
              typeof args.goal === "string" && args.goal.trim() ? args.goal.trim() : "";
            if (goal) {
              patchConciergeSession({
                sessionGoal: goal,
              });
              appendConciergeRootLine("system", `[goal] ${goal}`);
            }
            return { status: "ok", goal };
          }
          if (functionName === "route_to_specialist") {
            appendConciergeRootLine("system", `[route] ${JSON.stringify(args)}`);
            if (!handleRouteToolCallRef.current) {
              return { error: "Route handler unavailable" };
            }
            return handleRouteToolCallRef.current("concierge", args);
          }
          appendConciergeRootLine("system", `[tool] blocked ${functionName}`);
          return { error: "Unsupported tool in concierge mode" };
        },
      });
      conciergeClientRef.current = conciergeClient;
      setConciergeRootStatus("connected");
      setConciergeRootModelName(connectedModel);
      appendConciergeRootLine("system", `AI concierge connected on ${connectedModel}.`);
      void startConciergeRootMicStreaming(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setConciergeRootStatus("error");
      appendConciergeRootLine("system", `AI concierge unavailable. ${message}`);
    }
  }, [
    appendConciergeRootLine,
    closeConciergeRootSession,
    idToken,
    patchConciergeSession,
    playConciergeRootAudioChunk,
    startConciergeRootMicStreaming,
    stopConciergeRootMicStreaming,
    userId,
  ]);

  const onOpenWishlistAgent = useCallback(async () => {
    await openWishlistAgent();
  }, [openWishlistAgent]);

  const onCloseWishlistAgent = useCallback(async () => {
    setActiveAgentSession((current) => (current === "wishlist" ? null : current));
    await closeWishlistAgent();
  }, [closeWishlistAgent]);

  const stopSessionsForConciergeTransition = useCallback(
    async (targetMode: ConciergeSessionState["activeMode"]) => {
      if (targetMode !== "concierge") {
        await closeConciergeRootSession();
      }
      if (targetMode !== "scan") {
        setScanStarted(false);
        setAutoCapture(false);
        await closeLiveSession();
      }
      if (targetMode !== "stylist") {
        setStylistModalVisible(false);
        await closeStylistSession();
      }
      if (targetMode !== "wishlist") {
        setWishlistAgentModalVisible(false);
        await closeWishlistAgentSession();
      }
      if (targetMode !== "shop") {
        await closeShopSession();
        setShopAssistantActive(false);
      }
    },
    [
      closeConciergeRootSession,
      closeLiveSession,
      closeShopSession,
      closeStylistSession,
      closeWishlistAgentSession,
    ]
  );

  const activateConciergeMode = useCallback(
    async (
      mode: ConciergeSessionState["activeMode"],
      reason?: string,
      inputMode?: "camera" | "mic"
    ) => {
      const currentMode = conciergeSessionRef.current.activeMode;
      const route =
        mode === "concierge"
          ? null
          : buildConciergeRoute({
              currentMode: currentMode === "concierge" ? null : currentMode,
              targetMode: mode,
              reason,
            });

      const nextInputMode =
        inputMode || (mode === "scan" || mode === "shop" ? "camera" : "mic");

      setIsConciergeVisible(true);
      if (route?.reason) {
        appendConciergeTranscript(mode, "system", route.reason);
      }

      setActiveAgentSession(mode === "concierge" ? null : mode);
      patchConciergeSession((current) => ({
        previousMode: current.activeMode !== mode ? current.activeMode : current.previousMode,
        activeMode: mode,
        handoffReason:
          mode === "concierge"
            ? reason || "The concierge is listening for what you want to do next."
            : route?.reason || current.handoffReason,
        currentInputMode: nextInputMode,
        activeStoreId: mode === "shop" ? shopSelectedStore?.id || current.activeStoreId : current.activeStoreId,
        activeCity: shopDirectoryCity || current.activeCity,
      }));

      await stopSessionsForConciergeTransition(mode);

      if (mode === "concierge") {
        await startConciergeRootSession();
        return;
      }
      if (mode === "scan") {
        setActiveTab("home");
        await onStartScan();
        return;
      }
      if (mode === "shop") {
        setActiveTab("shop");
        setShopAssistantActive(true);
        await startShopSession(shopSelectedStore);
        return;
      }
      if (mode === "stylist") {
        await ensureStylistConciergeSession(!stylistLines.length);
        return;
      }
      setWishlistAgentModalVisible(false);
      await ensureWishlistConciergeSession(!wishlistAgentLines.length);
    },
    [
      appendConciergeTranscript,
      ensureStylistConciergeSession,
      ensureWishlistConciergeSession,
      onStartScan,
      patchConciergeSession,
      shopDirectoryCity,
      shopSelectedStore,
      startConciergeRootSession,
      startShopSession,
      stopSessionsForConciergeTransition,
      stylistLines.length,
      wishlistAgentLines.length,
    ]
  );

  const handleRouteToolCall = useCallback(
    async (
      sourceMode: "concierge" | AgentMode,
      args: Record<string, unknown>
    ): Promise<Record<string, unknown>> => {
      const rawTarget = String(args.target_mode || "").trim().toLowerCase();
      const targetMode: AgentMode | null =
        rawTarget === "scan" || rawTarget === "stylist" || rawTarget === "wishlist" || rawTarget === "shop"
          ? rawTarget
          : null;
      if (!targetMode) {
        return { error: "Invalid target_mode" };
      }
      const reason =
        typeof args.reason === "string" && args.reason.trim()
          ? args.reason.trim()
          : `Routing from ${sourceMode} to ${targetMode}.`;
      const uiMode =
        typeof args.ui_mode === "string" && args.ui_mode.trim().toLowerCase() === "camera"
          ? "camera"
          : "mic";
      const handoff = createPendingHandoff(sourceMode, targetMode, args);
      consumedHandoffIdRef.current = "";
      patchConciergeSession({
        pendingHandoff: handoff,
        lastUserUtterance: handoff.triggerUtterance || conciergeSessionRef.current.lastUserUtterance,
      });
      await activateConciergeMode(targetMode, reason, uiMode);
      return {
        status: "ok",
        routed_to: targetMode,
        ui_mode: uiMode,
        handoff_id: handoff.id,
      };
    },
    [activateConciergeMode, createPendingHandoff, patchConciergeSession]
  );

  useEffect(() => {
    handleRouteToolCallRef.current = handleRouteToolCall;
  }, [handleRouteToolCall]);

  const onCloseConcierge = useCallback(async () => {
    setIsConciergeVisible(false);
    if (conciergeSession.activeMode === "concierge") {
      await closeConciergeRootSession();
      return;
    }
    if (activeAgentSession === "scan") {
      await closeLiveSession();
      setScanStarted(false);
      setActiveAgentSession(null);
      return;
    }
    if (activeAgentSession === "shop") {
      setShopAssistantActive(false);
      setActiveAgentSession(null);
      await closeShopSession();
      return;
    }
    if (activeAgentSession === "stylist" && !stylistModalVisible) {
      setActiveAgentSession(null);
      await closeStylistSession();
      return;
    }
    if (activeAgentSession === "wishlist" && !wishlistAgentModalVisible) {
      setActiveAgentSession(null);
      await closeWishlistAgentSession();
    }
  }, [
    activeAgentSession,
    closeLiveSession,
    closeShopSession,
    conciergeSession.activeMode,
    closeConciergeRootSession,
    closeStylistSession,
    closeWishlistAgentSession,
    stylistModalVisible,
    wishlistAgentModalVisible,
  ]);

  const onStartConciergeFromPortal = useCallback(() => {
    setIsPortalVisible(false);
    consumedHandoffIdRef.current = "";
    setConciergeSession({
      activeMode: "concierge",
      previousMode: null,
      sessionGoal: null,
      handoffReason: "The concierge is listening for what you want to do next.",
      currentInputMode: "mic",
      currentGarmentId: null,
      selectedClosetItemIds: [],
      recentWishlistItemIds: [],
      activeStoreId: null,
      activeCity: conciergeSessionRef.current.activeCity,
      recentWebResults: [],
      lastUserUtterance: null,
      pendingHandoff: null,
      transcriptThread: [],
    });
    void activateConciergeMode(
      "concierge",
      "The concierge is listening for what you want to do next.",
      "mic"
    );
  }, [activateConciergeMode]);

  const onLaunchAgentFromPortal = useCallback(
    async (mode: AgentMode) => {
      setIsPortalVisible(false);
      consumedHandoffIdRef.current = "";
      setActiveAgentSession(mode);
      patchConciergeSession((current) => ({
        previousMode: current.activeMode !== mode ? current.activeMode : current.previousMode,
        activeMode: mode,
        handoffReason: buildConciergeRoute({
          currentMode: current.activeMode,
          targetMode: mode,
        }).reason,
        pendingHandoff: null,
      }));
      await stopSessionsForConciergeTransition(mode);
      if (mode === "scan") {
        await onStartScan();
        return;
      }
      if (mode === "stylist") {
        await onOpenStylistChat();
        return;
      }
      if (mode === "wishlist") {
        await onOpenWishlistAgent();
        return;
      }
      await onLaunchShopAssistant();
    },
    [
      onLaunchShopAssistant,
      onOpenStylistChat,
      onOpenWishlistAgent,
      onStartScan,
      patchConciergeSession,
      stopSessionsForConciergeTransition,
    ]
  );


  const onAddWishlistItemManually = useCallback(async () => {
    if (wishlistFormBusy) {
      return;
    }
    const category = wishlistFormCategory.trim();
    const color = wishlistFormColor.trim();
    const notes = wishlistFormNotes.trim();
    if (!category) {
      Alert.alert("Category required", "Please enter an item category.");
      return;
    }
    try {
      setWishlistFormBusy(true);
      const saved = await upsertWishlistItem(
        userId,
        {
          category,
          color: color || undefined,
          notes: notes || undefined,
        },
        idToken
      );
      setWishlistItems((current) => {
        const existingIndex = current.findIndex((item) => item.id === saved.id);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = saved;
          return next;
        }
        return [saved, ...current];
      });
      setWishlistFormCategory("");
      setWishlistFormColor("");
      setWishlistFormNotes("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save wishlist item.";
      Alert.alert("Save failed", message);
    } finally {
      setWishlistFormBusy(false);
    }
  }, [idToken, userId, wishlistFormBusy, wishlistFormCategory, wishlistFormColor, wishlistFormNotes]);

  const onDeleteWishlistItem = useCallback(
    async (item: WishlistItem) => {
      if (wishlistDeletingIds.has(item.id)) {
        return;
      }
      setWishlistDeletingIds((current) => {
        const next = new Set(current);
        next.add(item.id);
        return next;
      });
      try {
        await deleteWishlistItem(userId, item.id, idToken);
        setWishlistItems((current) => current.filter((row) => row.id !== item.id));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not delete wishlist item.";
        Alert.alert("Delete failed", message);
        try {
          await refreshWishlist(userId, idToken);
        } catch {
          // keep current state if refresh fails
        }
      } finally {
        setWishlistDeletingIds((current) => {
          const next = new Set(current);
          next.delete(item.id);
          return next;
        });
      }
    },
    [idToken, refreshWishlist, userId, wishlistDeletingIds]
  );
  const clearShopMatchMode = useCallback(() => {
    setShopMatchMode(false);
    setShopMatchLoading(false);
    setShopMatchedStores([]);
    setShopMatchedWishlistCard(null);
    setShopStoresError("");
  }, []);
  const onWishlistFindNearby = useCallback(
    async (item: WishlistScoutCard) => {
      if (!userId || shopMatchLoading) {
        return;
      }
      setWishlistDetailCard(null);
      setActiveTab("shop");
      setShopStoresError("");
      setShopSearchQuery("");
      setShopMatchLoading(true);
      try {
        let wishlistItemId = item.id;
        if (item.id.startsWith("ai-gap-")) {
          const saved = await upsertWishlistItem(
            userId,
            {
              category: item.category,
              color: item.color,
              notes: item.notes,
              is_ai_suggested: true,
              reasoning: item.reasoning,
              inspiration_image_url: item.inspirationImageUrl,
            },
            idToken
          );
          wishlistItemId = saved.id;
          setWishlistItems((current) => {
            const withoutDuplicate = current.filter((row) => row.id !== saved.id);
            return [saved, ...withoutDuplicate];
          });
        }
        const coords =
          shopMapCenterRef.current || shopLocation || (await requestShopCoordinates());
        if (!coords) {
          throw new Error("Location is required to scout nearby stores.");
        }
        setShopFavoritesOnly(false);
        const matched = await matchWishlistItemToNearbyShops(userId, wishlistItemId, {
          lat: coords.lat,
          lng: coords.lng,
          radiusMeters: Math.max(12000, shopSearchRadiusForZoom(shopMapZoomRef.current)),
          limit: 5,
          idToken,
        });
        setShopMatchedWishlistCard(item);
        setShopMatchedStores(matched);
        setShopMatchMode(true);
        if (matched[0]) {
          setShopSelectedStoreId(matched[0].id);
          setShopMapDirty(false);
          setShopMapCenter({ lat: matched[0].lat, lng: matched[0].lng });
        } else {
          setShopSelectedStoreId("");
          setShopStoresError("No strong nearby store matches for this wishlist item yet.");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not scout nearby stores for this item.";
        console.error("[shop-map][match] wishlist scout failed", error);
        setShopStoresError(message);
        setShopMatchMode(false);
        setShopMatchedStores([]);
        setShopMatchedWishlistCard(null);
      } finally {
        setShopMatchLoading(false);
      }
    },
    [idToken, requestShopCoordinates, shopLocation, shopMatchLoading, userId]
  );

  const onCloseFirstRunTutorial = useCallback(() => {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.setItem(FIRST_RUN_TUTORIAL_STORAGE_KEY, "seen");
      } catch {}
    }
    setFirstRunTutorialVisible(false);
  }, []);

  return (
    <AuroraBackground mode={(activeAgentSession as AuroraMode) || "default"}>
      <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        {authLoading ? (
          <View style={styles.headerRowCompact}>
            <ActivityIndicator color={C.accent} />
          </View>
        ) : null}

        <ActiveTabContent
          activeTab={activeTab}
          styles={styles}
          homeTabProps={{
            styles,
            AnimatedPressableComponent: AnimatedPressable,
            colorPulseSize,
            homeSummaryOrbGlowOpacity,
            homeSummaryOrbGlowScale,
            homeSummaryOrbScale,
            homeColorPulseGradient,
            homeColorPulsePrimary,
            homeColorPulseEntries,
            homeSummaryText,
            homeDashboardStats,
            homeWeekCells,
            wearLogByDate,
            resolveColorSwatch,
            resolveImageUri,
            onOpenCalendarLogModal,
            optimizerBusy,
            onRunWardrobeOptimizer,
            optimizerResult,
            homeStaleItems,
            listingBusyIds,
            onGenerateMarketplaceListing,
          }}
          closetTabProps={{
            styles,
            AnimatedPressableComponent: AnimatedPressable,
            scanSummary,
            styleProfilePhotoBase64,
            resolveImageUri,
            stylePhotoSaving,
            onUploadModelPhoto,
            selectedTryOnCount,
            hasModelPhoto,
            tryOnBusy,
            onRunTryOn,
            tryOnPreviewSlots,
            onOpenStylistChat,
            capturedItems,
            closetSearchQuery,
            setClosetSearchQuery,
            placeholderTextColor: C.textTertiary,
            closetCategoryTabs,
            closetCategoryTab,
            setClosetCategoryTab,
            setClosetColorFilter,
            closetAvailableColors,
            closetColorFilter,
            resolveColorSwatch,
            closetVisibleSections,
            selectedTryOnItemIds,
            onToggleTryOnItem,
            deletingIds,
            onDeleteClosetItem,
            onOpenClosetItem,
            enhancingIds,
            accentColor: C.accent,
          }}
          wishlistTabProps={{
            styles,
            placeholderTextColor: C.textTertiary,
            AnimatedPressableComponent: AnimatedPressable,
            WishlistVisualPreviewComponent: WishlistVisualPreview,
            wishlistViewMode,
            setWishlistViewMode,
            wishlistFormCategory,
            setWishlistFormCategory,
            wishlistFormColor,
            setWishlistFormColor,
            wishlistFormNotes,
            setWishlistFormNotes,
            wishlistFormBusy,
            onAddWishlistItemManually,
            onOpenWishlistAgent,
            wishlistScoutCards,
            wishlistItems,
            wishlistDeletingIds,
            setWishlistDetailCard,
            onDeleteWishlistItem,
            onWishlistFindNearby,
          }}
          shopDashboardProps={{
            styles,
            cameraRef,
            shopAssistantActive,
            shopStatus,
            shopStatusLabel: statusLabel(shopStatus),
            shopSuggestedItems,
            shopMicStreaming,
            shopSpeakerEnabled,
            shopSelectedStore,
            shopSelectedStoreId,
            shopPerimeterStores,
            shopFavoriteBusyIds,
            shopFavoriteStoresCount: shopFavoriteStores.length,
            shopFavoritesOnly,
            shopMatchMode,
            shopMatchLoading,
            shopStoresLoading,
            shopStoresError,
            shopBrowseMode,
            shopDirectoryCityDraft,
            shopDirectoryCity,
            shopDirectoryRefreshBusy,
            shopSearchQuery,
            shopNeedsSearchAreaRefresh,
            shopGeoPermission,
            shopStaticMapUrl,
            shopOverlayMarkers,
            shopMapCenter,
            shopLocation,
            shopMapZoom,
            shopDragAnim,
            shopZoomScaleAnim,
            shopScoutHeadline,
            shopCarouselCardWidth,
            shopCarouselRef,
            resolveImageUri,
            onCloseShopAssistant: () => void onCloseShopAssistant(),
            onStartAssistant: () => void startShopSession(shopSelectedStore),
            onToggleMic: onToggleShopMic,
            onToggleSpeaker: () => setShopSpeakerEnabled((value) => !value),
            onShopMapLayout,
            onShopStaticMapLoad,
            onShopStaticMapError,
            onShopMapSelectStore,
            onShopMapDragStart,
            onShopMapDragMove,
            onShopMapDragEnd: () => void onShopMapDragEnd(),
            onShopMapWheel,
            onShopNativeViewportChange,
            onBackToMap: clearShopMatchMode,
            onToggleFavorites: () => setShopFavoritesOnly((value) => !value),
            onPrimaryTopAction: () => {
              if (shopMatchMode && shopMatchedWishlistCard) {
                void onWishlistFindNearby(shopMatchedWishlistCard);
                return;
              }
              void refreshShopDashboard(true);
            },
            primaryTopActionLabel:
              shopMatchMode ? "Rescout" : shopBrowseMode === "directory" ? "Use Nearby" : "Refresh",
            onChangeDirectoryCity: setShopDirectoryCityDraft,
            onLoadDirectory: () => void loadShopDirectory(),
            onRefreshDirectory: () => void refreshShopDirectorySnapshot(),
            onChangeSearchQuery: setShopSearchQuery,
            onClearSearchQuery: () => setShopSearchQuery(""),
            onSearchThisArea: () => void refreshShopDashboard(false, shopMapCenter || undefined),
            onLaunchAssistantForStore: (store) => void onLaunchShopAssistantForStore(store),
            onToggleFavoriteStore: (store) => void toggleFavoriteShopStore(store),
            onOpenStoreInMaps: (store) => void openStoreInMaps(store),
            onMomentumScrollEnd: onShopCarouselMomentumEnd,
          }}
        />

        <AppOverlays
          portalProps={{
            visible: isPortalVisible,
            onClose: () => setIsPortalVisible(false),
            onStartConcierge: onStartConciergeFromPortal,
            onSelect: (mode) => void onLaunchAgentFromPortal(mode),
          }}
          conciergeProps={{
            visible: isConciergeVisible,
            session: conciergeSession,
            onClose: () => {
              void onCloseConcierge();
            },
            onOpenStylistLink: (url) => void onOpenStylistSuggestion(url),
            onToggleRootMic: () => {
              if (conciergeRootMicStreaming) {
                void stopConciergeRootMicStreaming();
                return;
              }
              void startConciergeRootMicStreaming();
            },
            onToggleRootSpeaker: () => setConciergeRootSpeakerEnabled((value) => !value),
            onReconnectRoot: () => void startConciergeRootSession(),
            onToggleStylistMic: () => {
              if (stylistMicStreaming) {
                void stopStylistMicStreaming();
                return;
              }
              void startStylistMicStreaming();
            },
            onToggleStylistSpeaker: () => setStylistSpeakerEnabled((value) => !value),
            onReconnectStylist: () => void startStylistSession(),
            onToggleWishlistMic: () => {
              if (wishlistAgentMicStreaming) {
                void stopWishlistAgentMicStreaming();
                return;
              }
              void startWishlistAgentMicStreaming();
            },
            onToggleWishlistSpeaker: () => setWishlistAgentSpeakerEnabled((value) => !value),
            onReconnectWishlist: () => void startWishlistAgentSession(),
            cameraPermissionGranted: Boolean(cameraPermission?.granted),
            shopTryOnVisible: shopTryOnModalVisible && activeAgentSession === "shop",
            shopTryOnImageUri: resolveImageUri(shopTryOnImageBase64) || undefined,
            onCloseShopTryOn: () => setShopTryOnModalVisible(false),
            root: {
              statusLabel: statusLabel(conciergeRootStatus),
              latestLine: latestConciergeRootLine,
              micActive: conciergeRootMicStreaming,
              speakerEnabled: conciergeRootSpeakerEnabled,
              canToggleMic: conciergeRootStatus === "connected",
            },
            scan: {
              active: scanStarted || activeAgentSession === "scan",
              statusLabel: statusLabel(liveStatus),
              capturedCount: capturedItems.length,
              latestFeedback: latestFeedback || latestScanLine || instruction,
              pendingCard: conciergePendingScanCard,
              recentCards: conciergeRecentScanCards,
            },
            stylist: {
              active: stylistModalVisible || activeAgentSession === "stylist",
              statusLabel: statusLabel(stylistStatus),
              suggestedCount: stylistExternalSuggestions.length,
              webResultCount: stylistWebResults.length,
              latestLine: latestStylistLine,
              closetItems: conciergeStylistClosetItems,
              suggestions: stylistExternalSuggestions.map((suggestion) => ({
                id: `${suggestion.slot}-${suggestion.url}`,
                title: suggestion.aestheticGoal || suggestion.title,
                detail: [
                  suggestion.title ? `${suggestion.slot || "item"} target: ${suggestion.title}` : "",
                  suggestion.aestheticMatch || "",
                  suggestion.searchQueries?.[0] || suggestion.url,
                ]
                  .filter(Boolean)
                  .join(" • "),
                url: suggestion.url,
              })),
              webResults: stylistWebResults.map((result) => ({
                id: result.url,
                title: result.title,
                detail: result.domain || result.url,
                url: result.url,
              })),
              micActive: stylistMicStreaming,
              speakerEnabled: stylistSpeakerEnabled,
              canToggleMic: stylistStatus === "connected",
            },
            wishlist: {
              active: wishlistAgentModalVisible || activeAgentSession === "wishlist",
              statusLabel: statusLabel(wishlistAgentStatus),
              itemCount: wishlistItems.length,
              latestLine:
                wishlistItems[0]
                  ? `Latest item: ${wishlistItems[0].color ? `${wishlistItems[0].color} ` : ""}${wishlistItems[0].category}`
                  : "Use this when you want to save missing items quickly.",
              items: conciergeWishlistItems,
              micActive: wishlistAgentMicStreaming,
              speakerEnabled: wishlistAgentSpeakerEnabled,
              canToggleMic: wishlistAgentStatus === "connected",
            },
            shop: {
              active: shopAssistantActive || activeAgentSession === "shop",
              statusLabel: statusLabel(shopStatus),
              browseModeLabel: shopBrowseMode === "directory" ? "city directory" : "nearby live search",
              selectedStoreName: shopSelectedStore?.name || undefined,
              visibleStoreCount: shopPerimeterStores.length,
              latestLine: latestShopLine || shopScoutHeadline.body,
              stores: conciergeShopStores,
            },
          }}
          tutorialProps={{
            visible: firstRunTutorialVisible && !authLoading,
            onClose: onCloseFirstRunTutorial,
          }}
          bottomNavProps={{
            activeTab,
            onTabPress: setActiveTab,
            onPortalPress: onStartConciergeFromPortal,
            activeAgentSession,
          }}
          modalsProps={{
            styles,
            cameraRef,
            scanStarted,
            onStopScanSession,
            captureProcessing,
            capturedItems,
            liveStatus,
            latestFeedback,
            instruction,
            pendingItem,
            resolveImageUri,
            isLiveCardReady,
            lastCapture,
            LIVE_CARD_FIELDS,
            hasMeaningfulCardValue,
            micStreaming,
            stopMicStreaming,
            startMicStreaming,
            speakerEnabled,
            setSpeakerEnabled,
            scanBusy,
            onFinalizeScan,
            editingItem,
            editorDraft,
            onCloseClosetEditor,
            editorSaving,
            useSideBySideEditor,
            setEditorDraft,
            placeholderTextColor: C.textTertiary,
            onSaveClosetEditor,
            tryOnModalVisible,
            setTryOnModalVisible,
            tryOnImageBase64,
            shopTryOnModalVisible,
            isConciergeVisible,
            setShopTryOnModalVisible,
            shopTryOnImageBase64,
            calendarLogModalVisible,
            onCloseCalendarLogModal,
            calendarLogDate,
            calendarLogSelectedItems,
            onToggleDailyLogItem,
            calendarLogSearchQuery,
            setCalendarLogSearchQuery,
            calendarLogCategoryTabs,
            calendarLogCategoryTab,
            setCalendarLogCategoryTab,
            setCalendarLogColorFilter,
            calendarLogAvailableColors,
            calendarLogColorFilter,
            resolveColorSwatch,
            calendarLogVisibleSections,
            dailyLogSelectionIds,
            dailyLogBusy,
            onLogTodaysOutfit,
            listingModal,
            setListingModal,
            listingModalItem,
            formatUsd,
            onCopyMarketplaceListing,
            listingKeepBusy,
            onKeepMarketplaceItem,
            wishlistDetailCard,
            setWishlistDetailCard,
            WishlistVisualPreviewComponent: WishlistVisualPreview,
            onWishlistFindNearby,
            stylistModalVisible,
            onCloseStylistChat,
            stylistVoiceBreathAnim,
            stylistSpeechAnim,
            stylistStatus,
            stylistOverlayItems,
            STYLIST_CARD_POSITIONS,
            stylistOverlayScale,
            stylistExternalSuggestions,
            onOpenStylistSuggestion,
            stylistWebResults,
            stylistWebSearchQueries,
            stylistMicStreaming,
            stopStylistMicStreaming,
            startStylistMicStreaming,
            setStylistSpeakerEnabled,
            stylistSpeakerEnabled,
            startStylistSession,
            wishlistAgentModalVisible,
            onCloseWishlistAgent,
            wishlistVoiceBreathAnim,
            wishlistSpeechAnim,
            wishlistAgentStatus,
            wishlistAgentMicStreaming,
            stopWishlistAgentMicStreaming,
            startWishlistAgentMicStreaming,
            setWishlistAgentSpeakerEnabled,
            wishlistAgentSpeakerEnabled,
            startWishlistAgentSession,
          }}
          AnimatedPressableComponent={AnimatedPressable}
          showClosetScanFab={activeTab === "closet"}
          closetScanFabStyle={styles.closetScanFab}
          closetScanFabTextStyle={styles.closetScanFabText}
          onClosetScanPress={() => {
            void onStartScan();
          }}
        />


      </View>
    </SafeAreaView>
    </AuroraBackground>
  );
}

