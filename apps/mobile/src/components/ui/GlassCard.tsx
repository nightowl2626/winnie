import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { colors, radii, shadows } from "../../design/tokens";

type Props = {
  style?: StyleProp<ViewStyle>;
  variant?: "card" | "portalTile";
  glow?: string;
  dark?: boolean;
  glowWrapStyle?: StyleProp<ViewStyle>;
  glowPrimaryStyle?: StyleProp<ViewStyle>;
  glowSecondaryStyle?: StyleProp<ViewStyle>;
  sheenStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export default function GlassCard(props: Props) {
  return (
    <View
      style={[
        styles.base,
        props.variant === "portalTile" ? styles.portalTile : styles.card,
        props.dark ? styles.dark : null,
        props.glow ? shadows.glow(props.glow) : null,
        props.style,
      ]}
    >
      {props.glowWrapStyle ? (
        <View pointerEvents="none" style={props.glowWrapStyle}>
          {props.glowPrimaryStyle ? <View style={props.glowPrimaryStyle} /> : null}
          {props.glowSecondaryStyle ? <View style={props.glowSecondaryStyle} /> : null}
          {props.sheenStyle ? <View style={props.sheenStyle} /> : null}
        </View>
      ) : null}
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    borderWidth: 1,
  },
  card: {
    backgroundColor: "rgba(255,248,241,0.72)",
    borderColor: colors.glassBorder,
    borderRadius: radii.card,
    ...shadows.cardLight,
  },
  portalTile: {
    backgroundColor: "rgba(255,248,241,0.62)",
    borderColor: colors.glassBorderSubtle,
    borderRadius: radii.xl,
    ...shadows.card,
  },
  dark: {
    backgroundColor: "rgba(44,36,30,0.72)",
    borderColor: "rgba(255,255,255,0.08)",
  },
});
