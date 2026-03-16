import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

export type WishlistSurfaceItem = {
  id: string;
  title: string;
  detail?: string;
};

type WishlistSurfaceProps = {
  statusLabel: string;
  itemCount: number;
  latestLine?: string;
  items: WishlistSurfaceItem[];
  onOpen?: () => void;
  ctaLabel?: string;
  micActive: boolean;
  speakerEnabled: boolean;
  canToggleMic: boolean;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onReconnect: () => void;
};

export default function WishlistSurface({
  statusLabel,
  itemCount,
  latestLine,
  items,
  onOpen,
  ctaLabel,
}: WishlistSurfaceProps) {
  return (
    <View style={styles.surface}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Saved needs and wardrobe gaps</Text>
        </View>
        {onOpen ? (
          <Pressable style={styles.actionBtn} onPress={onOpen}>
            <Text style={styles.actionBtnText}>{ctaLabel || "Open wishlist"}</Text>
          </Pressable>
        ) : null}
      </View>
      {items.length ? (
        <View style={styles.list}>
          {items.slice(0, 4).map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.detail ? (
                <Text style={styles.rowDetail} numberOfLines={1}>
                  {item.detail}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
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
    fontSize: 20,
    fontWeight: "900",
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
  list: {
    marginTop: 12,
    gap: 8,
  },
  row: {
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
  rowTitle: {
    color: "#1A1A1A",
    fontSize: 13,
    fontWeight: "800",
  },
  rowDetail: {
    marginTop: 4,
    color: "#706157",
    fontSize: 11,
  },
});
