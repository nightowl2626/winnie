import { Platform } from "react-native";

/* ── Color Palette ──────────────────────────────────────────── */

export const colors = {
  bg: "#F6EFE7",
  bgSoft: "#ECE3D9",
  surface: "#FFF8F1",
  surfaceAlt: "#F4EAE0",
  surfaceSolid: "#F8F1E9",

  text: "#2C241E",
  textSecondary: "#706157",
  textTertiary: "#9B8C81",
  textDark: "#2C241E",
  textDarkSecondary: "#706157",

  accent: "#FF7652",
  accentLight: "#FFF1E7",

  purple: "#8D7968",
  purpleLight: "#F1E8E0",

  gold: "#C89A63",
  goldLight: "#F8EEDF",

  warmBrown: "#5C473A",
  warmBeige: "#EAE1D8",
  warmOrange: "#FF7652",
  warmAmber: "#C89A63",
  warmTerracotta: "#B9653B",
  warmSand: "#F4EADF",
  amethyst: "#8D7968",
  emerald: "#A98A68",

  // Semantic
  success: "#6D9F6D",
  error: "#EF4444",
  border: "#DDD0C4",
  borderLight: "#EDE3DA",

  glassBorder: "rgba(92,71,58,0.12)",
  glassBorderSubtle: "rgba(92,71,58,0.06)",

  // Shadows
  shadow: "#000000",

  // Per-mode glows
  glowScan: "rgba(201,154,99,0.16)",
  glowStylist: "rgba(255,118,82,0.24)",
  glowWishlist: "rgba(141,121,104,0.18)",
  glowShop: "rgba(200,154,99,0.24)",
} as const;

/* ── Typography ─────────────────────────────────────────────── */

const WEB_SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const WEB_SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const typography = {
  headline: {
    fontFamily: Platform.select({
      web: WEB_SERIF,
      default: "PlayfairDisplay_700Bold",
    }) as string,
  },
  body: {
    fontFamily: Platform.select({
      web: WEB_SANS,
      default: "Inter_400Regular",
    }) as string,
  },
  bodyMedium: {
    fontFamily: Platform.select({
      web: WEB_SANS,
      default: "Inter_500Medium",
    }) as string,
  },
  bodySemiBold: {
    fontFamily: Platform.select({
      web: WEB_SANS,
      default: "Inter_600SemiBold",
    }) as string,
  },
  bodyBold: {
    fontFamily: Platform.select({
      web: WEB_SANS,
      default: "Inter_700Bold",
    }) as string,
  },
  sizes: {
    hero: 34,
    h1: 28,
    h2: 22,
    h3: 18,
    body: 14,
    caption: 12,
    eyebrow: 11,
    micro: 10,
  },
} as const;

/* ── Spacing ────────────────────────────────────────────────── */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

/* ── Border Radii ───────────────────────────────────────────── */

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  card: 20,
  full: 999,
} as const;

/* ── Shadow Presets ─────────────────────────────────────────── */

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  cardLight: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  }),
} as const;
