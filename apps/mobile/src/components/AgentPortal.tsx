import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import GlassCard from "./ui/GlassCard";
import GlowOrb from "./ui/GlowOrb";
import AuroraBackground from "./ui/AuroraBackground";
import LiquidButton from "./ui/LiquidButton";
import { H2, Body, Eyebrow } from "./ui/Typography";
import { colors, typography, spacing, radii } from "../design/tokens";

type AgentMode = "scan" | "stylist" | "wishlist" | "shop";

type AgentPortalProps = {
  visible: boolean;
  onClose: () => void;
  onStartConcierge: () => void;
  onSelect: (mode: AgentMode) => void;
};

/* ── Persona definitions ────────────────────────────────── */

const PERSONAS: {
  mode: AgentMode;
  label: string;
  description: string;
  glowColor: string;
  orbColors: string[];
}[] = [
  {
    mode: "scan",
    label: "Scan Closet",
    description: "Scan and catalog your wardrobe",
    glowColor: colors.gold,
    orbColors: [colors.gold, colors.warmSand],
  },
  {
    mode: "stylist",
    label: "AI Stylist",
    description: "Get outfit recommendations",
    glowColor: colors.gold,
    orbColors: [colors.gold],
  },
  {
    mode: "wishlist",
    label: "Wishlist",
    description: "Track gaps and desires",
    glowColor: colors.purple,
    orbColors: [colors.purple, colors.warmBeige],
  },
  {
    mode: "shop",
    label: "Shop Scout",
    description: "Find items nearby",
    glowColor: colors.gold,
    orbColors: [colors.gold, colors.accent],
  },
];

/* ── Multi-color orb palette for the primary concierge tile ── */
const WINNIE_ORB_COLORS = [colors.accent, colors.gold, colors.purple, colors.warmSand];

/* ── Component ──────────────────────────────────────────── */

export default function AgentPortal({
  visible,
  onClose,
  onStartConcierge,
  onSelect,
}: AgentPortalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <AuroraBackground mode="default" style={styles.backdrop}>
        {/* Dismiss layer behind the content */}
        <Pressable style={styles.dismissLayer} onPress={onClose} />

        <View style={styles.content}>
          {/* ── Primary Concierge Tile ──────────────────── */}
          <Pressable onPress={onStartConcierge}>
            <GlassCard
              variant="portalTile"
              glow={colors.accent}
              style={styles.heroTile}
              glowWrapStyle={styles.heroGlowWrap}
              glowPrimaryStyle={styles.heroGlowPrimary}
              glowSecondaryStyle={styles.heroGlowSecondary}
              sheenStyle={styles.heroSheen}
            >
              <View style={styles.heroInner}>
                <GlowOrb
                  size={72}
                  colors={WINNIE_ORB_COLORS}
                  pulseSpeed={2400}
                  style={styles.heroOrb}
                />
                <View style={styles.heroText}>
                  <Eyebrow style={styles.heroEyebrow}>Your Concierge</Eyebrow>
                  <H2 style={styles.heroTitle}>Start Winnie</H2>
                  <Body style={styles.heroBody}>
                    One live agent that listens, then routes you into the right mode.
                  </Body>
                </View>
              </View>
            </GlassCard>
          </Pressable>

          {/* ── 2x2 Persona Grid ────────────────────────── */}
          <View style={styles.grid}>
            {PERSONAS.map((persona) => (
              <Pressable
                key={persona.mode}
                style={styles.gridCell}
                onPress={() => onSelect(persona.mode)}
              >
                <GlassCard
                  variant="portalTile"
                  glow={persona.glowColor}
                  style={styles.personaTile}
                  glowWrapStyle={styles.personaGlowWrap}
                  glowPrimaryStyle={[
                    styles.personaGlowPrimary,
                    { backgroundColor: persona.glowColor },
                  ]}
                  sheenStyle={styles.personaSheen}
                >
                  <GlowOrb
                    size={36}
                    colors={persona.orbColors}
                    pulseSpeed={3000}
                    style={styles.personaOrb}
                  />
                  <H2 style={styles.personaLabel}>{persona.label}</H2>
                  <Body style={styles.personaDesc} numberOfLines={2}>
                    {persona.description}
                  </Body>
                </GlassCard>
              </Pressable>
            ))}
          </View>

          {/* ── Close Button ────────────────────────────── */}
          <View style={styles.closeRow}>
            <LiquidButton
              variant="ghost"
              label="Close"
              onPress={onClose}
              style={styles.closeBtn}
              textStyle={styles.closeText}
            />
          </View>
        </View>
      </AuroraBackground>
    </Modal>
  );
}

/* ── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },

  dismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  content: {
    width: "100%",
    maxWidth: 400,
    zIndex: 1,
  },

  /* Header */
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  headerEyebrow: {
    color: colors.accent,
    letterSpacing: 2,
    opacity: 1,
    marginBottom: spacing.xs,
  },
  headerBody: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },

  /* Hero / Primary Concierge Tile */
  heroTile: {
    padding: spacing.lg + 2,
    marginBottom: spacing.md + 2,
    overflow: "hidden",
    backgroundColor: "rgba(255,248,241,0.78)",
    borderColor: "rgba(255,118,82,0.14)",
  },
  heroGlowWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGlowPrimary: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,118,82,0.16)",
    top: -110,
    right: -44,
  },
  heroGlowSecondary: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(200,154,99,0.18)",
    bottom: -96,
    left: -42,
  },
  heroSheen: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.58)",
  },
  heroInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroOrb: {
    marginRight: spacing.md,
  },
  heroText: {
    flex: 1,
  },
  heroEyebrow: {
    color: colors.accent,
    fontSize: typography.sizes.eyebrow,
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    color: colors.text,
    fontSize: typography.sizes.h1,
    letterSpacing: -0.3,
  },
  heroBody: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  /* 2x2 Grid */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  gridCell: {
    width: "48%",
  },
  personaTile: {
    padding: spacing.md,
    alignItems: "flex-start",
    minHeight: 140,
    justifyContent: "flex-end",
    overflow: "hidden",
    backgroundColor: "rgba(255,248,241,0.74)",
    borderColor: "rgba(92,71,58,0.08)",
  },
  personaGlowWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  personaGlowPrimary: {
    position: "absolute",
    width: 128,
    height: 128,
    borderRadius: 999,
    top: -40,
    right: -22,
    opacity: 0.14,
  },
  personaSheen: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.52)",
  },
  personaOrb: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
  },
  personaLabel: {
    color: colors.text,
    fontSize: typography.sizes.h3,
    marginBottom: spacing.xs,
  },
  personaDesc: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    lineHeight: 16,
  },

  /* Close */
  closeRow: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  closeBtn: {
    paddingHorizontal: spacing.xl,
    minWidth: 132,
    borderColor: "rgba(255,118,82,0.18)",
    backgroundColor: "rgba(255,248,241,0.72)",
  },
  closeText: {
    color: colors.accent,
    letterSpacing: 0.3,
  },
});
