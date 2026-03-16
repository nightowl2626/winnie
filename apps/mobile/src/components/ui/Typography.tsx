import React from "react";
import { Text, TextStyle, StyleSheet } from "react-native";
import { colors, typography } from "../../design/tokens";

type TypographyProps = {
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
  children?: React.ReactNode;
};

export function H1({ style, numberOfLines, children }: TypographyProps) {
  return (
    <Text style={[styles.h1, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function H2({ style, numberOfLines, children }: TypographyProps) {
  return (
    <Text style={[styles.h2, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function H3({ style, numberOfLines, children }: TypographyProps) {
  return (
    <Text style={[styles.h3, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Body({ style, numberOfLines, children }: TypographyProps) {
  return (
    <Text style={[styles.body, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Caption({ style, numberOfLines, children }: TypographyProps) {
  return (
    <Text style={[styles.caption, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Eyebrow({ style, numberOfLines, children }: TypographyProps) {
  return (
    <Text style={[styles.eyebrow, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontFamily: typography.headline.fontFamily,
    fontSize: typography.sizes.h1,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: typography.headline.fontFamily,
    fontSize: typography.sizes.h2,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: typography.bodySemiBold.fontFamily,
    fontSize: typography.sizes.h3,
    fontWeight: "600",
    color: colors.text,
  },
  body: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: "400",
    color: colors.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: "400",
    color: colors.textTertiary,
  },
  eyebrow: {
    fontFamily: typography.bodyBold.fontFamily,
    fontSize: typography.sizes.eyebrow,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
