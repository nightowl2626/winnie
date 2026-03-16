import React from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export type ScanSurfaceCard = {
  id: string;
  title: string;
  subtitle: string;
  imageUri?: string;
};

type ScanSurfaceProps = {
  statusLabel: string;
  capturedCount: number;
  latestFeedback?: string;
  pendingCard?: ScanSurfaceCard;
  recentCards: ScanSurfaceCard[];
  onOpen?: () => void;
  ctaLabel?: string;
};

export default function ScanSurface({
  statusLabel: _statusLabel,
  capturedCount: _capturedCount,
  latestFeedback,
  pendingCard,
  recentCards,
  onOpen,
  ctaLabel,
}: ScanSurfaceProps) {
  return (
    <View style={styles.surface}>
      {onOpen ? (
        <View style={styles.header}>
          <Pressable style={styles.actionBtn} onPress={onOpen}>
            <Text style={styles.actionBtnText}>{ctaLabel || "Open scanner"}</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.feedbackText}>
        {latestFeedback || "Use the scanner to build wardrobe cards from live camera input."}
      </Text>
      {pendingCard ? (
        <View style={styles.pendingCard}>
          {pendingCard.imageUri ? (
            <Image source={{ uri: pendingCard.imageUri }} style={styles.pendingImage} />
          ) : (
            <View style={[styles.pendingImage, styles.pendingImageEmpty]} />
          )}
          <View style={styles.pendingCopy}>
            <Text style={styles.pendingLabel}>Current card</Text>
            <Text style={styles.pendingTitle} numberOfLines={1}>
              {pendingCard.title}
            </Text>
            <Text style={styles.pendingSubtitle} numberOfLines={2}>
              {pendingCard.subtitle}
            </Text>
          </View>
        </View>
      ) : null}

      {recentCards.length ? (
        <>
          <Text style={styles.sectionTitle}>Recent garments</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {recentCards.slice(0, 5).map((card) => (
              <View key={card.id} style={styles.recentCard}>
                {card.imageUri ? (
                  <Image source={{ uri: card.imageUri }} style={styles.recentImage} />
                ) : (
                  <View style={[styles.recentImage, styles.pendingImageEmpty]} />
                )}
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {card.title}
                </Text>
                <Text style={styles.recentSubtitle} numberOfLines={2}>
                  {card.subtitle}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: 28,
    backgroundColor: "transparent",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    gap: 12,
  },
  actionBtn: {
    borderRadius: 999,
    backgroundColor: "#FF7652",
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 0 16px rgba(255,118,82,0.24)" }
      : {}),
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  feedbackText: {
    marginTop: 10,
    color: "#706157",
    fontSize: 13,
    lineHeight: 18,
  },
  pendingCard: {
    marginTop: 16,
    flexDirection: "row",
    borderRadius: 24,
    backgroundColor: "rgba(255,248,241,0.8)",
    borderWidth: 1,
    borderColor: "rgba(92,71,58,0.1)",
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(16px) saturate(1.3)",
          WebkitBackdropFilter: "blur(16px) saturate(1.3)",
        }
      : {}),
  },
  pendingImage: {
    width: 100,
    height: 100,
    backgroundColor: "rgba(255,118,82,0.12)",
  },
  pendingImageEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  pendingCopy: {
    flex: 1,
    padding: 12,
  },
  pendingLabel: {
    color: "#FF7652",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  pendingTitle: {
    marginTop: 6,
    color: "#1A1A1A",
    fontSize: 15,
    fontWeight: "800",
  },
  pendingSubtitle: {
    marginTop: 6,
    color: "#706157",
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    marginTop: 16,
    color: "#1A1A1A",
    fontSize: 15,
    fontWeight: "800",
  },
  row: {
    gap: 10,
    paddingTop: 10,
  },
  recentCard: {
    width: 132,
    borderRadius: 24,
    backgroundColor: "rgba(255,248,241,0.8)",
    borderWidth: 1,
    borderColor: "rgba(92,71,58,0.1)",
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(16px) saturate(1.3)",
          WebkitBackdropFilter: "blur(16px) saturate(1.3)",
        }
      : {}),
  },
  recentImage: {
    width: "100%",
    height: 96,
    backgroundColor: "rgba(255,118,82,0.12)",
  },
  recentTitle: {
    paddingHorizontal: 10,
    paddingTop: 8,
    color: "#1A1A1A",
    fontSize: 13,
    fontWeight: "800",
  },
  recentSubtitle: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 10,
    color: "#706157",
    fontSize: 11,
    lineHeight: 15,
  },
});
