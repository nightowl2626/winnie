import { Platform, StyleSheet } from "react-native";
import { typography } from "../design/tokens";
import { createShopStyleDefinitions } from "../shop/styles";
export const C = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F4F4",
  surfaceSolid: "#FFFFFF",
  text: "#1A1A1A",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  textDark: "#1A1A1A",
  textDarkSecondary: "#6B7280",
  accent: "#FF7652",
  accentLight: "#FFF0EB",
  success: "#4CAF50",
  error: "#EF4444",
  border: "#E5E5E5",
  shadow: "#000000",
  // Accent spectrum
  purple: "#684BF3",
  purpleLight: "#EEEBFF",
  gold: "#DEBD55",
  goldLight: "#FFF8E5",
  electricGold: "#DEBD55",
  // Legacy aliases
  warmBrown: "#684BF3",
  warmBeige: "#F4F4F4",
  warmOrange: "#FF7652",
  warmAmber: "#DEBD55",
  warmTerracotta: "#684BF3",
  warmSand: "#F4F4F4",
  amethyst: "#684BF3",
  emerald: "#4CAF50",
  glassBorder: "rgba(0,0,0,0.06)",
  glassBorderSubtle: "rgba(0,0,0,0.03)",
  // Per-mode glows
  glowScan: "rgba(76,175,80,0.2)",
  glowStylist: "rgba(255,118,82,0.25)",
  glowWishlist: "rgba(104,75,243,0.2)",
  glowShop: "rgba(222,189,85,0.25)",
} as const;

const CARD_RADIUS = 20;
const GLASS_STYLE = Platform.OS === "web" ? {
  backdropFilter: "blur(16px) saturate(1.1)",
  WebkitBackdropFilter: "blur(16px) saturate(1.1)",
  backgroundColor: "rgba(255,255,255,0.95)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.8)",
  borderRadius: CARD_RADIUS,
  boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
} : {
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.8)",
  borderRadius: CARD_RADIUS,
};
const CARD_SHADOW = {
  shadowColor: C.shadow,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: 8,
} as const;
const CARD_SHADOW_LIGHT = {
  shadowColor: C.shadow,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 4,
} as const;


export const styles = StyleSheet.create({
  /* ── Home shell ──────────────────────────────────── */
  safeArea: {
    flex: 1,
    backgroundColor: "transparent"
  },
  appShell: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8
  },
  headerRowCompact: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    minHeight: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
    ...(Platform.OS === "web" ? { fontFamily: "'Playfair Display', Georgia, serif" } : {}),
  },
  headerSubtitle: {
    fontSize: 12,
    color: C.textTertiary,
    marginLeft: 10,
    fontWeight: "500",
    ...(Platform.OS === "web" ? { fontFamily: "'Inter', sans-serif" } : {}),
  },
  contentArea: {
    flex: 1,
    marginTop: 8,
    overflow: "visible",
  },
  scrollContent: {
    paddingBottom: 120
  },
  homeScrollBleed: {
    marginHorizontal: -16,
    overflow: "visible",
  },
  homeScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },

  /* ── Hero card ───────────────────────────────────── */
  heroCard: {
    ...GLASS_STYLE,
    padding: 24,
    ...CARD_SHADOW,
    ...(Platform.OS === "web" ? {
      boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
    } : {}),
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: C.accent,
    letterSpacing: 1.2,
    marginBottom: 6
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text
  },
  heroBody: {
    marginTop: 8,
    color: C.textSecondary,
    lineHeight: 21,
    fontSize: 14
  },
  stepsRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 8
  },
  stepPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F4F4",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.glassBorderSubtle,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.accent,
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 22,
    overflow: "hidden",
    marginRight: 6
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: "600"
  },
  startButton: {
    marginTop: 16,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: C.accent,
    ...(Platform.OS === "web" ? {
      boxShadow: "0 0 16px rgba(255,118,82,0.25), 0 4px 12px rgba(0,0,0,0.06)",
    } : {}),
  },
  startButtonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
    ...(Platform.OS === "web" ? { fontFamily: "'Inter', sans-serif" } : {}),
  },

  /* ── Summary card ────────────────────────────────── */
  summaryCard: {
    marginTop: 14,
    ...GLASS_STYLE,
    padding: 20,
    ...CARD_SHADOW_LIGHT
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: C.accent,
    letterSpacing: 1.2,
    marginBottom: 6
  },
  summaryBody: {
    color: C.textSecondary,
    lineHeight: 20
  },
  homeInsightRow: {
    marginTop: 4,
    gap: 6,
    alignItems: "stretch",
    overflow: "visible",
  },
  homeInsightCard: {
    marginTop: 0,
    overflow: "hidden"
  },
  homeSummaryOrbCard: {
    paddingVertical: 2,
    paddingHorizontal: 0,
    alignItems: "center",
    overflow: "visible",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "none",
          backdropFilter: "none",
        }
      : {
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        })
  },
  homeSummaryOrbBody: {
    width: "100%",
    minHeight: 166,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  homeSummaryOrbGlow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(243, 132, 44, 0.34)",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 0 148px rgba(235,128,32,0.38)",
          filter: "blur(42px)",
        }
      : {
          shadowColor: "#EB7F20",
          shadowOpacity: 0.4,
          shadowRadius: 64,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  homeSummaryOrbFeather: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.34,
    ...(Platform.OS === "web"
      ? {
          filter: "blur(38px)",
        }
      : {
          shadowColor: "#F09A40",
          shadowOpacity: 0.24,
          shadowRadius: 44,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  homeSummaryOrbContourSoftener: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.3,
    ...(Platform.OS === "web"
      ? {
          filter: "blur(24px)",
          mixBlendMode: "screen",
        }
      : {
          shadowColor: "#F2A45A",
          shadowOpacity: 0.2,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  homeSummaryOrb: {
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "#E7D7C7",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 0 74px rgba(240,142,56,0.18), 0 16px 30px rgba(82,48,20,0.03)",
          filter: "blur(11px)",
        }
      : {
          shadowColor: "#D17A2A",
          shadowOpacity: 0.16,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 8 },
        }),
  },
  homeSummaryOrbNativeBlend: {
    ...StyleSheet.absoluteFillObject,
  },
  homeSummaryOrbNativeBlob: {
    position: "absolute",
    borderRadius: 999,
    ...(Platform.OS === "web"
      ? {
          filter: "blur(18px)",
        }
      : {}),
  },
  homeSummaryOrbShade: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: "rgba(67, 46, 29, 0.04)",
  },
  homeSummaryOrbTextShell: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  homeSummaryOrbEyebrow: {
    marginBottom: 10,
    color: "#3B2A1F",
    fontFamily: typography.headline.fontFamily,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.2,
    ...(Platform.OS === "web"
      ? {
          textShadow: "0 1px 10px rgba(255,248,242,0.22)",
        }
      : {
          textShadowColor: "rgba(255,248,242,0.18)",
          textShadowRadius: 8,
          textShadowOffset: { width: 0, height: 1 },
        }),
  },
  homeSummaryOrbText: {
    color: "#4B392F",
    width: "100%",
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400",
    textAlign: "center",
    ...(Platform.OS === "web"
      ? {
          textShadow: "0 1px 10px rgba(255,248,242,0.2)",
        }
      : {
          textShadowColor: "rgba(255,248,242,0.18)",
          textShadowRadius: 10,
          textShadowOffset: { width: 0, height: 1 },
        })
  },

  /* ── Collection / closet grid ────────────────────── */
  collectionCard: {
    marginTop: 14,
    ...GLASS_STYLE,
    padding: 20,
    ...CARD_SHADOW_LIGHT
  },
  closetCollectionCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "rgba(255, 248, 242, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.56)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(24px) saturate(145%)",
          WebkitBackdropFilter: "blur(24px) saturate(145%)",
          boxShadow: "0 18px 40px rgba(124,79,41,0.12), inset 0 1px 0 rgba(255,255,255,0.42)",
        }
      : {
          shadowColor: "#9F6737",
          shadowOpacity: 0.16,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
        }),
  },
  closetTryOnCard: {
    paddingTop: 8,
    paddingBottom: 8,
    marginTop: 8,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        }
      : {
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        }),
  },
  closetCollectionBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  closetCollectionGlowPrimary: {
    position: "absolute",
    top: -58,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,118,82,0.16)",
    ...(Platform.OS === "web"
      ? { filter: "blur(44px)" }
      : {
          shadowColor: "#FF7652",
          shadowOpacity: 0.16,
          shadowRadius: 36,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  closetCollectionGlowSecondary: {
    position: "absolute",
    bottom: -70,
    left: -42,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(200,154,99,0.14)",
    ...(Platform.OS === "web"
      ? { filter: "blur(46px)" }
      : {
          shadowColor: "#C89A63",
          shadowOpacity: 0.14,
          shadowRadius: 34,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  closetCollectionSheen: {
    position: "absolute",
    top: 14,
    left: 18,
    right: 18,
    height: 56,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    ...(Platform.OS === "web"
      ? { filter: "blur(12px)" }
      : {}),
  },
  collectionTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 12
  },
  collectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  outfitChatBtn: {
    borderRadius: 999,
    backgroundColor: "rgba(255,118,82,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 8px 20px rgba(255,118,82,0.12), inset 0 1px 0 rgba(255,255,255,0.22)",
        }
      : {}),
  },
  outfitChatBtnText: {
    color: C.accent,
    fontWeight: "800",
    fontSize: 12
  },
  tryOnPanel: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    gap: 12,
    marginBottom: 6
  },
  modelPhotoBlock: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    borderColor: "transparent",
    padding: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modelPhotoMediaWrap: {
    position: "relative",
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tryOnActionBlock: {
    width: 150,
    minWidth: 150,
    backgroundColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    borderColor: "transparent",
    padding: 0,
    justifyContent: "center",
    gap: 10,
    alignItems: "center",
  },
  tryOnBody: {
    color: C.textSecondary,
    fontSize: 12,
    lineHeight: 17
  },
  tryOnMeta: {
    color: C.textTertiary,
    fontSize: 11,
    marginTop: 8
  },
  modelPhotoPreview: {
    height: "100%",
    maxWidth: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: C.border,
    alignSelf: "center",
  },
  modelPhotoFallback: {
    height: "100%",
    maxWidth: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  modelPhotoEditBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 10px 24px rgba(255,118,82,0.18), inset 0 1px 0 rgba(255,255,255,0.18)",
        }
      : {}),
  },
  tryOnBtn: {
    width: "100%",
    borderRadius: 999,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 10px 24px rgba(255,118,82,0.18), inset 0 1px 0 rgba(255,255,255,0.18)",
        }
      : {}),
  },
  tryOnBtnText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13
  },
  tryOnSelectedPreviewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
    width: 112,
    justifyContent: "center",
    alignSelf: "center",
  },
  tryOnSelectedPreviewCard: {
    width: 52,
    height: 72,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "rgba(255,255,255,0.26)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }
      : {}),
  },
  tryOnSelectedPreviewCardEmpty: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.42)",
  },
  tryOnSelectedPreviewImage: {
    width: "100%",
    height: "100%",
  },
  tryOnSelectedPreviewFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  tryOnSelectedPreviewFallbackText: {
    color: C.textTertiary,
    fontSize: 20,
    fontWeight: "700",
  },
  tryOnGhostBtn: {
    marginTop: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    paddingVertical: 9,
    backgroundColor: "rgba(255,255,255,0.34)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }
      : {}),
  },
  tryOnGhostBtnText: {
    color: C.textSecondary,
    fontWeight: "700",
    fontSize: 12
  },
  closetBrowseSection: {
    gap: 12
  },
  closetSection: {
    gap: 10
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  gridItem: {
    width: "48%" as any,
    backgroundColor: "rgba(255,255,255,0.34)",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.56)",
    ...CARD_SHADOW,
    ...(Platform.OS === "web" ? {
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      boxShadow: "0 10px 26px rgba(88,56,31,0.10), inset 0 1px 0 rgba(255,255,255,0.24)",
    } : {}),
  },
  gridTapArea: {
    borderRadius: 24,
    overflow: "hidden"
  },
  selectChip: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 4,
    backgroundColor: C.accent,
    borderRadius: 999,
    minWidth: 44,
    height: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 8px 20px rgba(255,118,82,0.18), inset 0 1px 0 rgba(255,255,255,0.16)",
        }
      : {}),
  },
  selectChipActive: {
    backgroundColor: "#D85F3B"
  },
  selectChipText: {
    color: "#FFF",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  selectChipTextActive: {
    color: "#FFF"
  },
  deleteChip: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 4,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 999,
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }
      : {}),
  },
  deleteChipBusy: {
    opacity: 0.75
  },
  deleteChipText: {
    color: C.textSecondary,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "700"
  },
  sellChip: {
    position: "absolute",
    left: 8,
    bottom: 38,
    zIndex: 4,
    backgroundColor: "rgba(255,118,82,0.16)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }
      : {}),
  },
  sellChipText: {
    color: "#B75439",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.25
  },
  gridImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  gridImageFallback: {
    width: "100%",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,234,224,0.86)"
  },
  gridFallbackText: {
    color: C.textTertiary,
    fontWeight: "600",
    fontSize: 13
  },
  enhancingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 18, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS
  },
  enhancingText: {
    marginTop: 6,
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "700"
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 28,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.52)",
    backgroundColor: "rgba(255,255,255,0.28)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }
      : {}),
  },
  emptyTitle: {
    color: C.textSecondary,
    fontWeight: "700",
    fontSize: 16
  },
  emptySubtitle: {
    color: C.textTertiary,
    marginTop: 4,
    fontSize: 13
  },
  optimizerCard: {
    marginTop: 14,
    ...GLASS_STYLE,
    padding: 16,
    ...CARD_SHADOW,
  },
  homeOptimizerCardTight: {
    marginTop: 12,
  },
  homeOptimizerGlassCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "rgba(255, 247, 240, 0.48)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.58)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(22px) saturate(145%)",
          boxShadow: "0 18px 36px rgba(124,79,41,0.10), inset 0 1px 0 rgba(255,255,255,0.42)",
        }
      : {
          shadowColor: "#A66B38",
          shadowOpacity: 0.14,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 12 },
        }),
  },
  homeOptimizerGlassBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  homeOptimizerGlassGlowPrimary: {
    position: "absolute",
    top: -34,
    right: -18,
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: "rgba(236, 151, 71, 0.22)",
    ...(Platform.OS === "web"
      ? {
          filter: "blur(30px)",
        }
      : {
          shadowColor: "#EC9747",
          shadowOpacity: 0.22,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  homeOptimizerGlassGlowSecondary: {
    position: "absolute",
    bottom: -46,
    left: -22,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: "rgba(214, 190, 170, 0.18)",
    ...(Platform.OS === "web"
      ? {
          filter: "blur(36px)",
        }
      : {
          shadowColor: "#D6BEAA",
          shadowOpacity: 0.18,
          shadowRadius: 32,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  homeOptimizerGlassSheen: {
    position: "absolute",
    top: 12,
    left: 18,
    right: 18,
    height: 54,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    ...(Platform.OS === "web"
      ? {
          filter: "blur(12px)",
        }
      : {}),
  },
  optimizerTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "800"
  },
  optimizerBody: {
    marginTop: 6,
    color: C.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  optimizerMeta: {
    color: C.textTertiary,
    fontSize: 12,
    lineHeight: 18
  },
  optimizerActionBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: C.accent,
    ...(Platform.OS === "web" ? {
      boxShadow: "0 0 12px rgba(255,118,82,0.2)",
    } : {}),
  },
  optimizerActionText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13
  },
  optimizerResultBox: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }
      : {}),
  },
  optimizerResultMetric: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  optimizerResultValue: {
    color: C.text,
    fontSize: 21,
    fontWeight: "700",
    ...(Platform.OS === "web" ? { fontFamily: "'Playfair Display', Georgia, serif" } : {}),
  },
  optimizerResultLabel: {
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  optimizerResultDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(92,71,58,0.12)",
  },
  homeStatsRow: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: "row",
    gap: 8
  },
  homeStatTile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 0,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    alignItems: "center",
    ...CARD_SHADOW_LIGHT,
    ...(Platform.OS === "web" ? {
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    } : {}),
  },
  homeStatValue: {
    color: C.text,
    fontSize: 19,
    fontWeight: "800"
  },
  homeStatLabel: {
    marginTop: 2,
    color: C.textTertiary,
    fontSize: 11,
    fontWeight: "700"
  },
  homeColorRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  homeColorChip: {
    borderRadius: 999,
    borderWidth: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  homeColorChipText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "700"
  },
  homeSellRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  homeSellBtn: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceAlt,
    minWidth: 86,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  homeSellBtnText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  homeOptimizerHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  homeOptimizerHeaderText: {
    flex: 1,
    minWidth: 0
  },
  homeOptimizerGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10
  },
  homeOptimizerItemCard: {
    width: "47%" as any,
    borderRadius: 16,
    borderWidth: 0,
    backgroundColor: "#FFFFFF",
    padding: 10,
    paddingBottom: 0,
    gap: 10,
    overflow: "hidden",
    ...CARD_SHADOW_LIGHT,
    ...(Platform.OS === "web" ? {
      boxShadow: "0 3px 14px rgba(0,0,0,0.06)",
    } : {}),
  },
  homeOptimizerItemImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#F4F4F4"
  },
  homeOptimizerItemFallback: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#F4F4F4",
    alignItems: "center",
    justifyContent: "center"
  },
  homeOptimizerItemAction: {
    marginHorizontal: -10,
    marginBottom: 0,
    marginTop: "auto" as any,
    minHeight: 46,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#FF7652",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16)",
        }
      : {
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        }),
  },
  homeOptimizerItemActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  utilizationBarTrack: {
    marginTop: 10,
    width: "100%",
    height: 12,
    borderRadius: 999,
    backgroundColor: "#F4F4F4",
    overflow: "hidden"
  },
  utilizationBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: C.accent
  },
  dashboardBigNumber: {
    marginTop: 6,
    color: C.text,
    fontSize: 40,
    fontWeight: "900"
  },
  calendarWidgetHeader: {
    marginBottom: 4,
  },
  calendarStreakInline: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "700",
  },
  paletteBubbleRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  paletteBubble: {
    minWidth: 86,
    borderRadius: 18,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  paletteBubbleTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "800"
  },
  paletteBubbleMeta: {
    marginTop: 4,
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "700"
  },
  cpwRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  cpwTitle: {
    flex: 1,
    color: C.text,
    fontSize: 13,
    fontWeight: "700"
  },
  cpwValue: {
    color: C.accent,
    fontSize: 12,
    fontWeight: "900"
  },
  calendarWeekRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  calendarStreakSubtitle: {
    marginTop: 2,
    color: C.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  weekCell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 156,
    borderRadius: 20,
    backgroundColor: "rgba(255,248,241,0.76)",
    borderWidth: 1,
    borderColor: C.glassBorder,
    overflow: "hidden",
    padding: 10,
    justifyContent: "space-between",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(18px) saturate(1.15)",
          WebkitBackdropFilter: "blur(18px) saturate(1.15)",
        }
      : {}),
  },
  weekCellFilled: {
    padding: 0,
    backgroundColor: "#F4EADF",
  },
  weekCellToday: {
    borderColor: "rgba(255,118,82,0.42)",
  },
  weekCellImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    backgroundColor: C.border,
  },
  weekCellOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,248,241,0.14)",
  },
  weekCellOverlayFilled: {
    backgroundColor: "rgba(44,36,30,0.24)",
  },
  weekCellHeader: {
    zIndex: 1,
    paddingHorizontal: 7,
    paddingTop: 7,
  },
  weekCellWeekday: {
    color: C.textSecondary,
    fontSize: 7,
    lineHeight: 8,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0,
    flexShrink: 1,
  },
  weekCellDay: {
    marginTop: 1,
    color: C.text,
    fontSize: 8,
    lineHeight: 9,
    fontWeight: "900",
    includeFontPadding: false,
    flexShrink: 1,
  },
  weekCellTextOnImage: {
    color: "#FFF9F3",
    textShadowColor: "rgba(0,0,0,0.22)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  weekCellEmptyState: {
    marginTop: "auto",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  weekCellDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: C.accent,
    opacity: 0.22,
  },
  weekCellEmptyText: {
    color: C.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    flexShrink: 1,
  },
  calendarLogModalContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16
  },
  calendarLogCardGlass: {
    position: "relative",
    backgroundColor: "rgba(255, 248, 242, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.54)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(24px) saturate(145%)",
          WebkitBackdropFilter: "blur(24px) saturate(145%)",
          boxShadow: "0 18px 40px rgba(121,76,38,0.14), inset 0 1px 0 rgba(255,255,255,0.42)",
        }
      : {
          shadowColor: "#9F6737",
          shadowOpacity: 0.16,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
        }),
  },
  calendarLogCardGlowWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  calendarLogCardGlowPrimary: {
    position: "absolute",
    top: -54,
    right: -28,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,118,82,0.18)",
    ...(Platform.OS === "web"
      ? { filter: "blur(44px)" }
      : {
          shadowColor: "#FF7652",
          shadowOpacity: 0.18,
          shadowRadius: 36,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  calendarLogCardGlowSecondary: {
    position: "absolute",
    bottom: -64,
    left: -30,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: "rgba(200,154,99,0.15)",
    ...(Platform.OS === "web"
      ? { filter: "blur(42px)" }
      : {
          shadowColor: "#C89A63",
          shadowOpacity: 0.16,
          shadowRadius: 34,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  calendarLogCardSheen: {
    position: "absolute",
    top: 16,
    left: 18,
    right: 18,
    height: 52,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    ...(Platform.OS === "web"
      ? { filter: "blur(12px)" }
      : {}),
  },
  calendarLogHeaderText: {
    gap: 2,
  },
  calendarLogHeaderTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: "700",
    ...(Platform.OS === "web" ? { fontFamily: "'Playfair Display', Georgia, serif" } : {}),
  },
  calendarLogHeaderDate: {
    color: C.textTertiary,
    fontSize: 12,
    fontWeight: "600",
  },
  calendarLogModalContentGlass: {
    paddingBottom: 18,
  },
  calendarLogIntro: {
    color: C.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  calendarLogSearchInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.34)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
    ...(Platform.OS === "web" ? {
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
    } : {}),
  },
  calendarLogSections: {
    marginTop: 12,
    gap: 16
  },
  calendarLogSelectedSection: {
    marginTop: 12,
    gap: 10,
  },
  calendarLogTabRow: {
    gap: 8,
    paddingBottom: 2
  },
  calendarLogTab: {
    borderRadius: 999,
    borderWidth: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...CARD_SHADOW_LIGHT,
  },
  calendarLogTabActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  calendarLogTabText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  calendarLogTabTextActive: {
    color: "#FFF"
  },
  calendarLogFilterRow: {
    gap: 8,
    paddingBottom: 2
  },
  calendarLogFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.glassBorderSubtle,
    backgroundColor: "#F4F4F4",
    minWidth: 36,
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  calendarLogFilterChipActive: {
    backgroundColor: "rgba(255,118,82,0.1)",
    borderColor: C.accent
  },
  calendarLogFilterChipText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize"
  },
  calendarLogFilterChipTextActive: {
    color: C.accent
  },
  calendarLogSwatch: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 0,
    borderColor: "transparent"
  },
  calendarLogSwatchMulti: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#FFF7EC",
    borderWidth: 0,
    borderColor: "transparent",
    position: "relative"
  },
  calendarLogSwatchDot: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 999
  },
  calendarLogSwatchDotTopLeft: {
    top: 3,
    left: 3,
    backgroundColor: "#C73C33"
  },
  calendarLogSwatchDotTopRight: {
    top: 3,
    right: 3,
    backgroundColor: "#E5C542"
  },
  calendarLogSwatchDotBottomLeft: {
    bottom: 3,
    left: 3,
    backgroundColor: "#4C78C9"
  },
  calendarLogSwatchDotBottomRight: {
    bottom: 3,
    right: 3,
    backgroundColor: "#6D8F63"
  },
  calendarLogSection: {
    gap: 10
  },
  calendarLogSectionTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  calendarLogColorGroup: {
    gap: 8
  },
  calendarLogColorTitle: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize"
  },
  listingCard: {
    width: "100%",
    maxWidth: 780,
    maxHeight: "88%" as any,
    backgroundColor: C.surface,
    borderRadius: 20,
    overflow: "hidden",
    ...CARD_SHADOW
  },
  listingCardGlass: {
    position: "relative",
    backgroundColor: "rgba(255, 248, 242, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.52)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(24px) saturate(145%)",
          WebkitBackdropFilter: "blur(24px) saturate(145%)",
          boxShadow: "0 18px 40px rgba(121,76,38,0.14), inset 0 1px 0 rgba(255,255,255,0.42)",
        }
      : {
          shadowColor: "#9F6737",
          shadowOpacity: 0.16,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
        }),
  },
  listingCardGlowWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  listingCardGlowPrimary: {
    position: "absolute",
    top: -52,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,118,82,0.2)",
    ...(Platform.OS === "web"
      ? {
          filter: "blur(44px)",
        }
      : {
          shadowColor: "#FF7652",
          shadowOpacity: 0.2,
          shadowRadius: 36,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  listingCardGlowSecondary: {
    position: "absolute",
    bottom: -60,
    left: -28,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: "rgba(200,154,99,0.16)",
    ...(Platform.OS === "web"
      ? {
          filter: "blur(42px)",
        }
      : {
          shadowColor: "#C89A63",
          shadowOpacity: 0.16,
          shadowRadius: 34,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  listingCardSheen: {
    position: "absolute",
    top: 16,
    left: 18,
    right: 18,
    height: 52,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    ...(Platform.OS === "web"
      ? {
          filter: "blur(12px)",
        }
      : {}),
  },
  listingCloseBtn: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
  },
  listingScroll: {
    width: "100%",
  },
  listingScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 10,
  },
  listingImage: {
    width: "100%",
    height: 260,
    borderRadius: 18,
    backgroundColor: C.border,
  },
  listingItemTitle: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  listingPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexWrap: "wrap",
  },
  listingPriceLabel: {
    color: "#1F1A17",
    fontSize: 12,
    fontWeight: "700",
  },
  listingPrice: {
    color: "#1F1A17",
    fontSize: 20,
    fontWeight: "700",
  },
  listingTextCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.38)",
    padding: 14,
    gap: 6,
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }
      : {}),
  },
  listingGeneratedTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
  },
  listingDescription: {
    color: C.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  listingActionsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  listingPrimaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 10px 24px rgba(255,118,82,0.24), inset 0 1px 0 rgba(255,255,255,0.18)",
        }
      : {
          shadowColor: C.accent,
          shadowOpacity: 0.24,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
        }),
  },
  listingPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  listingGhostBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.34)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.52)",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }
      : {}),
  },
  listingGhostBtnText: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  recentLookRow: {
    paddingVertical: 2,
    gap: 10
  },
  recentLookCard: {
    width: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceAlt,
    padding: 6
  },
  recentLookImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    backgroundColor: C.border
  },
  recentLookImageFallback: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center"
  },
  recentLookLabel: {
    marginTop: 6,
    color: C.text,
    fontSize: 12,
    fontWeight: "700"
  },
  dailyLogGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  dailyLogItem: {
    width: "31.8%" as any,
    borderRadius: 18,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    padding: 0,
    overflow: "hidden",
  },
  dailyLogItemActive: {
    borderWidth: 2,
    borderColor: "rgba(255,118,82,0.62)",
    backgroundColor: "rgba(255,118,82,0.08)",
    padding: 6,
  },
  dailyLogImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: C.border
  },
  dailyLogImageFallback: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.border
  },
  wishlistList: {
    marginTop: 10,
    gap: 8
  },
  wishlistHeroCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "rgba(255, 248, 242, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.56)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(22px) saturate(145%)",
          WebkitBackdropFilter: "blur(22px) saturate(145%)",
          boxShadow: "0 18px 40px rgba(121,76,38,0.12), inset 0 1px 0 rgba(255,255,255,0.42)",
        }
      : {
          shadowColor: "#9F6737",
          shadowOpacity: 0.15,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 12 },
        }),
  },
  wishlistManualCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "rgba(255, 248, 242, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.56)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(22px) saturate(145%)",
          WebkitBackdropFilter: "blur(22px) saturate(145%)",
          boxShadow: "0 18px 40px rgba(121,76,38,0.12), inset 0 1px 0 rgba(255,255,255,0.42)",
        }
      : {
          shadowColor: "#9F6737",
          shadowOpacity: 0.15,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 12 },
        }),
  },
  wishlistCollectionCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "rgba(255, 248, 242, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.56)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(24px) saturate(145%)",
          WebkitBackdropFilter: "blur(24px) saturate(145%)",
          boxShadow: "0 18px 40px rgba(121,76,38,0.12), inset 0 1px 0 rgba(255,255,255,0.42)",
        }
      : {
          shadowColor: "#9F6737",
          shadowOpacity: 0.16,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
        }),
  },
  wishlistTabsRow: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(72,46,24,0.10)",
  },
  wishlistTab: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  wishlistTabActive: {
    borderBottomColor: C.accent,
  },
  wishlistTabText: {
    color: C.textTertiary,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  wishlistTabTextActive: {
    color: C.text,
  },
  wishlistCardGlowWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  wishlistCardGlowPrimary: {
    position: "absolute",
    top: -52,
    right: -28,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,118,82,0.18)",
    ...(Platform.OS === "web"
      ? { filter: "blur(44px)" }
      : {
          shadowColor: "#FF7652",
          shadowOpacity: 0.18,
          shadowRadius: 36,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  wishlistCardGlowSecondary: {
    position: "absolute",
    bottom: -60,
    left: -26,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: "rgba(200,154,99,0.15)",
    ...(Platform.OS === "web"
      ? { filter: "blur(42px)" }
      : {
          shadowColor: "#C89A63",
          shadowOpacity: 0.15,
          shadowRadius: 34,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  wishlistCardSheen: {
    position: "absolute",
    top: 14,
    left: 18,
    right: 18,
    height: 52,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    ...(Platform.OS === "web"
      ? { filter: "blur(12px)" }
      : {}),
  },
  wishlistToggleRow: {
    marginTop: 12,
    flexDirection: "column",
    gap: 8
  },
  wishlistToggleBtn: {
    width: "100%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.44)",
    backgroundColor: "rgba(255,255,255,0.32)",
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }
      : {}),
  },
  wishlistToggleBtnActive: {
    backgroundColor: C.accent,
    borderColor: C.accent
  },
  wishlistToggleText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  wishlistToggleTextActive: {
    color: "#FFF"
  },
  wishlistManualRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8
  },
  wishlistManualInput: {
    flex: 1
  },
  wishlistManualNotesInput: {
    marginTop: 12,
  },
  wishlistPrimaryBtn: {
    marginTop: 12,
  },
  wishlistMasonryGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  wishlistScoutCard: {
    width: "48%" as any,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.52)",
    backgroundColor: "rgba(255,255,255,0.34)",
    overflow: "hidden",
    ...CARD_SHADOW_LIGHT,
    ...(Platform.OS === "web" ? {
      backdropFilter: "blur(18px) saturate(1.35)",
      WebkitBackdropFilter: "blur(18px) saturate(1.35)",
      boxShadow: "0 12px 28px rgba(88,56,31,0.10), inset 0 1px 0 rgba(255,255,255,0.24)",
    } : {}),
  },
  wishlistScoutVisual: {
    height: 148,
    padding: 14,
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  wishlistScoutVisualText: {
    color: "#F4F5F8",
    fontSize: 20,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  wishlistVisualGradientTop: {
    position: "absolute",
    top: -42,
    left: -36,
    width: 160,
    height: 160,
    borderRadius: 999,
    opacity: 0.52,
    ...(Platform.OS === "web"
      ? { filter: "blur(28px)" }
      : {
          shadowColor: "#FFFFFF",
          shadowOpacity: 0.12,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  wishlistVisualGradientBottom: {
    position: "absolute",
    right: -34,
    bottom: -38,
    width: 170,
    height: 170,
    borderRadius: 999,
    opacity: 0.38,
    ...(Platform.OS === "web"
      ? { filter: "blur(30px)" }
      : {
          shadowColor: "#FFF4EA",
          shadowOpacity: 0.14,
          shadowRadius: 32,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  wishlistVisualGlow: {
    position: "absolute",
    top: "14%",
    left: "18%",
    width: 132,
    height: 132,
    borderRadius: 999,
    opacity: 0.44,
    ...(Platform.OS === "web"
      ? { filter: "blur(22px)" }
      : {
          shadowColor: "#FFF3E7",
          shadowOpacity: 0.22,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  wishlistVisualOrbTopRight: {
    position: "absolute",
    top: 10,
    right: 14,
    width: 76,
    height: 76,
    borderRadius: 999,
    opacity: 0.8,
    backgroundColor: "rgba(255,255,255,0.42)",
    ...(Platform.OS === "web"
      ? { filter: "blur(20px)" }
      : {
          shadowColor: "#FFFFFF",
          shadowOpacity: 0.22,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  wishlistVisualOrbBottomLeft: {
    position: "absolute",
    left: 8,
    bottom: 8,
    width: 92,
    height: 92,
    borderRadius: 999,
    opacity: 0.76,
    backgroundColor: "rgba(255,255,255,0.34)",
    ...(Platform.OS === "web"
      ? { filter: "blur(24px)" }
      : {
          shadowColor: "#FFF7EF",
          shadowOpacity: 0.2,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  wishlistVisualSilhouetteWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  wishlistVisualSilhouetteWrapLarge: {
    paddingTop: 8,
  },
  wishlistVisualIcon: {
    opacity: 0.98,
    textShadowColor: "rgba(0,0,0,0.06)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  wishlistScoutBody: {
    padding: 14,
    gap: 8
  },
  wishlistScoutHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  wishlistScoutTitle: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  wishlistBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  wishlistScoutBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,118,82,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,118,82,0.18)",
  },
  wishlistScoutBadgeText: {
    color: C.accent,
    fontSize: 10,
    fontWeight: "800"
  },
  wishlistScoutBadgeLive: {
    backgroundColor: "rgba(200,154,99,0.14)"
  },
  wishlistScoutBadgeLiveText: {
    color: "#8F673E",
    fontSize: 10,
    fontWeight: "800"
  },
  wishlistScoutMeta: {
    color: C.textSecondary,
    fontSize: 12,
    lineHeight: 17
  },
  wishlistScoutMatch: {
    color: C.textTertiary,
    fontSize: 11,
    lineHeight: 16
  },
  wishlistScoutActions: {
    marginTop: 2,
    flexDirection: "column",
    gap: 8
  },
  wishlistScoutActionGhost: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.46)",
    backgroundColor: "rgba(255,255,255,0.34)",
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }
      : {}),
  },
  wishlistScoutActionGhostText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  wishlistScoutActionPrimary: {
    borderRadius: 999,
    backgroundColor: C.accent,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 10px 24px rgba(255,118,82,0.22), inset 0 1px 0 rgba(255,255,255,0.18)",
        }
      : {}),
  },
  wishlistScoutActionPrimaryText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  wishlistDetailActions: {
    marginTop: 22,
    flexDirection: "column",
    gap: 10,
    alignItems: "stretch",
  },
  wishlistRow: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  wishlistRowTop: {
    flexDirection: "row",
    alignItems: "center"
  },
  wishlistCategory: {
    flex: 1,
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize"
  },
  wishlistDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }
      : {}),
  },
  wishlistDeleteText: {
    color: C.textSecondary,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "700"
  },
  wishlistMeta: {
    marginTop: 2,
    color: C.textTertiary,
    fontSize: 12
  },
  wishlistDetailCard: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "88%" as any,
    ...GLASS_STYLE,
    padding: 18,
    ...CARD_SHADOW
  },
  wishlistDetailCardGlass: {
    position: "relative",
    backgroundColor: "rgba(255, 248, 242, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.54)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(24px) saturate(145%)",
          WebkitBackdropFilter: "blur(24px) saturate(145%)",
          boxShadow: "0 18px 40px rgba(121,76,38,0.14), inset 0 1px 0 rgba(255,255,255,0.42)",
        }
      : {
          shadowColor: "#9F6737",
          shadowOpacity: 0.16,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
        }),
  },
  wishlistDetailScrollContent: {
    paddingBottom: 8,
  },
  wishlistDetailVisual: {
    height: 220,
    borderRadius: 18,
    padding: 18,
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  wishlistDetailVisualText: {
    color: "#F4F5F8",
    fontSize: 28,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  wishlistDetailReasoning: {
    marginTop: 16,
    color: C.textSecondary,
    fontSize: 14,
    lineHeight: 21
  },
  wishlistDetailInfoCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.52)",
    backgroundColor: "rgba(255,255,255,0.34)",
    padding: 14,
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }
      : {}),
  },
  wishlistDetailInfoTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "800"
  },
  wishlistDetailInfoBody: {
    marginTop: 6,
    color: C.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  wishlistDetailPairingRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10
  },
  wishlistDetailPairingCard: {
    flex: 1,
    gap: 6
  },
  wishlistDetailPairingImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    backgroundColor: C.border
  },
  wishlistDetailPairingFallback: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center"
  },
  wishlistDetailPairingTitle: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "700"
  },
  wishlistAgentHint: {
    marginTop: 26,
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: "600"
  },
  ...(createShopStyleDefinitions({
    colors: C,
    cardRadius: CARD_RADIUS,
    cardShadowLight: CARD_SHADOW_LIGHT
  }) as any),

  editorBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 16,
    ...(Platform.OS === "web" ? {
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    } : {}),
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
    ...(Platform.OS === "web" ? {
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    } : {}),
  },
  editorCard: {
    width: "100%",
    maxWidth: 1120,
    maxHeight: "88%",
    ...GLASS_STYLE,
    overflow: "hidden",
    ...CARD_SHADOW
  },
  editItemCardGlass: {
    position: "relative",
    backgroundColor: "rgba(255, 248, 242, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.54)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(24px) saturate(145%)",
          WebkitBackdropFilter: "blur(24px) saturate(145%)",
          boxShadow: "0 18px 40px rgba(121,76,38,0.14), inset 0 1px 0 rgba(255,255,255,0.42)",
        }
      : {
          shadowColor: "#9F6737",
          shadowOpacity: 0.16,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
        }),
  },
  editItemCardGlowWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  editItemCardGlowPrimary: {
    position: "absolute",
    top: -54,
    right: -28,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,118,82,0.18)",
    ...(Platform.OS === "web"
      ? { filter: "blur(44px)" }
      : {
          shadowColor: "#FF7652",
          shadowOpacity: 0.18,
          shadowRadius: 36,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  editItemCardGlowSecondary: {
    position: "absolute",
    bottom: -64,
    left: -30,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: "rgba(200,154,99,0.15)",
    ...(Platform.OS === "web"
      ? { filter: "blur(42px)" }
      : {
          shadowColor: "#C89A63",
          shadowOpacity: 0.16,
          shadowRadius: 34,
          shadowOffset: { width: 0, height: 0 },
        }),
  },
  editItemCardSheen: {
    position: "absolute",
    top: 16,
    left: 18,
    right: 18,
    height: 52,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    ...(Platform.OS === "web"
      ? { filter: "blur(12px)" }
      : {}),
  },
  editorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border
  },
  editorTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "800"
  },
  editItemHeaderText: {
    gap: 0,
  },
  editItemHeaderTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: "700",
    ...(Platform.OS === "web" ? { fontFamily: "'Playfair Display', Georgia, serif" } : {}),
  },
  editItemCloseBtn: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
  },
  editorCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceAlt
  },
  editorCloseText: {
    color: C.textSecondary,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "700"
  },
  editorBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    minHeight: 360
  },
  editorBodyStacked: {
    flexDirection: "column"
  },
  editorPreviewWrap: {
    flex: 1.25,
    minWidth: 320
  },
  editItemPreviewWrap: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  editorPreviewWrapStacked: {
    minWidth: 0
  },
  editorPreviewImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    minHeight: 340,
    borderRadius: 20,
    resizeMode: "cover",
    backgroundColor: C.border
  },
  editorPreviewImageStacked: {
    minHeight: 230,
    maxHeight: 300
  },
  editorPreviewFallback: {
    flex: 1,
    width: "100%",
    height: "100%",
    minHeight: 340,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.border
  },
  editorScroll: {
    flex: 1,
    minWidth: 280
  },
  editorScrollContent: {
    paddingHorizontal: 2,
    paddingBottom: 16,
    paddingTop: 2
  },
  editItemScrollContent: {
    paddingBottom: 18,
  },
  editorLabel: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6
  },
  editItemLabel: {
    color: "#6B584B",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  editorInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14
  },
  editItemInput: {
    borderRadius: 16,
    borderColor: "rgba(255,255,255,0.52)",
    backgroundColor: "rgba(255,255,255,0.34)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }
      : {}),
  },
  editorInputMultiline: {
    minHeight: 84,
    textAlignVertical: "top"
  },
  editorMeta: {
    marginTop: 8,
    color: C.textTertiary,
    fontSize: 11
  },
  editItemMeta: {
    color: "#8F7E72",
  },
  editorActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border
  },
  editorGhostBtn: {
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#F4F4F4",
  },
  editItemGhostBtn: {
    borderRadius: 999,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.34)",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }
      : {}),
  },
  editorGhostText: {
    color: C.textSecondary,
    fontWeight: "700"
  },
  editItemGhostText: {
    fontWeight: "700",
  },
  editorSaveBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  editItemSaveBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 10px 24px rgba(255,118,82,0.24), inset 0 1px 0 rgba(255,255,255,0.18)",
        }
      : {}),
  },
  editorSaveText: {
    color: "#FFF",
    fontWeight: "800"
  },
  editItemSaveText: {
    letterSpacing: 0.2,
  },
  tryOnResultCard: {
    width: "100%",
    maxWidth: 820,
    ...GLASS_STYLE,
    overflow: "hidden",
    ...CARD_SHADOW
  },
  tryOnResultImage: {
    width: "100%",
    height: 560,
    maxHeight: "82%" as any,
    backgroundColor: C.border
  },
  stylistCard: {
    width: "100%",
    maxWidth: 1280,
    height: "72%",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderBottomWidth: 0,
    overflow: "hidden",
    ...CARD_SHADOW,
    ...(Platform.OS === "web" ? {
      backdropFilter: "blur(24px) saturate(1.4)",
      WebkitBackdropFilter: "blur(24px) saturate(1.4)",
    } : {}),
  },
  stylistCloseFloating: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 5
  },
  stylistVoiceStage: {
    flex: 1,
    minHeight: 460,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24
  },
  stylistVoiceHalo: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 999,
    backgroundColor: "rgba(255,118,82,0.1)",
    ...(Platform.OS === "web" ? {
      boxShadow: "0 0 60px rgba(255,118,82,0.15)",
    } : {}),
  },
  stylistVoiceHaloOuter: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: "rgba(255,118,82,0.06)"
  },
  stylistVoiceCore: {
    width: 138,
    height: 138,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accent,
    ...CARD_SHADOW
  },
  stylistVoiceCoreIdle: {
    backgroundColor: "rgba(255,118,82,0.15)"
  },
  stylistVoiceCoreDot: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#FFF",
    opacity: 0.95
  },
  stylistOverlayCards: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center"
  },
  stylistOverlayCard: {
    position: "absolute",
    width: 156,
    height: 202,
    borderRadius: 20,
    backgroundColor: "#F4F4F4",
    borderWidth: 1,
    borderColor: C.glassBorder,
    padding: 5,
    ...CARD_SHADOW_LIGHT
  },
  stylistOverlayImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: C.border
  },
  stylistOverlayFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: C.border
  },
  stylistSuggestionPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6
  },
  stylistWebResultsPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 128,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6
  },
  stylistSuggestionTitle: {
    color: C.text,
    fontSize: 12,
    fontWeight: "800"
  },
  stylistWebQueryText: {
    color: C.textSecondary,
    fontSize: 11,
    lineHeight: 15
  },
  stylistSuggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  stylistSuggestionTextWrap: {
    flex: 1,
    gap: 2
  },
  stylistSuggestionText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "600"
  },
  stylistSuggestionMeta: {
    color: C.text,
    fontSize: 11,
    fontWeight: "700"
  },
  stylistSuggestionStoreLine: {
    color: C.accent,
    fontSize: 11,
    fontWeight: "700"
  },
  stylistSuggestionMatchLine: {
    color: C.textSecondary,
    fontSize: 11,
    lineHeight: 15
  },
  stylistSuggestionUrl: {
    color: C.accent,
    fontSize: 11,
    fontWeight: "600"
  },
  stylistSuggestionLinkBtn: {
    borderRadius: 8,
    backgroundColor: C.accentLight,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  stylistSuggestionLinkText: {
    color: C.accent,
    fontSize: 11,
    fontWeight: "800"
  },
  stylistActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border
  },
  stylistIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
    justifyContent: "center"
  },
  stylistIconBtnActive: {
    backgroundColor: C.accentLight,
    borderColor: "#FFD4C7"
  },
  stylistIconBtnDisabled: {
    opacity: 0.4
  },
  stylistMicStem: {
    width: 12,
    height: 16,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.text,
    marginBottom: 2
  },
  stylistMicBase: {
    width: 12,
    height: 2,
    borderRadius: 2,
    backgroundColor: C.text
  },
  stylistSpeakerBody: {
    width: 10,
    height: 11,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    backgroundColor: C.text,
    marginRight: 8
  },
  stylistSpeakerWaveA: {
    position: "absolute",
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 8,
    borderWidth: 1.6,
    borderColor: C.text,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
    transform: [{ rotate: "45deg" }]
  },
  stylistSpeakerWaveB: {
    position: "absolute",
    right: 4,
    width: 13,
    height: 13,
    borderRadius: 13,
    borderWidth: 1.4,
    borderColor: C.text,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
    transform: [{ rotate: "45deg" }]
  },
  stylistReconnectBtn: {
    marginLeft: "auto",
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  stylistReconnectRing: {
    width: 17,
    height: 17,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#FFF",
    borderRightColor: "transparent",
    transform: [{ rotate: "20deg" }]
  },
  stylistReconnectArrow: {
    position: "absolute",
    top: 11,
    right: 9,
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#FFF"
  },

  /* ── Placeholder tabs ────────────────────────────── */
  placeholderCard: {
    backgroundColor: C.surface,
    borderRadius: CARD_RADIUS,
    padding: 24,
    ...CARD_SHADOW_LIGHT
  },
  placeholderCardDark: {
    backgroundColor: "#F4F4F4",
    borderWidth: 1,
    borderColor: "#E5E5E5"
  },
  placeholderTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8
  },
  placeholderTitleDark: {
    color: "#1A1A1A"
  },
  placeholderBody: {
    color: C.textSecondary,
    marginBottom: 14,
    lineHeight: 20
  },
  placeholderBodyDark: {
    color: "#6B7280"
  },
  placeholderTag: {
    alignSelf: "flex-start",
    backgroundColor: C.accentLight,
    color: C.accent,
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: "700",
    fontSize: 12
  },
  placeholderTagDark: {
    backgroundColor: "#FFF0EB",
    color: "#684BF3"
  },

  /* ── Bottom nav ──────────────────────────────────── */
  bottomNav: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 6,
    marginHorizontal: 12,
    marginBottom: 8,
    alignItems: "flex-end",
    ...GLASS_STYLE,
    borderRadius: 28,
    ...(Platform.OS === "web" ? {
      boxShadow: "0 -4px 24px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.08)",
      backgroundColor: "rgba(255,255,255,0.92)",
    } : {}),
  },
  navTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10
  },
  navCenterSlot: {
    width: 92,
    alignItems: "center",
    justifyContent: "flex-start"
  },
  navCenterBtn: {
    marginTop: -28,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
    ...CARD_SHADOW,
    ...(Platform.OS === "web" ? {
      boxShadow: "0 4px 20px rgba(255,118,82,0.2), 0 4px 40px rgba(104,75,243,0.1), 0 2px 8px rgba(0,0,0,0.06)",
    } : {}),
  },
  navCenterOrb: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 999,
    ...(Platform.OS === "web" ? {
      backgroundImage: "radial-gradient(circle, rgba(255,118,82,0.3), rgba(222,189,85,0.25), rgba(104,75,243,0.15), transparent)",
    } as any : {
      backgroundColor: "rgba(255,118,82,0.15)",
    }),
  },
  navCenterBtnText: {
    color: "#1A1A1A",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.6,
    ...(Platform.OS === "web" ? { fontFamily: "'Playfair Display', Georgia, serif" } : {}),
  },
  navCenterBtnSubtext: {
    marginTop: 2,
    color: C.textTertiary,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  navIndicator: {
    position: "absolute",
    top: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
    ...(Platform.OS === "web" ? {
      boxShadow: `0 0 8px rgba(255,118,82,0.4)`,
    } : {}),
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textTertiary,
    marginTop: 4,
    ...(Platform.OS === "web" ? { fontFamily: "'Inter', sans-serif" } : {}),
  },
  navLabelActive: {
    color: C.text,
    fontWeight: "700"
  },
  closetScanFab: {
    position: "absolute",
    right: 18,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    ...CARD_SHADOW,
    ...(Platform.OS === "web" ? {
      boxShadow: "0 4px 20px rgba(255,118,82,0.3), 0 2px 8px rgba(0,0,0,0.08)",
    } : {}),
  },
  closetScanFabText: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "600"
  },

  /* ── Scan session overlay ────────────────────────── */
  scanSessionRoot: {
    flex: 1,
    backgroundColor: "#000"
  },
  cameraFullscreen: {
    ...StyleSheet.absoluteFillObject
  },
  scanTopBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center"
  },
  topPill: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8
  },
  topPillActive: {
    backgroundColor: "rgba(255, 118, 82, 0.85)"
  },
  topPillText: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 13,
    fontWeight: "700"
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    marginRight: 8
  },
  statusDotLive: {
    backgroundColor: C.success
  },
  statusDotError: {
    backgroundColor: C.error
  },
  closePill: {
    marginLeft: "auto",
    backgroundColor: "rgba(180, 50, 30, 0.85)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  closePillText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700"
  },
  reticule: {
    position: "absolute",
    top: "28%",
    left: "10%",
    width: "80%",
    height: "34%",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)"
  },
  scanBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: "rgba(0, 0, 0, 0.55)"
  },
  agentText: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
    marginBottom: 12
  },

  /* ── Live item card (scan overlay) ───────────────── */
  liveCard: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.60)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 10,
    marginBottom: 12
  },
  liveCardThumbWrap: {
    width: 80,
    height: 96,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12
  },
  liveCardThumb: {
    width: 80,
    height: 96,
    borderRadius: 12
  },
  liveCardThumbEmpty: {
    width: 80,
    height: 96,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  liveCardReadyBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: "rgba(74, 222, 128, 0.85)",
    borderRadius: 6,
    paddingVertical: 2,
    alignItems: "center"
  },
  liveCardReadyText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800"
  },
  liveCardFields: {
    flex: 1,
    justifyContent: "center"
  },
  liveCardTitle: {
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4
  },
  liveCardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2
  },
  liveCardLabel: {
    width: 60,
    color: "rgba(255, 255, 255, 0.50)",
    fontSize: 11,
    fontWeight: "600"
  },
  liveCardValue: {
    flex: 1,
    color: "rgba(255, 255, 255, 0.90)",
    fontSize: 12,
    fontWeight: "600"
  },
  liveCardValuePending: {
    color: "rgba(255, 255, 255, 0.30)",
    fontStyle: "italic"
  },

  /* ── Last saved fallback row ─────────────────────── */
  lastSavedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  lastSavedThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 10
  },
  lastSavedText: {
    flex: 1,
    color: "rgba(255, 255, 255, 0.70)",
    fontSize: 13,
    fontWeight: "600"
  },

  /* ── Scan controls ───────────────────────────────── */
  controlRow: {
    flexDirection: "row",
    marginBottom: 10
  },
  controlPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginRight: 8
  },
  controlPillActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)"
  },
  controlPillText: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 13,
    fontWeight: "700"
  },
  finishBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: C.accent
  },
  finishBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800"
  },
  dimmed: {
    opacity: 0.5
  }
});

export type AppStyles = typeof styles;
