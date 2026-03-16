import type { NearbyStore } from "../../types";
import type { ShopCoords, ShopMapSize } from "../types";
import {
  estimateDistanceMeters,
  projectShopMarkerToMap,
  shopSearchRadiusForZoom,
} from "./geo";
import { sustainabilityBand } from "./sustainability";

export function filterShopStoresByQuery(stores: NearbyStore[], query: string): NearbyStore[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return stores;
  }
  return stores.filter((store) => {
    const haystack = [
      store.name,
      store.category,
      store.address,
      store.match_reason,
      store.ai_evaluation?.vibe_check,
      ...(store.ai_evaluation?.best_for || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function filterShopStoresByViewport(
  stores: NearbyStore[],
  input: {
    mapCenter: ShopCoords | null;
    fallbackCenter: ShopCoords | null;
    zoom: number;
  }
): NearbyStore[] {
  const center = input.mapCenter || input.fallbackCenter;
  if (!center) {
    return stores;
  }
  const radiusMeters = shopSearchRadiusForZoom(input.zoom);
  return stores.filter((store) => {
    const distance =
      typeof store.distance_meters === "number" && input.mapCenter == null
        ? store.distance_meters
        : estimateDistanceMeters(center, { lat: store.lat, lng: store.lng });
    return distance <= radiusMeters * 1.05;
  });
}

export function buildShopStaticMapUrl(input: {
  apiKey: string;
  mapCenter: ShopCoords | null;
  fallbackCenter: ShopCoords | null;
  zoom: number;
  stores: NearbyStore[];
  selectedStore: NearbyStore | null;
  maxMarkers: number;
}): string {
  if (!input.apiKey) {
    return "";
  }
  const focus = input.mapCenter || input.selectedStore || input.fallbackCenter;
  if (!focus) {
    return "";
  }
  const center = `${focus.lat},${focus.lng}`;
  const buckets: Record<"high" | "mid" | "low", string[]> = {
    high: [],
    mid: [],
    low: [],
  };
  for (const store of input.stores.slice(0, input.maxMarkers)) {
    buckets[sustainabilityBand(store.ai_evaluation?.sustainability_score, store)].push(
      `${store.lat},${store.lng}`
    );
  }
  const markerParts: string[] = [];
  if (buckets.high.length) {
    markerParts.push(`&markers=color:0x2E7D32|${encodeURIComponent(buckets.high.join("|"))}`);
  }
  if (buckets.mid.length) {
    markerParts.push(`&markers=color:0xF59E0B|${encodeURIComponent(buckets.mid.join("|"))}`);
  }
  if (buckets.low.length) {
    markerParts.push(`&markers=color:0xDC2626|${encodeURIComponent(buckets.low.join("|"))}`);
  }
  if (input.selectedStore) {
    markerParts.push(
      `&markers=color:0x1D4ED8|size:mid|${encodeURIComponent(
        `${input.selectedStore.lat},${input.selectedStore.lng}`
      )}`
    );
  }
  return (
    `https://maps.googleapis.com/maps/api/staticmap?size=1200x700&scale=2&zoom=${input.zoom}` +
    `&center=${encodeURIComponent(center)}` +
    `${markerParts.join("")}` +
    `&key=${encodeURIComponent(input.apiKey)}`
  );
}

export function projectShopOverlayMarkers(input: {
  mapCenter: ShopCoords | null;
  fallbackCenter: ShopCoords | null;
  size: ShopMapSize;
  zoom: number;
  stores: NearbyStore[];
  maxMarkers: number;
}): Array<{ store: NearbyStore; left: number; top: number; visible: boolean }> {
  const center = input.mapCenter || input.fallbackCenter;
  if (!center) {
    return [];
  }
  return input.stores
    .slice(0, input.maxMarkers)
    .map((store) => {
      const point = projectShopMarkerToMap(
        center,
        { lat: store.lat, lng: store.lng },
        input.size,
        input.zoom
      );
      return {
        store,
        ...point,
      };
    })
    .filter((row) => row.visible);
}

export function hasShopSearchAreaChange(input: {
  currentCenter: ShopCoords | null;
  loadedCenter: ShopCoords | null;
  currentZoom: number;
  loadedZoom: number;
}): boolean {
  if (!input.currentCenter || !input.loadedCenter) {
    return false;
  }
  const movementMeters = estimateDistanceMeters(input.loadedCenter, input.currentCenter);
  const movementThreshold = Math.max(1200, shopSearchRadiusForZoom(input.currentZoom) * 0.35);
  const zoomChanged = Math.abs(input.currentZoom - input.loadedZoom) >= 2;
  return movementMeters > movementThreshold || zoomChanged;
}
