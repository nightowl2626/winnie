import React, { useRef, useCallback } from "react";
import { Animated, Pressable, ViewStyle, TextStyle, StyleSheet, Text } from "react-native";
import { LIQUID_SPRING } from "../../design/animations";
import { colors, typography, spacing, radii } from "../../design/tokens";
import { glassStyle } from "../../design/glass";

type LiquidButtonProps = {
  onPress?: () => void;
  label?: string;
  variant?: "primary" | "ghost" | "pill" | "icon";
  glow?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
};

export default function LiquidButton({
  onPress,
  label,
  variant = "primary",
  glow,
  disabled = false,
  style,
  textStyle,
  children,
}: LiquidButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      ...LIQUID_SPRING,
    }).start();
  }, [scaleAnim]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      ...LIQUID_SPRING,
    }).start();
  }, [scaleAnim]);

  const variantStyle = VARIANT_STYLES[variant];
  const variantTextStyle = VARIANT_TEXT_STYLES[variant];

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          variantStyle,
          glow ? glassStyle("pill", glow) : undefined,
          disabled ? styles.disabled : undefined,
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        {children || (
          <Text style={[variantTextStyle, textStyle]}>
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});

const VARIANT_STYLES: Record<string, ViewStyle> = {
  primary: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ghost: {
    backgroundColor: "transparent",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  pill: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.glassBorderSubtle,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  icon: {
    backgroundColor: colors.surfaceAlt,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};

const VARIANT_TEXT_STYLES: Record<string, TextStyle> = {
  primary: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: typography.bodyBold.fontFamily,
    letterSpacing: 0.3,
  },
  ghost: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: typography.bodySemiBold.fontFamily,
  },
  pill: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: typography.bodySemiBold.fontFamily,
  },
  icon: {
    color: colors.text,
    fontSize: 18,
  },
};
