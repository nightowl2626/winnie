import React from "react";
import { View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { styles } from "../../styles/appStyles";
import { extractColorTokens } from "../../utils/colors";

function wishlistVisualPalette(color?: string): { start: string; end: string; glow: string } {
  const baseColor = extractColorTokens(color)[0] || "multicolor";
  const palette = {
    black: { start: "#1D1820", end: "#4A4152", glow: "#6E6378" },
    white: { start: "#E9E0D6", end: "#F8F3EC", glow: "#D8CEC2" },
    gray: { start: "#6F7885", end: "#AEB6C0", glow: "#D3DAE1" },
    beige: { start: "#B89065", end: "#E5D3BA", glow: "#F1E6D8" },
    brown: { start: "#6D412A", end: "#A36A47", glow: "#D8B398" },
    red: { start: "#9E302D", end: "#D65A4E", glow: "#F1B1A9" },
    orange: { start: "#B95F1B", end: "#E89A41", glow: "#F4CB96" },
    yellow: { start: "#B28B17", end: "#E2C244", glow: "#F5E5A2" },
    green: { start: "#496842", end: "#7EA471", glow: "#C7DBB8" },
    blue: { start: "#33579E", end: "#6391DB", glow: "#C4D8FA" },
    purple: { start: "#6446A8", end: "#9A79D4", glow: "#DDD0F3" },
    pink: { start: "#B55E89", end: "#E59DBD", glow: "#F5D3E2" },
    multicolor: { start: "#6B56B9", end: "#F08E67", glow: "#F1D772" },
  } as const;

  return palette[baseColor as keyof typeof palette] || {
    start: "#A25E33",
    end: "#D88B52",
    glow: "#F2D0B2",
  };
}

type Props = {
  category: string;
  color?: string;
  large?: boolean;
};

export default function WishlistVisualPreview({ category, color, large = false }: Props) {
  const token = (category || "").trim().toLowerCase();
  const palette = wishlistVisualPalette(color);
  const shellStyle = large ? styles.wishlistDetailVisual : styles.wishlistScoutVisual;
  const iconSize = large ? 118 : 82;
  const iconName = (() => {
    if (["shoe", "boot", "sneaker", "loafer", "heel"].some((word) => token.includes(word))) {
      return "shoe-sneaker";
    }
    if (["dress", "gown", "skirt"].some((word) => token.includes(word))) {
      return "hanger";
    }
    if (["outer", "jacket", "coat", "blazer", "cardigan"].some((word) => token.includes(word))) {
      return "tshirt-crew-outline";
    }
    if (["bottom", "pant", "jean", "trouser", "legging", "short"].some((word) => token.includes(word))) {
      return "hanger";
    }
    return "tshirt-crew-outline";
  })();

  return (
    <View style={[shellStyle, { backgroundColor: palette.start }]}>
      <View style={[styles.wishlistVisualGradientTop, { backgroundColor: palette.end }]} />
      <View style={[styles.wishlistVisualGradientBottom, { backgroundColor: palette.end }]} />
      <View style={[styles.wishlistVisualGlow, { backgroundColor: palette.glow }]} />
      <View style={styles.wishlistVisualOrbTopRight} />
      <View style={styles.wishlistVisualOrbBottomLeft} />
      <View
        style={[
          styles.wishlistVisualSilhouetteWrap,
          large ? styles.wishlistVisualSilhouetteWrapLarge : undefined,
        ]}
      >
        <MaterialCommunityIcons
          name={iconName as never}
          size={iconSize}
          color="#FFFFFF"
          style={styles.wishlistVisualIcon}
        />
      </View>
    </View>
  );
}
