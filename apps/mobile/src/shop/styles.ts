import { Platform, StyleSheet } from "react-native";

type ShopColors = {
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentLight: string;
  border: string;
  error: string;
};

type CardShadowLight = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export function createShopStyleDefinitions({
  colors,
  cardRadius,
  cardShadowLight,
}: {
  colors: ShopColors;
  cardRadius: number;
  cardShadowLight: CardShadowLight;
}) {
  return {
    shopDashboardScreen: {
      flex: 1,
      minHeight: 720,
    },
    shopMapFoundation: {
      flex: 1,
      minHeight: 720,
      borderRadius: 34,
      overflow: "hidden",
      backgroundColor: "rgba(255,248,242,0.34)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.56)",
      ...cardShadowLight,
      ...(Platform.OS === "web"
        ? {
            backdropFilter: "blur(24px) saturate(145%)",
            WebkitBackdropFilter: "blur(24px) saturate(145%)",
            boxShadow: "0 22px 44px rgba(121,76,38,0.14), inset 0 1px 0 rgba(255,255,255,0.38)",
          }
        : {
            shadowColor: "#9F6737",
            shadowOpacity: 0.18,
            shadowRadius: 26,
            shadowOffset: { width: 0, height: 14 },
          }),
    },
    shopMapContentLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    shopMapFoundationImage: {
      ...StyleSheet.absoluteFillObject,
    },
    shopMapFoundationEmpty: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    shopMapTint: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(88,52,26,0.10)",
    },
    shopMapGestureLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    shopMarkerHitLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    shopMarkerHitArea: {
      position: "absolute",
      width: 36,
      height: 44,
      backgroundColor: "transparent",
    },
    shopMapCard: {
      borderRadius: cardRadius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
      ...cardShadowLight,
    },
    shopDashboardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: 12,
    },
    shopBackRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
    },
    shopMapLabelWrap: {
      minWidth: 0,
      flexShrink: 1,
      gap: 1,
    },
    shopMapLabelTitle: {
      color: "#20140E",
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 22,
    },
    shopMapLabelBeta: {
      color: "#FF7652",
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "lowercase",
    },
    shopDashboardTopOverlay: {
      position: "absolute",
      top: 18,
      left: 18,
      right: 18,
      gap: 10,
    },
    shopDashboardTopPanel: {
      borderRadius: 26,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.54)",
      backgroundColor: "rgba(255,248,242,0.56)",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      ...(Platform.OS === "web"
        ? {
            backdropFilter: "blur(20px) saturate(145%)",
            WebkitBackdropFilter: "blur(20px) saturate(145%)",
            boxShadow: "0 18px 40px rgba(121,76,38,0.12), inset 0 1px 0 rgba(255,255,255,0.34)",
          }
        : {
            shadowColor: "#9F6737",
            shadowOpacity: 0.14,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
          }),
    },
    shopDashboardEyebrow: {
      color: "rgba(95,74,57,0.72)",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.1,
      textTransform: "uppercase",
    },
    shopDashboardTitle: {
      color: "#20140E",
      fontSize: 25,
      fontWeight: "800",
    },
    shopTopActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    shopTopPill: {
      minHeight: 38,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.5)",
      backgroundColor: "rgba(255,255,255,0.34)",
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      ...(Platform.OS === "web"
        ? {
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }
        : {}),
    },
    shopTopPillActive: {
      backgroundColor: "rgba(255,118,82,0.16)",
      borderColor: "rgba(255,118,82,0.34)",
    },
    shopTopPillText: {
      color: "#433126",
      fontSize: 12,
      fontWeight: "800",
    },
    shopTopPillTextActive: {
      color: "#FF7652",
    },
    shopSearchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    shopSearchStack: {
      gap: 8,
    },
    shopSearchInput: {
      flex: 1,
      minHeight: 42,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.52)",
      backgroundColor: "rgba(255,255,255,0.34)",
      paddingHorizontal: 16,
      color: "#2B1A12",
      fontSize: 13,
      fontWeight: "700",
      ...(Platform.OS === "web"
        ? {
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }
        : {}),
    },
    shopSearchClearBtn: {
      minHeight: 42,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.52)",
      backgroundColor: "rgba(255,255,255,0.34)",
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      ...(Platform.OS === "web"
        ? {
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }
        : {}),
    },
    shopSearchClearText: {
      color: "rgba(95,74,57,0.82)",
      fontSize: 12,
      fontWeight: "800",
    },
    shopSearchToggleBtn: {
      minHeight: 42,
      borderRadius: 999,
      backgroundColor: "rgba(255,118,82,0.14)",
      borderWidth: 1,
      borderColor: "rgba(255,118,82,0.24)",
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    shopSearchToggleText: {
      color: "#7A4127",
      fontSize: 12,
      fontWeight: "800",
    },
    shopSearchMetaPill: {
      alignSelf: "flex-start",
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.32)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.48)",
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    shopSearchMetaText: {
      color: "rgba(95,74,57,0.76)",
      fontSize: 11,
      fontWeight: "700",
    },
    shopMapRefreshBtn: {
      alignSelf: "flex-start",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.46)",
      backgroundColor: "#FF7652",
      paddingHorizontal: 14,
      paddingVertical: 9,
      ...(Platform.OS === "web"
        ? {
            boxShadow: "0 10px 24px rgba(255,118,82,0.24), inset 0 1px 0 rgba(255,255,255,0.18)",
          }
        : {
            shadowColor: "#FF7652",
            shadowOpacity: 0.22,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
          }),
    },
    shopMapRefreshText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },
    shopMapView: {
      width: "100%",
      height: 280,
    },
    shopMapFallback: {
      width: "100%",
      height: 280,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      backgroundColor: colors.surfaceAlt,
    },
    shopMapFallbackImage: {
      ...StyleSheet.absoluteFillObject,
    },
    shopMapFallbackText: {
      color: "#6A5547",
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: "rgba(255,250,246,0.88)",
    },
    shopMapDragHint: {
      alignSelf: "flex-start",
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.30)",
      color: "rgba(95,74,57,0.82)",
      fontSize: 11,
      fontWeight: "700",
      paddingHorizontal: 12,
      paddingVertical: 6,
      ...(Platform.OS === "web"
        ? {
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }
        : {}),
    },
    shopBottomHud: {
      position: "absolute",
      left: 18,
      right: 18,
      bottom: 92,
      gap: 12,
    },
    shopBottomHudPanel: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.54)",
      backgroundColor: "rgba(255,248,242,0.62)",
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
      ...(Platform.OS === "web"
        ? {
            backdropFilter: "blur(22px) saturate(145%)",
            WebkitBackdropFilter: "blur(22px) saturate(145%)",
            boxShadow: "0 18px 40px rgba(121,76,38,0.12), inset 0 1px 0 rgba(255,255,255,0.36)",
          }
        : {
            shadowColor: "#9F6737",
            shadowOpacity: 0.15,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
          }),
    },
    shopLaunchFloatingCard: {
      alignSelf: "stretch",
      borderRadius: 24,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.1)",
      paddingHorizontal: 18,
      paddingVertical: 16,
      ...cardShadowLight,
    },
    shopLaunchFloatingEyebrow: {
      color: "#9CA3AF",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    shopLaunchFloatingTitle: {
      marginTop: 4,
      color: "#1A1A1A",
      fontSize: 20,
      fontWeight: "900",
    },
    shopLaunchFloatingBody: {
      marginTop: 6,
      color: "#6B7280",
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
    },
    shopInlineStatus: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.34)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.5)",
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    shopInlineStatusText: {
      color: "#6A5547",
      fontSize: 12,
      fontWeight: "700",
    },
    shopInlineErrorText: {
      alignSelf: "flex-start",
      color: "#A54E39",
      fontSize: 12,
      fontWeight: "700",
      borderRadius: 14,
      backgroundColor: "rgba(255,236,229,0.84)",
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    shopInlineHintText: {
      alignSelf: "flex-start",
      color: "#6A5547",
      fontSize: 11,
      fontWeight: "700",
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.30)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.46)",
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    shopCarouselContent: {
      paddingRight: 8,
      paddingBottom: 6,
      gap: 14,
    },
    shopScoutCard: {
      borderRadius: 28,
      backgroundColor: "rgba(255,248,242,0.66)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.56)",
      paddingHorizontal: 18,
      paddingVertical: 16,
      minHeight: 228,
      ...cardShadowLight,
      ...(Platform.OS === "web"
        ? {
            backdropFilter: "blur(20px) saturate(145%)",
            WebkitBackdropFilter: "blur(20px) saturate(145%)",
            boxShadow: "0 16px 34px rgba(121,76,38,0.12), inset 0 1px 0 rgba(255,255,255,0.34)",
          }
        : {}),
    },
    shopScoutCardActive: {
      borderColor: "#FF7652",
      shadowColor: "#FF7652",
      shadowOpacity: 0.18,
      shadowRadius: 18,
    },
    shopScoutHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    shopScoutHeaderText: {
      flex: 1,
    },
    shopScoutStoreName: {
      color: "#20140E",
      fontSize: 18,
      fontWeight: "800",
    },
    shopScoutStoreMeta: {
      marginTop: 4,
      color: "#806654",
      fontSize: 12,
      fontWeight: "700",
    },
    shopFavoriteBtn: {
      width: 34,
      height: 34,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.52)",
      backgroundColor: "rgba(255,255,255,0.32)",
      alignItems: "center",
      justifyContent: "center",
    },
    shopFavoriteBtnActive: {
      backgroundColor: "rgba(255,118,82,0.14)",
      borderColor: "rgba(255,118,82,0.26)",
    },
    shopFavoriteBtnText: {
      color: "#C45D4F",
      fontSize: 16,
      fontWeight: "900",
    },
    shopScoutVibe: {
      marginTop: 14,
      color: "#6E594B",
      fontSize: 12,
      lineHeight: 18,
    },
    shopScoutInsightEyebrow: {
      marginTop: 14,
      color: "#FF7652",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.8,
    },
    shopScoutInsightTitle: {
      marginTop: 6,
      color: "#20140E",
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "800",
    },
    shopScoutFooter: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    shopScoutFooterLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    shopScoutScoreBadge: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    shopScoutScoreText: {
      fontSize: 11,
      fontWeight: "900",
    },
    shopScoutScoreTextLight: {
      color: "#FFFFFF",
    },
    shopScoutScoreTextDark: {
      color: "#4E2C18",
    },
    shopScoutWhyBtn: {
      width: 28,
      height: 28,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.5)",
      backgroundColor: "rgba(255,255,255,0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    shopScoutWhyBtnText: {
      color: "#FF7652",
      fontSize: 13,
      fontWeight: "900",
    },
    shopScoutActionsRow: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    shopScoutLiveBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: 16,
      backgroundColor: "#FF7652",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      ...(Platform.OS === "web"
        ? {
            boxShadow: "0 10px 24px rgba(255,118,82,0.22), inset 0 1px 0 rgba(255,255,255,0.18)",
          }
        : {}),
    },
    shopScoutLiveBtnText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },
    shopInsightModalCard: {
      width: "100%",
      maxWidth: 420,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.56)",
      backgroundColor: "rgba(255,248,242,0.72)",
      paddingHorizontal: 20,
      paddingVertical: 18,
      ...cardShadowLight,
      ...(Platform.OS === "web"
        ? {
            backdropFilter: "blur(24px) saturate(145%)",
            WebkitBackdropFilter: "blur(24px) saturate(145%)",
            boxShadow: "0 22px 44px rgba(121,76,38,0.14), inset 0 1px 0 rgba(255,255,255,0.38)",
          }
        : {}),
    },
    shopInsightModalHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    shopInsightModalTitle: {
      color: "#20140E",
      fontSize: 20,
      fontWeight: "800",
    },
    shopInsightModalMeta: {
      marginTop: 4,
      color: "#806654",
      fontSize: 12,
      fontWeight: "700",
    },
    shopInsightModalScore: {
      marginTop: 14,
      color: "#FF7652",
      fontSize: 13,
      fontWeight: "900",
    },
    shopInsightModalBody: {
      marginTop: 12,
      color: "#6E594B",
      fontSize: 14,
      lineHeight: 22,
    },
    shopMarkerWrap: {
      position: "absolute",
      width: 26,
      height: 26,
      alignItems: "center",
      justifyContent: "center",
    },
    shopMarkerCore: {
      width: 18,
      height: 18,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.95)",
      shadowColor: "#000000",
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 4,
    },
    shopMarkerHigh: {
      backgroundColor: "#4CAF50",
    },
    shopMarkerMid: {
      backgroundColor: "#FF7652",
    },
    shopMarkerLow: {
      backgroundColor: "#9CA3AF",
    },
    shopMarkerSelected: {
      transform: [{ scale: 1.22 }],
    },
    shopMarkerSparkle: {
      position: "absolute",
      top: -8,
      right: -6,
      width: 16,
      height: 16,
      borderRadius: 999,
      backgroundColor: "rgba(255,118,82,0.12)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.95)",
    },
    shopMarkerSparkleText: {
      color: "#FF7652",
      fontSize: 9,
      fontWeight: "900",
    },
    shopSelectedStoreCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    shopSelectedStoreTextWrap: {
      flex: 1,
    },
    shopSelectedStoreName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800",
    },
    shopSelectedStoreMeta: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: 12,
    },
    shopDashboardBody: {
      flex: 1,
    },
    shopDashboardBodyContent: {
      gap: 10,
      paddingBottom: 14,
    },
    shopLaunchCard: {
      borderRadius: cardRadius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      ...cardShadowLight,
    },
    shopLaunchTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
    },
    shopLaunchSubtitle: {
      marginTop: 6,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    shopLaunchBtn: {
      marginTop: 12,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
      paddingVertical: 11,
    },
    shopLaunchBtnText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
    shopNearbyCard: {
      borderRadius: cardRadius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      ...cardShadowLight,
    },
    shopNearbyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "800",
    },
    shopNearbyLoadingRow: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    shopNearbyLoadingText: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    shopNearbyErrorText: {
      marginTop: 10,
      color: colors.error,
      fontSize: 12,
      fontWeight: "600",
    },
    shopNearbyEmptyText: {
      marginTop: 10,
      color: colors.textSecondary,
      fontSize: 12,
    },
    shopStoreRow: {
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 10,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    shopStoreRowActive: {
      borderColor: colors.accent,
    },
    shopStoreRowText: {
      flex: 1,
    },
    shopStoreNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    shopStoreName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
    },
    shopStoreMatchChip: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    shopStoreCategoryChip: {
      backgroundColor: "rgba(255,118,82,0.1)",
    },
    shopStoreScoreChip: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    shopStoreScoreHigh: {
      backgroundColor: "#4D8A55",
    },
    shopStoreScoreMid: {
      backgroundColor: "#F2C777",
    },
    shopStoreScoreLow: {
      backgroundColor: "#E9B4A6",
    },
    shopStoreMatchChipText: {
      color: colors.text,
      fontSize: 10,
      fontWeight: "800",
    },
    shopStoreScoreChipText: {
      color: colors.text,
      fontSize: 10,
      fontWeight: "800",
    },
    shopStoreMeta: {
      marginTop: 2,
      color: colors.textSecondary,
      fontSize: 12,
    },
    shopStoreVibeText: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
      fontStyle: "italic",
    },
    shopStoreTagsRow: {
      marginTop: 6,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    shopStoreTagPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.5)",
      backgroundColor: "rgba(255,255,255,0.30)",
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    shopStoreTagText: {
      color: "#6A5547",
      fontSize: 10,
      fontWeight: "700",
    },
    shopStoreOpenBtn: {
      minHeight: 44,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.52)",
      backgroundColor: "rgba(255,255,255,0.32)",
      paddingHorizontal: 14,
      paddingVertical: 6,
      alignItems: "center",
      justifyContent: "center",
      ...(Platform.OS === "web"
        ? {
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }
        : {}),
    },
    shopStoreOpenText: {
      color: "#433126",
      fontSize: 12,
      fontWeight: "800",
    },
    shopScreen: {
      flex: 1,
      borderRadius: cardRadius,
      overflow: "hidden",
      backgroundColor: "rgba(37,24,17,0.94)",
    },
    shopCamera: {
      ...StyleSheet.absoluteFillObject,
    },
    shopTopBar: {
      position: "absolute",
      left: 12,
      right: 12,
      top: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    shopBackBtn: {
      borderRadius: 999,
      backgroundColor: "rgba(255,248,242,0.2)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.28)",
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    shopBackBtnText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
    },
    shopStatusPill: {
      borderRadius: 999,
      backgroundColor: "rgba(255,248,242,0.18)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.24)",
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    shopStatusText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
    },
    shopBottomOverlay: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 12,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.22)",
      backgroundColor: "rgba(36,25,18,0.46)",
      ...(Platform.OS === "web"
        ? {
            backdropFilter: "blur(18px) saturate(145%)",
            WebkitBackdropFilter: "blur(18px) saturate(145%)",
          }
        : {}),
    },
    shopHintText: {
      color: "rgba(255,255,255,0.92)",
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 8,
    },
    shopSuggestionRow: {
      gap: 8,
      paddingBottom: 8,
    },
    shopSuggestionCard: {
      width: 108,
      borderRadius: 16,
      backgroundColor: "rgba(255,248,242,0.24)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      padding: 5,
    },
    shopSuggestionImage: {
      width: "100%",
      height: 122,
      borderRadius: 8,
      backgroundColor: colors.border,
    },
    shopSuggestionImageFallback: {
      width: "100%",
      height: 122,
      borderRadius: 8,
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    shopSuggestionTitle: {
      marginTop: 5,
      color: colors.text,
      fontSize: 11,
      fontWeight: "700",
    },
    shopActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    shopActionPrimary: {
      flex: 1,
      borderRadius: 16,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      paddingVertical: 12,
    },
    shopActionPrimaryText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
    shopActionSecondary: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.28)",
      backgroundColor: "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    shopActionSecondaryText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },
    shopActionIcon: {
      width: 62,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.24)",
      backgroundColor: "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 11,
    },
    shopActionIconActive: {
      borderColor: "rgba(255,118,82,0.3)",
      backgroundColor: colors.accentLight,
    },
    shopActionIconDisabled: {
      opacity: 0.45,
    },
    shopActionIconText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "800",
    },
  };
}
