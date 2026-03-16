import React from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export type StylistSurfaceItem = {
  id: string;
  title: string;
  detail?: string;
  imageUri?: string;
  url?: string;
};

type StylistSurfaceProps = {
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
  onOpen?: () => void;
  ctaLabel?: string;
  onOpenLink: (url: string) => void;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onReconnect: () => void;
};

function ChipList({ items }: { items: StylistSurfaceItem[] }) {
  if (!items.length) {
    return null;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {items.slice(0, 6).map((item) => (
        <View key={item.id} style={styles.chip}>
          <Text style={styles.chipTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.detail ? (
            <Text style={styles.chipDetail} numberOfLines={1}>
              {item.detail}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

export default function StylistSurface({
  statusLabel,
  closetItems,
  suggestions,
  webResults,
  onOpen,
  ctaLabel,
  onOpenLink,
}: StylistSurfaceProps) {
  return (
    <View style={styles.surface}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Outfits, shopping, web finds</Text>
        </View>
        {onOpen ? (
          <Pressable style={styles.actionBtn} onPress={onOpen}>
            <Text style={styles.actionBtnText}>{ctaLabel || "Open stylist"}</Text>
          </Pressable>
        ) : null}
      </View>
      {closetItems.length ? (
        <>
          <Text style={styles.sectionTitle}>Current closet picks</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
            {closetItems.slice(0, 5).map((item) => (
              <View key={item.id} style={styles.closetCard}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.closetCardImage} />
                ) : (
                  <View style={[styles.closetCardImage, styles.cardImageFallback]} />
                )}
                <Text style={styles.closetCardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {suggestions.length ? (
        <>
          <Text style={styles.sectionTitle}>Current recommendations</Text>
          <View style={styles.resultList}>
            {suggestions.slice(0, 4).map((item) => (
              <View key={item.id} style={styles.resultRow}>
                <View style={styles.resultTextWrap}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.detail ? (
                    <Text style={styles.resultDetail} numberOfLines={2}>
                      {item.detail}
                    </Text>
                  ) : null}
                </View>
                {item.url ? (
                  <Pressable style={styles.linkBtn} onPress={() => onOpenLink(item.url || "")}>
                    <Text style={styles.linkBtnText}>Open</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </>
      ) : null}

      {webResults.length ? (
        <>
          <Text style={styles.sectionTitle}>Live web results</Text>
          <View style={styles.resultList}>
            {webResults.slice(0, 4).map((item) => (
              <View key={item.id} style={styles.resultRow}>
                <View style={styles.resultTextWrap}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.detail ? (
                    <Text style={styles.resultDetail} numberOfLines={2}>
                      {item.detail}
                    </Text>
                  ) : null}
                </View>
                {item.url ? (
                  <Pressable style={styles.linkBtn} onPress={() => onOpenLink(item.url || "")}>
                    <Text style={styles.linkBtnText}>Open</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
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
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: "#1A1A1A",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  actionBtn: {
    borderRadius: 999,
    backgroundColor: "#FF7652",
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 0 16px rgba(255,118,82,0.3)" }
      : {}),
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: {
    marginTop: 16,
    color: "#1A1A1A",
    fontSize: 15,
    fontWeight: "800",
  },
  chipRow: {
    gap: 10,
    paddingTop: 10,
  },
  cardRow: {
    gap: 10,
    paddingTop: 10,
  },
  closetCard: {
    width: 146,
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
  closetCardImage: {
    width: "100%",
    height: 102,
    backgroundColor: "rgba(255,118,82,0.12)",
  },
  cardImageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  closetCardTitle: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    color: "#1A1A1A",
    fontSize: 13,
    fontWeight: "800",
  },
  resultList: {
    marginTop: 10,
    gap: 8,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255,248,241,0.8)",
    borderWidth: 1,
    borderColor: "rgba(92,71,58,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(16px) saturate(1.3)",
          WebkitBackdropFilter: "blur(16px) saturate(1.3)",
        }
      : {}),
  },
  resultTextWrap: {
    flex: 1,
  },
  resultTitle: {
    color: "#1A1A1A",
    fontSize: 13,
    fontWeight: "800",
  },
  resultDetail: {
    marginTop: 4,
    color: "#706157",
    fontSize: 11,
    lineHeight: 15,
  },
  linkBtn: {
    borderRadius: 16,
    backgroundColor: "#FF7652",
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 0 12px rgba(255,118,82,0.3)" }
      : {}),
  },
  linkBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  chip: {
    width: 170,
    borderRadius: 24,
    backgroundColor: "rgba(255,248,241,0.8)",
    borderWidth: 1,
    borderColor: "rgba(92,71,58,0.1)",
    padding: 12,
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(16px) saturate(1.3)",
          WebkitBackdropFilter: "blur(16px) saturate(1.3)",
        }
      : {}),
  },
  chipTitle: {
    color: "#1A1A1A",
    fontSize: 13,
    fontWeight: "800",
  },
  chipDetail: {
    marginTop: 5,
    color: "#706157",
    fontSize: 11,
    lineHeight: 15,
  },
});
