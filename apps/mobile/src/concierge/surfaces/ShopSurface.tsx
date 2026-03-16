import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

export type ShopSurfaceStore = {
  id: string;
  title: string;
  detail?: string;
};

type ShopSurfaceProps = {
  statusLabel: string;
  browseModeLabel: string;
  visibleStoreCount: number;
  selectedStoreName?: string;
  latestLine?: string;
  stores: ShopSurfaceStore[];
  onOpen?: () => void;
  ctaLabel?: string;
};

export default function ShopSurface({
  latestLine,
  onOpen,
  ctaLabel,
}: ShopSurfaceProps) {
  return (
    <View style={styles.surface}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Map, store cards, and try-on flow</Text>
        </View>
        {onOpen ? (
          <Pressable style={styles.actionBtn} onPress={onOpen}>
            <Text style={styles.actionBtnText}>{ctaLabel || "Open shop"}</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.latestText}>
        {latestLine || "Use shop assist for live store decisions and try-ons."}
      </Text>
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
      ? { boxShadow: "0 0 16px rgba(255,118,82,0.3)" }
      : {}),
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  latestText: {
    marginTop: 12,
    color: "#706157",
    fontSize: 13,
    lineHeight: 18,
  },
});
