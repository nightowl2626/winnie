import React from "react";
import { StyleSheet, Text, View } from "react-native";
import GlassCard from "./GlassCard";
import { colors, typography, spacing } from "../../design/tokens";

type LiquidNoteProps = {
  message: string;
  icon?: string;
};

export default function LiquidNote({ message, icon = "sparkles" }: LiquidNoteProps) {
  return (
    <GlassCard variant="card" style={styles.container}>
      <View style={styles.iconRow}>
        <Text style={styles.icon}>{icon === "sparkles" ? "✨" : "💡"}</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    alignItems: "center",
    marginVertical: spacing.md,
  },
  iconRow: {
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  message: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    fontStyle: "italic",
  },
});
