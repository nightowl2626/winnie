import React from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CameraView } from "expo-camera";
import { getConciergeModeLabel } from "../concierge/routing";
import type { ConciergeSessionState, ConciergeTranscriptLine } from "../concierge/types";
import ScanSurface, { type ScanSurfaceCard } from "../concierge/surfaces/ScanSurface";
import ShopSurface, { type ShopSurfaceStore } from "../concierge/surfaces/ShopSurface";
import StylistSurface, { type StylistSurfaceItem } from "../concierge/surfaces/StylistSurface";
import WishlistSurface, { type WishlistSurfaceItem } from "../concierge/surfaces/WishlistSurface";
import AuroraBackground from "./ui/AuroraBackground";

type ScanSummary = {
  active: boolean;
  statusLabel: string;
  capturedCount: number;
  latestFeedback?: string;
  pendingCard?: ScanSurfaceCard;
  recentCards: ScanSurfaceCard[];
};

type RootSummary = {
  statusLabel: string;
  latestLine?: string;
  micActive: boolean;
  speakerEnabled: boolean;
  canToggleMic: boolean;
};

type StylistSummary = {
  active: boolean;
  statusLabel: string;
  suggestedCount: number;
  webResultCount: number;
  latestLine?: string;
  closetItems: StylistSurfaceItem[];
  suggestions: StylistSurfaceItem[];
  webResults: StylistSurfaceItem[];
  micActive: boolean;
  speakerEnabled: boolean;
  canToggleMic: boolean;
};

type WishlistSummary = {
  active: boolean;
  statusLabel: string;
  itemCount: number;
  latestLine?: string;
  items: WishlistSurfaceItem[];
  micActive: boolean;
  speakerEnabled: boolean;
  canToggleMic: boolean;
};

type ShopSummary = {
  active: boolean;
  statusLabel: string;
  browseModeLabel: string;
  selectedStoreName?: string;
  visibleStoreCount: number;
  latestLine?: string;
  stores: ShopSurfaceStore[];
};

type AgentConciergeProps = {
  visible: boolean;
  session: ConciergeSessionState;
  onClose: () => void;
  onOpenStylistLink: (url: string) => void;
  onToggleRootMic: () => void;
  onToggleRootSpeaker: () => void;
  onReconnectRoot: () => void;
  onToggleStylistMic: () => void;
  onToggleStylistSpeaker: () => void;
  onReconnectStylist: () => void;
  onToggleWishlistMic: () => void;
  onToggleWishlistSpeaker: () => void;
  onReconnectWishlist: () => void;
  cameraPermissionGranted: boolean;
  shopTryOnVisible: boolean;
  shopTryOnImageUri?: string;
  onCloseShopTryOn: () => void;
  root: RootSummary;
  scan: ScanSummary;
  stylist: StylistSummary;
  wishlist: WishlistSummary;
  shop: ShopSummary;
};

type LiveControlsProps = {
  micActive: boolean;
  speakerEnabled: boolean;
  canToggleMic: boolean;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onReconnect: () => void;
};

const ROOT_PROMPTS = [
  "Scan my outfits",
  "Help me get dressed",
  "Add white tees to my wishlist",
  "I'm in a store right now",
];

function humanizeToolName(value: string): string {
  return value.replace(/_/g, " ").trim();
}

function formatTranscriptText(line: ConciergeTranscriptLine): { mode: string; role: string; text: string } {
  const raw = line.text.trim();

  if (line.role !== "system") {
    return {
      mode: getConciergeModeLabel(line.mode),
      role: line.role.toUpperCase(),
      text: raw,
    };
  }

  if (raw.startsWith("[route]")) {
    try {
      const payload = JSON.parse(raw.slice(7).trim()) as { target_mode?: string };
      const target = typeof payload.target_mode === "string" ? payload.target_mode : "";
      return {
        mode: getConciergeModeLabel(line.mode),
        role: "ROUTE",
        text: target ? `Switching to ${getConciergeModeLabel(target as any)}.` : "Switching capabilities.",
      };
    } catch {
      return { mode: getConciergeModeLabel(line.mode), role: "ROUTE", text: "Switching capabilities." };
    }
  }

  const toolCallMatch = raw.match(/^\[tool\]\s+call\s+([a-z0-9_]+)/i);
  if (toolCallMatch) {
    return {
      mode: getConciergeModeLabel(line.mode),
      role: "TOOL",
      text: `Using ${humanizeToolName(toolCallMatch[1])}.`,
    };
  }

  const toolResultMatch = raw.match(/^\[tool\]\s+result\s+([a-z0-9_]+)/i);
  if (toolResultMatch) {
    return {
      mode: getConciergeModeLabel(line.mode),
      role: "TOOL",
      text: `Finished ${humanizeToolName(toolResultMatch[1])}.`,
    };
  }

  const toolBlockedMatch = raw.match(/^\[tool\]\s+blocked\s+([a-z0-9_]+)/i);
  if (toolBlockedMatch) {
    return {
      mode: getConciergeModeLabel(line.mode),
      role: "TOOL",
      text: `Couldn't use ${humanizeToolName(toolBlockedMatch[1])} here.`,
    };
  }

  const webMatch = raw.match(/^\[web\]\s+grounded results\s+(\d+)/i);
  if (webMatch) {
    return {
      mode: getConciergeModeLabel(line.mode),
      role: "WEB",
      text: `Found ${webMatch[1]} grounded web results.`,
    };
  }

  if (raw.startsWith("[goal]")) {
    return {
      mode: getConciergeModeLabel(line.mode),
      role: "GOAL",
      text: raw.replace(/^\[goal\]\s*/i, ""),
    };
  }

  return {
    mode: getConciergeModeLabel(line.mode),
    role: "SYSTEM",
    text: raw.replace(/^\[[^\]]+\]\s*/g, ""),
  };
}

function TranscriptRow({ line }: { line: ConciergeTranscriptLine }) {
  const formatted = formatTranscriptText(line);
  return <Text style={styles.transcriptText}>{formatted.text}</Text>;
}

function LiveControls({
  micActive,
  speakerEnabled,
  canToggleMic,
  onToggleMic,
  onToggleSpeaker,
  onReconnect,
}: LiveControlsProps) {
  return (
    <View style={styles.controlsRow}>
      <Pressable
        style={[
          styles.controlBtn,
          micActive ? styles.controlBtnActive : undefined,
          !canToggleMic ? styles.controlBtnDisabled : undefined,
        ]}
        onPress={onToggleMic}
        disabled={!canToggleMic}
      >
        <Text style={styles.controlBtnText}>{micActive ? "Mic on" : "Mic off"}</Text>
      </Pressable>
      <Pressable
        style={[styles.controlBtn, speakerEnabled ? styles.controlBtnActive : undefined]}
        onPress={onToggleSpeaker}
      >
        <Text style={styles.controlBtnText}>{speakerEnabled ? "Speaker on" : "Speaker off"}</Text>
      </Pressable>
      <Pressable style={styles.controlBtn} onPress={onReconnect}>
        <Text style={styles.controlBtnText}>Reconnect</Text>
      </Pressable>
    </View>
  );
}

function RootPromptCard() {
  return (
    <View style={styles.rootSurface}>
      <Text style={styles.rootTitle}>Say what you want. Winnie keeps the flow moving.</Text>
      <View style={styles.promptGrid}>
        {ROOT_PROMPTS.map((prompt) => (
          <View key={prompt} style={styles.promptChip}>
            <Text style={styles.promptChipText}>{prompt}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AgentConcierge({
  visible,
  session,
  onClose,
  onOpenStylistLink,
  onToggleRootMic,
  onToggleRootSpeaker,
  onReconnectRoot,
  onToggleStylistMic,
  onToggleStylistSpeaker,
  onReconnectStylist,
  onToggleWishlistMic,
  onToggleWishlistSpeaker,
  onReconnectWishlist,
  cameraPermissionGranted,
  shopTryOnVisible,
  shopTryOnImageUri,
  onCloseShopTryOn,
  root,
  scan,
  stylist,
  wishlist,
  shop,
}: AgentConciergeProps) {
  const activeMode = session.activeMode;
  const latestThreadLine = session.transcriptThread[0];
  const auroraMode = activeMode === "concierge" ? "default" : activeMode;

  const statusLabel =
    activeMode === "concierge"
      ? root.statusLabel
      : activeMode === "scan"
        ? scan.statusLabel
        : activeMode === "stylist"
          ? stylist.statusLabel
          : activeMode === "wishlist"
            ? wishlist.statusLabel
            : shop.statusLabel;

  const headline =
    activeMode === "concierge"
      ? root.latestLine || "Start by speaking naturally. Winnie routes you into the right fashion flow."
      : session.handoffReason ||
        (activeMode === "scan"
          ? scan.latestFeedback || "Wardrobe scan is active."
          : activeMode === "stylist"
            ? stylist.latestLine || "Styling is active."
            : activeMode === "wishlist"
              ? wishlist.latestLine || "Wishlist memory is active."
              : shop.latestLine || "Store assist is active.");

  const stageCaption =
    activeMode === "scan"
      ? "Camera is live for wardrobe intake."
      : activeMode === "shop"
        ? "Camera is live for store assist and try-ons."
        : activeMode === "stylist"
          ? "Voice stays primary while the camera remains warm and ready."
          : activeMode === "wishlist"
            ? "Quick memory mode. Save and move on without breaking the flow."
            : "Winnie is listening and ready to route the next move.";

  const activeControls =
    activeMode === "concierge"
      ? {
          micActive: root.micActive,
          speakerEnabled: root.speakerEnabled,
          canToggleMic: root.canToggleMic,
          onToggleMic: onToggleRootMic,
          onToggleSpeaker: onToggleRootSpeaker,
          onReconnect: onReconnectRoot,
        }
      : activeMode === "stylist"
        ? {
            micActive: stylist.micActive,
            speakerEnabled: stylist.speakerEnabled,
            canToggleMic: stylist.canToggleMic,
            onToggleMic: onToggleStylistMic,
            onToggleSpeaker: onToggleStylistSpeaker,
            onReconnect: onReconnectStylist,
          }
        : activeMode === "wishlist"
          ? {
              micActive: wishlist.micActive,
              speakerEnabled: wishlist.speakerEnabled,
              canToggleMic: wishlist.canToggleMic,
              onToggleMic: onToggleWishlistMic,
              onToggleSpeaker: onToggleWishlistSpeaker,
              onReconnect: onReconnectWishlist,
            }
          : null;

  const activeSurface =
    activeMode === "concierge" ? (
      <RootPromptCard />
    ) : activeMode === "scan" ? (
      <ScanSurface
        statusLabel={scan.statusLabel}
        capturedCount={scan.capturedCount}
        latestFeedback={scan.latestFeedback}
        pendingCard={scan.pendingCard}
        recentCards={scan.recentCards}
      />
    ) : activeMode === "stylist" ? (
      <StylistSurface
        statusLabel={stylist.statusLabel}
        suggestedCount={stylist.suggestedCount}
        webResultCount={stylist.webResultCount}
        latestLine={stylist.latestLine}
        closetItems={stylist.closetItems}
        suggestions={stylist.suggestions}
        webResults={stylist.webResults}
        micActive={stylist.micActive}
        speakerEnabled={stylist.speakerEnabled}
        canToggleMic={stylist.canToggleMic}
        onOpenLink={onOpenStylistLink}
        onToggleMic={onToggleStylistMic}
        onToggleSpeaker={onToggleStylistSpeaker}
        onReconnect={onReconnectStylist}
      />
    ) : activeMode === "wishlist" ? (
      <WishlistSurface
        statusLabel={wishlist.statusLabel}
        itemCount={wishlist.itemCount}
        latestLine={wishlist.latestLine}
        items={wishlist.items}
        micActive={wishlist.micActive}
        speakerEnabled={wishlist.speakerEnabled}
        canToggleMic={wishlist.canToggleMic}
        onToggleMic={onToggleWishlistMic}
        onToggleSpeaker={onToggleWishlistSpeaker}
        onReconnect={onReconnectWishlist}
      />
    ) : (
      <ShopSurface
        statusLabel={shop.statusLabel}
        browseModeLabel={shop.browseModeLabel}
        visibleStoreCount={shop.visibleStoreCount}
        selectedStoreName={shop.selectedStoreName}
        latestLine={shop.latestLine}
        stores={shop.stores}
      />
    );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <AuroraBackground mode={auroraMode} style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.stage}>
            {cameraPermissionGranted ? (
              <CameraView facing="back" style={styles.cameraPreview} />
            ) : (
              <View style={[styles.cameraPreview, styles.voiceStage]}>
                <View style={styles.voiceOrb} />
              </View>
            )}
            <View style={styles.stageScrim} />
            <View style={styles.stageGlowTop} />
            <View style={styles.stageGlowBottom} />

            <View style={styles.stageTopRow}>
              <View>
                <Text style={styles.stageTitle}>{getConciergeModeLabel(activeMode)}</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>

            <View style={styles.stageBadgeRow}>
              <View style={styles.stageBadge}>
                <Text style={styles.stageBadgeText}>{statusLabel}</Text>
              </View>
              <View style={styles.stageBadge}>
                <Text style={styles.stageBadgeText}>
                  {activeMode === "scan" || activeMode === "shop" ? "Camera flow" : "Mic flow"}
                </Text>
              </View>
              {activeControls ? (
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>
                    {activeControls.speakerEnabled ? "Speaker ready" : "Speaker muted"}
                  </Text>
                </View>
              ) : null}
            </View>

          </View>

          <View style={styles.overlayColumn}>
            <View style={styles.headlineCard}>
              <Text style={styles.stagePrompt}>{headline}</Text>
              <Text style={styles.stageCaption}>{stageCaption}</Text>
              {activeControls ? (
                <View style={styles.inlineControlsWrap}>
                  <LiveControls {...activeControls} />
                </View>
              ) : null}
              {latestThreadLine ? (
                <View style={styles.inlineTranscriptSingle}>
                  <TranscriptRow line={latestThreadLine} />
                </View>
              ) : null}
            </View>

            <View key={activeMode} style={styles.surfaceSheet}>
              <ScrollView
                style={styles.surfaceScroll}
                contentContainerStyle={styles.surfaceContent}
                showsVerticalScrollIndicator={false}
              >
                {activeSurface}
              </ScrollView>
            </View>
          </View>

          {shopTryOnVisible ? (
            <View style={styles.tryOnOverlay}>
              <View style={styles.tryOnCard}>
                <View style={styles.tryOnHeader}>
                  <Text style={styles.tryOnTitle}>In-Store Try-On Preview</Text>
                  <Pressable style={styles.tryOnCloseBtn} onPress={onCloseShopTryOn}>
                    <Text style={styles.tryOnCloseText}>Close</Text>
                  </Pressable>
                </View>
                {shopTryOnImageUri ? (
                  <Image source={{ uri: shopTryOnImageUri }} style={styles.tryOnImage} />
                ) : (
                  <View style={styles.tryOnFallback}>
                    <Text style={styles.tryOnFallbackText}>No try-on image yet</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}
        </View>
      </AuroraBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(39, 28, 20, 0.12)",
  },
  sheet: {
    flex: 1,
    backgroundColor: "transparent",
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  voiceStage: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 28,
  },
  voiceOrb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(222, 122, 73, 0.14)",
    shadowColor: "rgba(255, 118, 82, 0.85)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.36,
    shadowRadius: 38,
    elevation: 8,
  },
  stageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(58, 40, 28, 0.24)",
  },
  stageGlowTop: {
    position: "absolute",
    top: -80,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(222, 122, 73, 0.12)",
    shadowColor: "rgba(255, 118, 82, 0.95)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 56,
    elevation: 8,
  },
  stageGlowBottom: {
    position: "absolute",
    bottom: -110,
    left: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(200, 154, 99, 0.1)",
    shadowColor: "rgba(200, 154, 99, 0.9)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 60,
    elevation: 8,
  },
  stageTopRow: {
    paddingHorizontal: 18,
    paddingTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  stageTitle: {
    color: "#FFF9F3",
    fontSize: 30,
    fontWeight: "900",
  },
  closeBtn: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 248, 241, 0.14)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 248, 241, 0.22)",
  },
  closeBtnText: {
    color: "#FFF9F3",
    fontSize: 12,
    fontWeight: "800",
  },
  stageBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  stageBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 248, 241, 0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 248, 241, 0.2)",
  },
  stageBadgeText: {
    color: "#FFF9F3",
    fontSize: 11,
    fontWeight: "800",
  },
  overlayColumn: {
    position: "absolute",
    top: 118,
    left: 14,
    right: 14,
    bottom: 16,
    justifyContent: "space-between",
    gap: 12,
  },
  headlineCard: {
    alignSelf: "flex-start",
    maxWidth: "94%",
    borderRadius: 24,
    backgroundColor: "rgba(255, 248, 241, 0.76)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(92, 71, 58, 0.14)",
  },
  stagePrompt: {
    color: "#2C241E",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  stageCaption: {
    color: "#706157",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  inlineTranscriptSingle: {
    marginTop: 10,
  },
  inlineControlsWrap: {
    marginTop: 12,
  },
  transcriptText: {
    color: "#5D4C40",
    fontSize: 13,
    lineHeight: 18,
  },
  surfaceSheet: {
    maxHeight: "56%",
    borderRadius: 32,
    backgroundColor: "rgba(255, 248, 241, 0.82)",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(92, 71, 58, 0.14)",
  },
  surfaceScroll: {
    marginTop: 0,
  },
  surfaceContent: {
    paddingBottom: 18,
    gap: 14,
  },
  rootSurface: {
    borderRadius: 28,
    backgroundColor: "rgba(244, 234, 224, 0.86)",
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(92, 71, 58, 0.08)",
  },
  rootTitle: {
    color: "#2C241E",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  promptGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  promptChip: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 248, 241, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(92, 71, 58, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  promptChipText: {
    color: "#2C241E",
    fontSize: 12,
    fontWeight: "800",
  },
  controlsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  controlBtn: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 248, 241, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 248, 241, 0.22)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  controlBtnActive: {
    backgroundColor: "rgba(222, 122, 73, 0.24)",
    borderColor: "rgba(255, 248, 241, 0.34)",
  },
  controlBtnDisabled: {
    opacity: 0.45,
  },
  controlBtnText: {
    color: "#FFF9F3",
    fontSize: 12,
    fontWeight: "800",
  },
  tryOnOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(47, 36, 30, 0.56)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  tryOnCard: {
    width: "100%",
    maxWidth: 840,
    maxHeight: "92%",
    backgroundColor: "rgba(255, 248, 241, 0.96)",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(92, 71, 58, 0.14)",
  },
  tryOnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(92, 71, 58, 0.08)",
  },
  tryOnTitle: {
    color: "#2C241E",
    fontSize: 18,
    fontWeight: "900",
  },
  tryOnCloseBtn: {
    borderRadius: 999,
    backgroundColor: "rgba(244, 234, 224, 0.92)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(92, 71, 58, 0.12)",
  },
  tryOnCloseText: {
    color: "#2C241E",
    fontSize: 12,
    fontWeight: "800",
  },
  tryOnImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    maxHeight: 760,
    backgroundColor: "#F4EADF",
  },
  tryOnFallback: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 420,
    backgroundColor: "#F4EADF",
  },
  tryOnFallbackText: {
    color: "#706157",
    fontSize: 14,
    fontWeight: "700",
  },
});
