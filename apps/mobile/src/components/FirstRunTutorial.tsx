import React, { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

const STEPS = [
  {
    title: "Welcome to Winnie",
    body: "Winnie helps you scan clothes, style outfits, save wishlist gaps, and scout stores without leaving the same app flow.",
    accent: "AI portal",
  },
  {
    title: "Start with the center portal",
    body: "Tap the center button in the bottom bar to launch Winnie. Speak naturally and Winnie routes you into the right assistant automatically.",
    accent: "Live concierge",
  },
  {
    title: "Log and understand your wardrobe",
    body: "Use Home to log daily outfits and track your streak, then use Closet to scan pieces, try them on, and edit your collection.",
    accent: "Home + Closet",
  },
  {
    title: "Capture gaps as they come up",
    body: "If you realize you are missing something while styling or shopping, Winnie can save it to Wishlist without breaking the conversation.",
    accent: "Wishlist",
  },
  {
    title: "Scout nearby stores",
    body: "Use Shop to browse the map, compare store fit, and generate in-store try-ons when you want to find items in the real world.",
    accent: "Shop radar",
  },
] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function FirstRunTutorial({ visible, onClose }: Props) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setStepIndex(0);
    }
  }, [visible]);

  const step = useMemo(() => STEPS[stepIndex], [stepIndex]);
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View pointerEvents="none" style={styles.glowWrap}>
            <View style={styles.glowPrimary} />
            <View style={styles.glowSecondary} />
            <View style={styles.sheen} />
          </View>

          <View style={styles.headerRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>First-time guide</Text>
            </View>
            <Pressable style={styles.iconBtn} onPress={onClose}>
              <Text style={styles.iconBtnText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.copyBlock}>
            <Text style={styles.accent}>{step.accent}</Text>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>
          </View>

          <View style={styles.progressRow}>
            {STEPS.map((_, index) => (
              <View
                key={`tutorial-dot-${index}`}
                style={[styles.progressDot, index === stepIndex ? styles.progressDotActive : undefined]}
              />
            ))}
          </View>

          <View style={styles.footerRow}>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Skip</Text>
            </Pressable>

            <View style={styles.primaryCluster}>
              {stepIndex > 0 ? (
                <Pressable style={styles.secondaryBtn} onPress={() => setStepIndex((value) => value - 1)}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  if (isLast) {
                    onClose();
                    return;
                  }
                  setStepIndex((value) => Math.min(STEPS.length - 1, value + 1));
                }}
              >
                <Text style={styles.primaryBtnText}>{isLast ? "Start using Winnie" : "Next"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(36, 25, 18, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "rgba(255, 248, 242, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.58)",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(20px) saturate(145%)",
          WebkitBackdropFilter: "blur(20px) saturate(145%)",
          boxShadow: "0 24px 56px rgba(121,76,38,0.18), inset 0 1px 0 rgba(255,255,255,0.34)",
        }
      : {
          shadowColor: "#9F6737",
          shadowOpacity: 0.18,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 14 },
        }),
  },
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  glowPrimary: {
    position: "absolute",
    top: -70,
    right: -40,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(255, 118, 82, 0.12)",
    shadowColor: "#FF7652",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 64,
  },
  glowSecondary: {
    position: "absolute",
    bottom: -80,
    left: -34,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(200, 154, 99, 0.08)",
    shadowColor: "rgba(200, 154, 99, 0.95)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 68,
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.52)",
  },
  badgeText: {
    color: "#5E4739",
    fontSize: 11,
    fontWeight: "800",
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.38)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
  },
  iconBtnText: {
    color: "#5B4335",
    fontSize: 20,
    fontWeight: "400",
    lineHeight: 22,
  },
  copyBlock: {
    marginTop: 18,
    gap: 8,
  },
  accent: {
    color: "#FF7652",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  title: {
    color: "#20140E",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
  body: {
    color: "#5D4A3D",
    fontSize: 15,
    lineHeight: 22,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 22,
  },
  progressDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: "rgba(113, 92, 77, 0.22)",
  },
  progressDotActive: {
    width: 26,
    backgroundColor: "#FF7652",
  },
  footerRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  primaryCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
  },
  secondaryBtn: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.56)",
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  secondaryBtnText: {
    color: "#4B382D",
    fontSize: 13,
    fontWeight: "800",
  },
  primaryBtn: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF7652",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
