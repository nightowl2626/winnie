import { useMemo } from "react";

import type {
  NearbyStore,
  WardrobeCostPerWearLeader,
  WardrobeItem,
  WardrobeOptimizeResult,
  WardrobeStats,
  WearLogEntry,
  WishlistItem,
  WishlistScoutCard,
} from "../types";

const LOG_CATEGORY_ORDER = ["tops", "bottoms", "outerwear", "formalwear", "shoes", "other"] as const;

type ResolveImageUri = (
  primaryBase64?: string,
  secondaryBase64?: string,
  imageUrl?: string
) => string | undefined;

function sortLogCategory(category?: string): number {
  const normalized = (category || "").trim().toLowerCase();
  const index = LOG_CATEGORY_ORDER.indexOf(normalized as (typeof LOG_CATEGORY_ORDER)[number]);
  return index >= 0 ? index : LOG_CATEGORY_ORDER.length;
}

function computeWearLogStreak(logs: WearLogEntry[]): number {
  if (!logs.length) {
    return 0;
  }
  const ordered = [...new Set(logs.map((entry) => entry.wear_log.date).filter(Boolean))].sort((a, b) =>
    b.localeCompare(a)
  );
  if (!ordered.length) {
    return 0;
  }
  let streak = 1;
  let previous = new Date(`${ordered[0]}T00:00:00`);
  for (const rawDate of ordered.slice(1)) {
    const current = new Date(`${rawDate}T00:00:00`);
    const diffDays = Math.round((previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays !== 1) {
      break;
    }
    streak += 1;
    previous = current;
  }
  return streak;
}

function buildWeekCells(anchorDate: Date): Date[] {
  const start = new Date(anchorDate);
  const startOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - startOffset);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const cell = new Date(start);
    cell.setDate(start.getDate() + index);
    return cell;
  });
}

function sortSectionItems(
  items: WardrobeItem[],
  extractColorTokens: (raw?: string) => string[]
): WardrobeItem[] {
  return [...items].sort((a, b) => {
    const colorA = extractColorTokens(a.color)[0] || a.color || "";
    const colorB = extractColorTokens(b.color)[0] || b.color || "";
    const colorDelta = colorA.localeCompare(colorB);
    if (colorDelta !== 0) {
      return colorDelta;
    }
    return (a.title || a.category || "").localeCompare(b.title || b.category || "");
  });
}

function groupClosetSections(
  capturedItems: WardrobeItem[],
  extractColorTokens: (raw?: string) => string[]
) {
  const grouped = new Map<string, WardrobeItem[]>();
  for (const item of capturedItems) {
    const category = (item.category || "other").trim().toLowerCase() || "other";
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(item);
  }
  return [...grouped.entries()]
    .sort((a, b) => {
      const categoryDelta = sortLogCategory(a[0]) - sortLogCategory(b[0]);
      if (categoryDelta !== 0) {
        return categoryDelta;
      }
      return a[0].localeCompare(b[0]);
    })
    .map(([category, items]) => ({
      category,
      items: sortSectionItems(items, extractColorTokens),
    }));
}

export function useConciergeViewModels(params: {
  capturedItems: WardrobeItem[];
  pendingItem: {
    title?: string;
    category?: string;
    color?: string;
    fabric_type?: string;
    style?: string;
    estimated_fit?: string;
    item_snippet_base64?: string;
    image_base64?: string;
  } | null;
  stylistSuggestedItemIds: Set<string>;
  shopSuggestedItemIds: Set<string>;
  wishlistItems: WishlistItem[];
  shopPerimeterStores: NearbyStore[];
  resolveImageUri: ResolveImageUri;
}) {
  const stylistSuggestedItems = useMemo(() => {
    if (!params.stylistSuggestedItemIds.size) {
      return [] as WardrobeItem[];
    }
    const byId = new Map(params.capturedItems.map((item) => [item.id, item]));
    const ordered: WardrobeItem[] = [];
    params.stylistSuggestedItemIds.forEach((id) => {
      const found = byId.get(id);
      if (found) {
        ordered.push(found);
      }
    });
    return ordered;
  }, [params.capturedItems, params.stylistSuggestedItemIds]);

  const shopSuggestedItems = useMemo(() => {
    if (!params.shopSuggestedItemIds.size) {
      return [] as WardrobeItem[];
    }
    const byId = new Map(params.capturedItems.map((item) => [item.id, item]));
    const ordered: WardrobeItem[] = [];
    params.shopSuggestedItemIds.forEach((id) => {
      const found = byId.get(id);
      if (found) {
        ordered.push(found);
      }
    });
    return ordered;
  }, [params.capturedItems, params.shopSuggestedItemIds]);

  const conciergeRecentScanCards = useMemo(
    () =>
      params.capturedItems.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title || item.category || "Garment",
        subtitle: [item.color, item.fabric_type, item.style].filter(Boolean).join(" • ") || item.phase,
        imageUri: params.resolveImageUri(item.item_snippet_base64, item.image_base64, item.image_url),
      })),
    [params.capturedItems, params.resolveImageUri]
  );

  const conciergePendingScanCard = useMemo(
    () =>
      params.pendingItem
        ? {
            id: "pending",
            title: params.pendingItem.title || params.pendingItem.category || "Scanning garment",
            subtitle:
              [
                params.pendingItem.color,
                params.pendingItem.fabric_type,
                params.pendingItem.style,
                params.pendingItem.estimated_fit,
              ]
                .filter(Boolean)
                .join(" • ") || "Building wardrobe card",
            imageUri: params.resolveImageUri(
              params.pendingItem.item_snippet_base64,
              params.pendingItem.image_base64
            ),
          }
        : undefined,
    [params.pendingItem, params.resolveImageUri]
  );

  const conciergeStylistClosetItems = useMemo(
    () =>
      stylistSuggestedItems.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title || item.category || "Closet item",
        detail: [item.color, item.fabric_type, item.style].filter(Boolean).join(" • ") || item.phase,
        imageUri: params.resolveImageUri(item.item_snippet_base64, item.image_base64, item.image_url),
      })),
    [params.resolveImageUri, stylistSuggestedItems]
  );

  const conciergeWishlistItems = useMemo(
    () =>
      params.wishlistItems.slice(0, 4).map((item) => ({
        id: item.id,
        title: [item.color, item.category].filter(Boolean).join(" ") || item.category,
        detail: item.notes || item.reasoning || undefined,
      })),
    [params.wishlistItems]
  );

  const conciergeShopStores = useMemo(
    () =>
      params.shopPerimeterStores.slice(0, 3).map((store) => ({
        id: store.id,
        title: store.name,
        detail:
          store.match_reason ||
          store.ai_evaluation?.vibe_check ||
          [store.category, store.address].filter(Boolean).join(" • ") ||
          undefined,
      })),
    [params.shopPerimeterStores]
  );

  return {
    stylistSuggestedItems,
    shopSuggestedItems,
    conciergeRecentScanCards,
    conciergePendingScanCard,
    conciergeStylistClosetItems,
    conciergeWishlistItems,
    conciergeShopStores,
  };
}

export function useHomeViewModels(params: {
  capturedItems: WardrobeItem[];
  wearLogs: WearLogEntry[];
  optimizerResult: WardrobeOptimizeResult | null;
  resolveColorSwatch: (color: string) => { backgroundColor: string };
  extractColorTokens: (raw?: string) => string[];
}) {
  const homeColorStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of params.capturedItems) {
      const colors = params.extractColorTokens(item.color);
      const key = colors[0] || "multicolor";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [params.capturedItems, params.extractColorTokens]);

  const homeStaleItems = useMemo(() => {
    const nowMs = Date.now();
    const staleMs = 1000 * 60 * 60 * 24 * 180;
    return params.capturedItems.filter((item) => {
      if (item.flagged_for_donation) {
        return true;
      }
      if (!item.last_worn_date) {
        return Number(item.wear_count || 0) === 0;
      }
      const parsed = Date.parse(item.last_worn_date);
      if (Number.isNaN(parsed)) {
        return false;
      }
      return nowMs - parsed >= staleMs;
    });
  }, [params.capturedItems]);

  const homeDashboardStats = useMemo<WardrobeStats>(() => {
    if (params.optimizerResult?.stats) {
      return params.optimizerResult.stats;
    }
    const totalItems = params.capturedItems.length;
    const fallbackStreak = computeWearLogStreak(params.wearLogs);
    const dominantColors = homeColorStats.map(([color, count]) => ({
      color,
      count,
      percent: totalItems ? Math.round((count / totalItems) * 1000) / 10 : 0,
    }));
    const cpwLeaders: WardrobeCostPerWearLeader[] = params.capturedItems
      .filter((item) => Number(item.wear_count || 0) > 0)
      .map((item) => {
        const estimatedPrice =
          item.marketplace_listing?.suggested_price ||
          (item.category.includes("outer") ? 42 : item.category.includes("bottom") ? 28 : 20);
        return {
          item_id: item.id,
          title: item.title ?? item.category,
          category: item.category,
          color: item.color,
          image_url: item.image_url,
          item_snippet_base64: item.item_snippet_base64,
          estimated_price: estimatedPrice,
          cost_per_wear:
            Math.round((estimatedPrice / Math.max(1, Number(item.wear_count || 0))) * 100) / 100,
          wear_count: Number(item.wear_count || 0),
        };
      })
      .sort((a, b) => a.cost_per_wear - b.cost_per_wear)
      .slice(0, 5);
    return {
      utilization_rate:
        totalItems > 0 ? Math.round(((totalItems - homeStaleItems.length) / totalItems) * 1000) / 10 : 0,
      dominant_colors: dominantColors,
      cost_per_wear_leaders: cpwLeaders,
      sustainability_avg: 86,
      most_worn_categories: [],
      most_worn_colors: [],
      outfit_streak_days: fallbackStreak,
      ai_note: totalItems
        ? `Your closet is leaning ${dominantColors[0]?.color || "neutral"} right now.`
        : "Scan your first item to unlock advanced wardrobe insights.",
    };
  }, [params.capturedItems, homeColorStats, homeStaleItems.length, params.optimizerResult, params.wearLogs]);

  const homeSummaryText = useMemo(() => {
    if (!params.capturedItems.length) {
      return "Empty rail energy. Scan your first piece and let’s build the mood board.";
    }
    const anchorColor = homeDashboardStats.dominant_colors[0]?.color || "neutral";
    const secondColor = homeDashboardStats.dominant_colors[1]?.color;
    const expressiveColorCount = homeDashboardStats.dominant_colors.filter((entry) =>
      ["red", "orange", "yellow", "pink", "purple", "green", "blue"].includes(entry.color)
    ).length;
    const neutralColorCount = homeDashboardStats.dominant_colors.filter((entry) =>
      ["black", "white", "gray", "beige", "brown", "cream", "navy"].includes(entry.color)
    ).length;
    const streak = homeDashboardStats.outfit_streak_days;
    const utilization = homeDashboardStats.utilization_rate;
    const vibes =
      expressiveColorCount > neutralColorCount
        ? ["bold maximalist", "main character in a coming-of-age film", "walking mood ring"][
            params.capturedItems.length % 3
          ]
        : neutralColorCount >= 3
          ? ["quiet luxury enthusiast", "capsule wardrobe architect", "off-duty model core"][
              params.capturedItems.length % 3
            ]
          : ["effortlessly curated", "laid-back with range", "understated but never boring"][
              params.capturedItems.length % 3
            ];
    const palette = secondColor
      ? `${anchorColor} + ${secondColor} is your signature palette`
      : `${anchorColor} is running the show`;
    const streakLine =
      streak >= 7
        ? `${streak}-day streak? That’s dedication.`
        : streak >= 3
          ? `${streak} days logged — building momentum.`
          : "";
    const utilizationLine =
      utilization < 50
        ? "Half your closet is gathering dust — the optimizer has thoughts."
        : utilization < 75
          ? "Most pieces are earning their keep."
          : "Nearly everything is getting worn. Chef’s kiss.";
    const core = `${params.capturedItems.length} pieces deep and the vibe is ${vibes}. ${palette}.`;
    const extras = [streakLine, utilizationLine].filter(Boolean).join(" ");
    return extras ? `${core} ${extras}` : core;
  }, [params.capturedItems.length, homeDashboardStats]);

  const homeColorPulseEntries = useMemo(
    () => homeDashboardStats.dominant_colors.filter((entry) => entry.percent > 0).slice(0, 5),
    [homeDashboardStats.dominant_colors]
  );

  const homeColorPulseGradient = useMemo(() => {
    const normalized = homeColorPulseEntries
      .filter((entry) => entry.percent > 0)
      .map((entry) => ({ ...entry, percent: Math.max(0, entry.percent) }));
    if (!normalized.length) {
      return "conic-gradient(#EDE3D8 0deg 360deg)";
    }
    let cursor = 0;
    const stops = normalized.map((entry) => {
      const swatch = params.resolveColorSwatch(entry.color);
      const start = cursor;
      cursor += (entry.percent / 100) * 360;
      return `${swatch.backgroundColor} ${start}deg ${Math.min(360, cursor)}deg`;
    });
    if (cursor < 360) {
      stops.push(`#EDE3D8 ${cursor}deg 360deg`);
    }
    return `conic-gradient(${stops.join(", ")})`;
  }, [homeColorPulseEntries, params.resolveColorSwatch]);

  const homeColorPulsePrimary = useMemo(
    () => params.resolveColorSwatch(homeColorPulseEntries[0]?.color || "beige").backgroundColor,
    [homeColorPulseEntries, params.resolveColorSwatch]
  );

  const wearLogByDate = useMemo(
    () => new Map(params.wearLogs.map((entry) => [entry.wear_log.date, entry])),
    [params.wearLogs]
  );

  const homeWeekCells = useMemo(() => buildWeekCells(new Date()), []);

  return {
    homeColorStats,
    homeStaleItems,
    homeDashboardStats,
    homeSummaryText,
    homeColorPulseEntries,
    homeColorPulseGradient,
    homeColorPulsePrimary,
    wearLogByDate,
    homeWeekCells,
  };
}

export function useClosetViewModels(params: {
  capturedItems: WardrobeItem[];
  closetCategoryTab: string;
  closetSearchQuery: string;
  closetColorFilter: string;
  extractColorTokens: (raw?: string) => string[];
}) {
  const closetSections = useMemo(
    () => groupClosetSections(params.capturedItems, params.extractColorTokens),
    [params.capturedItems, params.extractColorTokens]
  );

  const closetCategoryTabs = useMemo(
    () => ["all", ...closetSections.map((section) => section.category)],
    [closetSections]
  );

  const closetBaseSections = useMemo(() => {
    const searchQuery = params.closetSearchQuery.trim().toLowerCase();
    return (params.closetCategoryTab === "all"
      ? closetSections
      : closetSections.filter((section) => section.category === params.closetCategoryTab)
    )
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!searchQuery) {
            return true;
          }
          const haystack = [item.title, item.category, item.color, item.fabric_type, item.style, item.note]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(searchQuery);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [closetSections, params.closetCategoryTab, params.closetSearchQuery]);

  const closetAvailableColors = useMemo(() => {
    const colors = Array.from(
      new Set(
        closetBaseSections.flatMap((section) =>
          section.items.flatMap((item) => params.extractColorTokens(item.color))
        )
      )
    ).sort((a, b) => a.localeCompare(b));
    return ["all", ...colors];
  }, [closetBaseSections, params.extractColorTokens]);

  const closetVisibleSections = useMemo(
    () =>
      closetBaseSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            if (params.closetColorFilter === "all") {
              return true;
            }
            return params.extractColorTokens(item.color).includes(params.closetColorFilter);
          }),
        }))
        .filter((section) => section.items.length > 0),
    [closetBaseSections, params.closetColorFilter, params.extractColorTokens]
  );

  return {
    closetSections,
    closetCategoryTabs,
    closetAvailableColors,
    closetVisibleSections,
  };
}

export function useCalendarLogViewModels(params: {
  capturedItems: WardrobeItem[];
  calendarLogCategoryTab: string;
  calendarLogSearchQuery: string;
  calendarLogColorFilter: string;
  dailyLogSelectionIds: Set<string>;
  extractColorTokens: (raw?: string) => string[];
}) {
  const calendarLogSections = useMemo(
    () => groupClosetSections(params.capturedItems, params.extractColorTokens),
    [params.capturedItems, params.extractColorTokens]
  );

  const calendarLogCategoryTabs = useMemo(
    () => ["all", ...calendarLogSections.map((section) => section.category)],
    [calendarLogSections]
  );

  const calendarLogBaseSections = useMemo(() => {
    const searchQuery = params.calendarLogSearchQuery.trim().toLowerCase();
    return (params.calendarLogCategoryTab === "all"
      ? calendarLogSections
      : calendarLogSections.filter((section) => section.category === params.calendarLogCategoryTab)
    )
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!searchQuery) {
            return true;
          }
          const haystack = [item.title, item.category, item.color, item.fabric_type, item.style]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(searchQuery);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [calendarLogSections, params.calendarLogCategoryTab, params.calendarLogSearchQuery]);

  const calendarLogAvailableColors = useMemo(
    () => [
      "all",
      ...Array.from(
        new Set(
          calendarLogBaseSections.flatMap((section) =>
            section.items.flatMap((item) => params.extractColorTokens(item.color))
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    ],
    [calendarLogBaseSections, params.extractColorTokens]
  );

  const calendarLogVisibleSections = useMemo(
    () =>
      calendarLogBaseSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            if (params.calendarLogColorFilter === "all") {
              return true;
            }
            return params.extractColorTokens(item.color).includes(params.calendarLogColorFilter);
          }),
        }))
        .filter((section) => section.items.length > 0),
    [calendarLogBaseSections, params.calendarLogColorFilter, params.extractColorTokens]
  );

  const calendarLogSelectedItems = useMemo(
    () => params.capturedItems.filter((item) => params.dailyLogSelectionIds.has(item.id)),
    [params.capturedItems, params.dailyLogSelectionIds]
  );

  return {
    calendarLogCategoryTabs,
    calendarLogAvailableColors,
    calendarLogVisibleSections,
    calendarLogSelectedItems,
  };
}

export function useWishlistViewModels(params: {
  optimizerResult: WardrobeOptimizeResult | null;
  wishlistItems: WishlistItem[];
  wishlistDetailCard: WishlistScoutCard | null;
  shopStores: NearbyStore[];
  capturedItems: WardrobeItem[];
  extractColorTokens: (raw?: string) => string[];
}) {
  const wishlistSmartGapLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const gap of params.optimizerResult?.gaps || []) {
      const normalized = (gap || "").trim().toLowerCase();
      if (normalized) {
        labels.add(normalized);
      }
    }
    for (const item of params.wishlistItems) {
      if ((item.notes || "").toLowerCase().includes("gap from outfit planning")) {
        const normalized = (item.category || "").trim().toLowerCase();
        if (normalized) {
          labels.add(normalized);
        }
      }
    }
    return [...labels];
  }, [params.optimizerResult, params.wishlistItems]);

  const wishlistScoutCards = useMemo(() => {
    const findLiveMatch = (category: string, color?: string) => {
      const categoryTerms = category.toLowerCase().split(/\s+/).filter(Boolean);
      const colorTerms = params.extractColorTokens(color);
      const scored = params.shopStores
        .map((store) => {
          const haystack = [
            store.name,
            store.category,
            store.address,
            ...(store.ai_evaluation?.best_for || []),
            ...(store.google_categories || []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          let score = Number(store.wishlist_relevance || 0);
          for (const term of categoryTerms) {
            if (haystack.includes(term)) {
              score += 0.4;
            }
          }
          for (const term of colorTerms) {
            if (haystack.includes(term)) {
              score += 0.15;
            }
          }
          return { store, score };
        })
        .filter((entry) => entry.score > 0.45)
        .sort((a, b) => b.score - a.score);
      return scored[0]?.store || null;
    };

    const persistedAi = params.wishlistItems.filter((item) => item.is_ai_suggested);
    const persistedAiCategories = new Set(
      persistedAi.map((item) => (item.category || "").trim().toLowerCase()).filter(Boolean)
    );
    const aiCards: WishlistScoutCard[] = [
      ...persistedAi.map((item) => ({
        id: item.id,
        origin: "ai" as const,
        category: item.category,
        color: item.color,
        notes: item.notes,
        inspirationImageUrl: item.inspiration_image_url,
        reasoning:
          item.reasoning ||
          "Suggested by the optimizer because it fills a real hole in your current wardrobe.",
        liveMatch: findLiveMatch(item.category, item.color),
      })),
      ...wishlistSmartGapLabels
        .filter((gap) => !persistedAiCategories.has(gap.trim().toLowerCase()))
        .map((gap) => ({
          id: `ai-gap-${gap}`,
          origin: "ai" as const,
          category: gap,
          reasoning: "This is still showing up as a live gap, so it’s worth hunting down next.",
          liveMatch: findLiveMatch(gap),
        })),
    ];

    const manualCards: WishlistScoutCard[] = params.wishlistItems
      .filter((item) => !item.is_ai_suggested)
      .map((item) => ({
        id: item.id,
        origin: "manual",
        category: item.category,
        color: item.color,
        notes: item.notes,
        inspirationImageUrl: item.inspiration_image_url,
        reasoning: item.notes?.trim() ? item.notes.trim() : "Saved manually as a personal want.",
        liveMatch: findLiveMatch(item.category, item.color),
      }));

    return {
      ai: aiCards,
      manual: manualCards,
    };
  }, [params.extractColorTokens, params.shopStores, params.wishlistItems, wishlistSmartGapLabels]);

  const wishlistPairingSuggestions = useMemo(() => {
    if (!params.wishlistDetailCard) {
      return [];
    }
    const targetCategory = params.wishlistDetailCard.category.toLowerCase();
    const preferredCategories = targetCategory.includes("shoe")
      ? ["bottoms", "tops"]
      : targetCategory.includes("outer") ||
          targetCategory.includes("blazer") ||
          targetCategory.includes("jacket")
        ? ["tops", "bottoms"]
        : targetCategory.includes("bottom")
          ? ["tops", "outerwear"]
          : ["bottoms", "outerwear"];
    return params.capturedItems
      .filter((item) => preferredCategories.includes((item.category || "").toLowerCase()))
      .slice(0, 2);
  }, [params.capturedItems, params.wishlistDetailCard]);

  return {
    wishlistSmartGapLabels,
    wishlistScoutCards,
    wishlistPairingSuggestions,
  };
}
