import React, { useCallback, useMemo, useRef } from "react";
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { glassStyle } from "../../design/glass";
import { colors, typography, spacing, radii } from "../../design/tokens";
import { LIQUID_SPRING } from "../../design/animations";

/* ── Types ──────────────────────────────────────────────────── */

type Tab = "home" | "closet" | "wishlist" | "shop";

type BottomNavProps = {
  activeTab: Tab;
  onTabPress: (tab: Tab) => void;
  onPortalPress: () => void;
  activeAgentSession: string | null;
};

/* ── Icon mapping ───────────────────────────────────────────── */

const TAB_ICONS: Record<Tab, { active: any; inactive: any }> = {
  home: {
    active: require("../../assets/nav/home.png"),
    inactive: require("../../assets/nav/grayscale/home.png"),
  },
  closet: {
    active: require("../../assets/nav/closet.png"),
    inactive: require("../../assets/nav/grayscale/closet.png"),
  },
  wishlist: {
    active: require("../../assets/nav/wishlist.png"),
    inactive: require("../../assets/nav/grayscale/wishlist.png"),
  },
  shop: {
    active: require("../../assets/nav/shop.png"),
    inactive: require("../../assets/nav/grayscale/shop.png"),
  },
};

const TAB_LABELS: Record<Tab, string> = {
  home: "Home",
  closet: "Closet",
  wishlist: "Wishlist",
  shop: "Shop",
};

const TAB_ORDER: Tab[] = ["home", "closet", "wishlist", "shop"];
const PORTAL_LOGO = require("../../assets/logo.png");

/* ── Animated Tab Button ────────────────────────────────────── */

type TabButtonProps = {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
};

function TabButton({ tab, isActive, onPress }: TabButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      ...LIQUID_SPRING,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      ...LIQUID_SPRING,
    }).start();
  }, [scaleAnim]);

  const labelColor = isActive ? colors.text : colors.textTertiary;
  const iconStyle = isActive ? styles.tabIconActive : styles.tabIconInactive;
  const iconSource = isActive ? TAB_ICONS[tab].active : TAB_ICONS[tab].inactive;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabPressable}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={TAB_LABELS[tab]}
    >
      <Animated.View
        style={[styles.tabInner, { transform: [{ scale: scaleAnim }] }]}
      >
        {/* Active glow dot */}
        {isActive && (
          <View style={styles.glowDotContainer}>
            <View style={styles.glowDot} />
          </View>
        )}

        <Image source={iconSource} style={[styles.tabIcon, iconStyle]} resizeMode="contain" />

        <Text
          style={[
            styles.tabLabel,
            { color: labelColor },
            isActive && styles.tabLabelActive,
          ]}
          numberOfLines={1}
        >
          {TAB_LABELS[tab]}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/* ── Center Orb Button ──────────────────────────────────────── */

type CenterOrbProps = {
  onPress: () => void;
  activeAgentSession: string | null;
};

function CenterOrb({ onPress, activeAgentSession }: CenterOrbProps) {
  const sessionLabel = activeAgentSession || "portal";

  return (
    <View style={styles.centerSlot}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Winnie AI ${sessionLabel}`}
      >
        <View style={styles.centerOrbWrapper}>
          <View style={styles.centerOrbButton}>
            <Image source={PORTAL_LOGO} style={styles.orbLogo} resizeMode="contain" />
          </View>
        </View>
      </Pressable>
      <Text style={styles.orbSubtext} numberOfLines={1}>
        {sessionLabel}
      </Text>
    </View>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export default function BottomNav({
  activeTab,
  onTabPress,
  onPortalPress,
  activeAgentSession,
}: BottomNavProps) {
  const glassNavStyle = useMemo(() => glassStyle("navBar"), []);

  const leftTabs = TAB_ORDER.slice(0, 2);
  const rightTabs = TAB_ORDER.slice(2);

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View style={[glassNavStyle, styles.navBar]}>
        {/* Left tabs */}
        {leftTabs.map((tab) => (
          <TabButton
            key={tab}
            tab={tab}
            isActive={activeTab === tab}
            onPress={() => onTabPress(tab)}
          />
        ))}

        {/* Center orb */}
        <CenterOrb
          onPress={onPortalPress}
          activeAgentSession={activeAgentSession}
        />

        {/* Right tabs */}
        {rightTabs.map((tab) => (
          <TabButton
            key={tab}
            tab={tab}
            isActive={activeTab === tab}
            onPress={() => onTabPress(tab)}
          />
        ))}
      </View>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */

const NAV_HEIGHT = 68;
const NAV_MARGIN_H = spacing.md;
const NAV_MARGIN_BOTTOM = Platform.select({ web: spacing.md, default: spacing.xl });
const GLOW_DOT_SIZE = 5;
const ORB_LIFT = 14; // how far the center orb floats above the bar

const styles = StyleSheet.create({
  /* Outer wrapper: absolute-positioned, full-width, lets touches pass through */
  outerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: NAV_MARGIN_BOTTOM,
    paddingHorizontal: NAV_MARGIN_H,
    alignItems: "center",
  },

  /* The glass bar itself */
  navBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: NAV_HEIGHT,
    width: "100%",
    maxWidth: 480,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xs,
    paddingBottom: Platform.select({ web: spacing.sm, default: spacing.xs }),
    alignSelf: "center",
    overflow: "visible",
    ...Platform.select({
      web: {
        boxShadow: "0 20px 44px rgba(67,44,31,0.14), inset 0 1px 0 rgba(255,248,241,0.4)",
      } as any,
      default: {},
    }),
  },

  /* Individual tab pressable */
  tabPressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    paddingBottom: spacing.xs,
  },

  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },

  tabIcon: {
    marginBottom: 2,
    width: 24,
    height: 24,
  },

  tabIconActive: {
    opacity: 1,
  },

  tabIconInactive: {
    opacity: 0.92,
  },

  tabLabel: {
    fontFamily: typography.bodySemiBold.fontFamily,
    fontSize: typography.sizes.micro,
    letterSpacing: 0.2,
    textAlign: "center",
  },

  tabLabelActive: {
    color: colors.text,
  },

  /* Active glow dot */
  glowDotContainer: {
    position: "absolute",
    top: -2,
    alignSelf: "center",
    alignItems: "center",
  },

  glowDot: {
    width: GLOW_DOT_SIZE,
    height: GLOW_DOT_SIZE,
    borderRadius: GLOW_DOT_SIZE / 2,
    backgroundColor: colors.accent,
    ...Platform.select({
      web: {
        boxShadow: `0 0 8px ${colors.accent}, 0 0 16px ${colors.accent}55`,
      } as any,
      default: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 4,
      },
    }),
  },

  /* Center orb area */
  centerSlot: {
    alignItems: "center",
    justifyContent: "flex-end",
    width: 72,
    marginHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },

  centerOrbWrapper: {
    marginBottom: ORB_LIFT,
    alignItems: "center",
    justifyContent: "center",
  },

  centerOrbButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    ...Platform.select({
      web: {
        boxShadow:
          "0 0 26px rgba(255,118,82,0.34), 0 10px 24px rgba(67,44,31,0.12)",
      } as any,
      default: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.34,
        shadowRadius: 18,
        elevation: 10,
      },
    }),
  },

  orbLogo: {
    width: 52,
    height: 52,
    zIndex: 1,
  },

  orbSubtext: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.sizes.micro - 1,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: -ORB_LIFT + 2,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
