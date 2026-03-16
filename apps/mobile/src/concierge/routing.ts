import type { ConciergeMode, ConciergeRoute } from "./types";

export function getConciergeModePresentation(mode: ConciergeMode): "inline" | "dedicated" {
  if (mode === "concierge") {
    return "inline";
  }
  return mode === "stylist" || mode === "wishlist" ? "inline" : "dedicated";
}

export function getConciergeModeLabel(mode: ConciergeMode): string {
  if (mode === "concierge") {
    return "AI concierge";
  }
  if (mode === "scan") {
    return "Wardrobe scan";
  }
  if (mode === "stylist") {
    return "Stylist";
  }
  if (mode === "wishlist") {
    return "Wishlist memory";
  }
  return "Store assist";
}

export function buildConciergeRoute(input: {
  currentMode: ConciergeMode | null;
  targetMode: ConciergeMode;
  reason?: string;
  handoffType?: ConciergeRoute["handoffType"];
  bootstrapPayload?: Record<string, unknown>;
}): ConciergeRoute {
  const { currentMode, targetMode } = input;
  const handoffType = input.handoffType ?? (currentMode === targetMode ? "soft" : "hard");

  const defaultReason =
    targetMode === "concierge"
      ? "Returning to the main concierge so I can understand what you need next."
      : targetMode === "scan"
      ? "Switching to wardrobe scan so I can capture and save garments live."
      : targetMode === "stylist"
        ? currentMode === "scan"
          ? "Wardrobe intake is done. Moving back into styling with your updated closet in context."
          : "Routing back to styling so I can keep the fashion conversation going."
        : targetMode === "wishlist"
          ? "Opening wishlist memory so I can focus on missing pieces and saved wants."
          : "Opening store assist so I can help with in-store decisions and try-ons.";

  return {
    targetMode,
    handoffType,
    reason: input.reason?.trim() || defaultReason,
    bootstrapPayload: input.bootstrapPayload,
  };
}

export function getConciergeSuggestedRoutes(
  mode: ConciergeMode
): Array<{ mode: ConciergeMode; label: string; reason: string }> {
  if (mode === "concierge") {
    return [
      {
        mode: "stylist",
        label: "Open styling",
        reason: "Routing into styling so I can build looks and recommend combinations.",
      },
      {
        mode: "scan",
        label: "Scan garments",
        reason: "Switching to wardrobe scan so I can capture and save garments live.",
      },
      {
        mode: "shop",
        label: "Store assist",
        reason: "Opening store assist so I can help with in-store decisions and try-ons.",
      },
    ];
  }
  if (mode === "scan") {
    return [
      {
        mode: "stylist",
        label: "Back to styling",
        reason: "Wardrobe intake is done. Moving back into styling with your updated closet in context.",
      },
      {
        mode: "wishlist",
        label: "Save a gap",
        reason: "Opening wishlist memory to save a missing piece you noticed while scanning.",
      },
      {
        mode: "shop",
        label: "Go in-store",
        reason: "Opening store assist to compare new finds against what you just scanned.",
      },
    ];
  }

  if (mode === "stylist") {
    return [
      {
        mode: "scan",
        label: "Scan a garment",
        reason: "Switching to wardrobe scan so I can capture and save garments live.",
      },
      {
        mode: "shop",
        label: "Open store assist",
        reason: "Opening store assist so I can help you evaluate real-world finds.",
      },
      {
        mode: "wishlist",
        label: "Manage wishlist",
        reason: "Opening wishlist memory to review or edit saved wardrobe gaps.",
      },
    ];
  }

  if (mode === "wishlist") {
    return [
      {
        mode: "stylist",
        label: "Back to styling",
        reason: "Routing back to styling so I can turn your wishlist gaps into outfit advice.",
      },
      {
        mode: "shop",
        label: "Find in stores",
        reason: "Opening store assist so I can look for wishlist pieces in real stores.",
      },
      {
        mode: "scan",
        label: "Scan something",
        reason: "Switching to wardrobe scan so I can add a garment before we keep planning.",
      },
    ];
  }

  return [
    {
      mode: "stylist",
      label: "Back to styling",
      reason: "Routing back to styling so I can connect this store context to your closet.",
    },
    {
      mode: "wishlist",
      label: "Save for later",
      reason: "Opening wishlist memory so I can save anything you still want to hunt down later.",
    },
    {
      mode: "scan",
      label: "Scan closet item",
      reason: "Switching to wardrobe scan so I can add a related garment before we continue.",
    },
  ];
}
