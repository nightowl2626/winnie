import { Platform, ViewStyle } from "react-native";
import { colors, radii, shadows } from "./tokens";

type GlassVariant = "card" | "navBar" | "overlay" | "portalTile" | "input" | "pill";

type GlassConfig = {
  blur: number;
  bgOpacity: number;
  borderOpacity: number;
  radius: number;
};

const VARIANTS: Record<GlassVariant, GlassConfig> = {
  card: { blur: 24, bgOpacity: 0.76, borderOpacity: 0.12, radius: radii.card },
  navBar: { blur: 28, bgOpacity: 0.8, borderOpacity: 0.1, radius: 0 },
  overlay: { blur: 32, bgOpacity: 0.72, borderOpacity: 0.14, radius: radii.xl },
  portalTile: { blur: 22, bgOpacity: 0.72, borderOpacity: 0.12, radius: radii.xl },
  input: { blur: 16, bgOpacity: 0.7, borderOpacity: 0.1, radius: radii.md },
  pill: { blur: 14, bgOpacity: 0.68, borderOpacity: 0.1, radius: radii.full },
};

/**
 * Returns platform-appropriate glass material styles.
 * Clean white theme with subtle grey borders.
 */
export function glassStyle(variant: GlassVariant = "card", glowColor?: string): ViewStyle {
  const cfg = VARIANTS[variant];

  if (Platform.OS === "web") {
    return {
      backdropFilter: `blur(${cfg.blur}px) saturate(1.2)`,
      WebkitBackdropFilter: `blur(${cfg.blur}px) saturate(1.2)`,
      backgroundColor: `rgba(255,248,241,${cfg.bgOpacity})`,
      borderWidth: 1,
      borderColor: `rgba(92,71,58,${cfg.borderOpacity})`,
      borderRadius: cfg.radius,
      ...(glowColor
        ? { boxShadow: `0 0 28px ${glowColor}, 0 18px 42px rgba(67,44,31,0.12)` }
        : { boxShadow: "0 18px 42px rgba(67,44,31,0.12), inset 0 1px 0 rgba(255,255,255,0.4)" }),
    } as ViewStyle;
  }

  // Native fallback
  return {
    backgroundColor: `rgba(255,248,241,${Math.min(cfg.bgOpacity + 0.1, 1)})`,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: cfg.radius,
    ...(glowColor ? shadows.glow(glowColor) : shadows.cardLight),
  };
}

/** Emphasized surface variant for highlighted containers */
export function darkGlassStyle(variant: GlassVariant = "card"): ViewStyle {
  const cfg = VARIANTS[variant];

  if (Platform.OS === "web") {
    return {
      backdropFilter: `blur(${cfg.blur}px) saturate(1.1)`,
      WebkitBackdropFilter: `blur(${cfg.blur}px) saturate(1.1)`,
      backgroundColor: "rgba(237, 227, 217, 0.78)",
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: cfg.radius,
      boxShadow: "0 16px 36px rgba(67,44,31,0.12)",
    } as ViewStyle;
  }

  return {
    backgroundColor: "rgba(237, 227, 217, 0.92)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: cfg.radius,
    ...shadows.cardLight,
  };
}
