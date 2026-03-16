import type { NearbyStore } from "../../types";

export function normalizeSustainabilityScore(score?: number): number {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function isCircularShopCategory(store?: Partial<NearbyStore> | null): boolean {
  if (!store) {
    return false;
  }
  const haystack = [store.category, ...(store.google_categories || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return [
    "thrift",
    "used clothing",
    "secondhand",
    "consignment",
    "vintage",
    "charity shop",
    "resale",
  ].some((token) => haystack.includes(token));
}

export function sustainabilityBand(
  score?: number,
  store?: Partial<NearbyStore> | null
): "high" | "mid" | "low" {
  if (isCircularShopCategory(store)) {
    return "high";
  }
  const normalized = normalizeSustainabilityScore(score);
  if (normalized >= 85) {
    return "high";
  }
  if (normalized >= 60) {
    return "mid";
  }
  return "low";
}
