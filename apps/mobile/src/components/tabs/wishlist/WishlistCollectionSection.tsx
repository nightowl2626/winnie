import React from "react";
import { Pressable, Text, View } from "react-native";

import type { AppStyles } from "../../../styles/appStyles";
import type { WishlistItem, WishlistScoutCard } from "../../../types";
import GlassButton from "../../ui/GlassButton";
import GlassCard from "../../ui/GlassCard";

type Props = {
  styles: AppStyles;
  wishlistViewMode: "ai" | "manual";
  setWishlistViewMode: (mode: "ai" | "manual") => void;
  activeCards: WishlistScoutCard[];
  wishlistItems: WishlistItem[];
  wishlistDeletingIds: Set<string>;
  setWishlistDetailCard: (card: WishlistScoutCard | null) => void;
  onDeleteWishlistItem: (item: WishlistItem) => void | Promise<void>;
  onWishlistFindNearby: (item: WishlistScoutCard) => void | Promise<void>;
  WishlistVisualPreviewComponent: React.ComponentType<{
    category: string;
    color?: string;
    large?: boolean;
  }>;
};

export default function WishlistCollectionSection(props: Props) {
  const WishlistVisualPreviewComponent = props.WishlistVisualPreviewComponent;

  return (
    <GlassCard
      style={[props.styles.collectionCard, props.styles.wishlistCollectionCard]}
      glowWrapStyle={props.styles.wishlistCardGlowWrap}
      glowPrimaryStyle={props.styles.wishlistCardGlowPrimary}
      glowSecondaryStyle={props.styles.wishlistCardGlowSecondary}
      sheenStyle={props.styles.wishlistCardSheen}
    >
      <View style={props.styles.wishlistTabsRow}>
        <Pressable
          style={[
            props.styles.wishlistTab,
            props.wishlistViewMode === "ai" ? props.styles.wishlistTabActive : undefined,
          ]}
          onPress={() => props.setWishlistViewMode("ai")}
        >
          <Text
            style={[
              props.styles.wishlistTabText,
              props.wishlistViewMode === "ai" ? props.styles.wishlistTabTextActive : undefined,
            ]}
          >
            AI Needs
          </Text>
        </Pressable>
        <Pressable
          style={[
            props.styles.wishlistTab,
            props.wishlistViewMode === "manual" ? props.styles.wishlistTabActive : undefined,
          ]}
          onPress={() => props.setWishlistViewMode("manual")}
        >
          <Text
            style={[
              props.styles.wishlistTabText,
              props.wishlistViewMode === "manual" ? props.styles.wishlistTabTextActive : undefined,
            ]}
          >
            My Wants
          </Text>
        </Pressable>
      </View>

      {props.activeCards.length ? (
        <View style={props.styles.wishlistMasonryGrid}>
          {props.activeCards.map((item) => {
            const originalItem = props.wishlistItems.find((entry) => entry.id === item.id);
            return (
              <Pressable
                key={`wishlist-card-${item.id}`}
                style={props.styles.wishlistScoutCard}
                onPress={() => props.setWishlistDetailCard(item)}
              >
                <WishlistVisualPreviewComponent category={item.category} color={item.color} />
                <View style={props.styles.wishlistScoutBody}>
                  <View style={props.styles.wishlistScoutHeader}>
                    <Text style={props.styles.wishlistScoutTitle} numberOfLines={2}>
                      {item.category}
                    </Text>
                    {item.origin === "manual" && originalItem ? (
                      <Pressable
                        style={[
                          props.styles.wishlistDeleteBtn,
                          props.wishlistDeletingIds.has(originalItem.id)
                            ? props.styles.deleteChipBusy
                            : undefined,
                        ]}
                        onPress={() => void props.onDeleteWishlistItem(originalItem)}
                        disabled={props.wishlistDeletingIds.has(originalItem.id)}
                      >
                        <Text style={props.styles.wishlistDeleteText}>
                          {props.wishlistDeletingIds.has(originalItem.id) ? "…" : "×"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Text style={props.styles.wishlistScoutMeta} numberOfLines={2}>
                    {item.notes || item.reasoning}
                  </Text>
                  {item.liveMatch ? (
                    <Text style={props.styles.wishlistScoutMatch} numberOfLines={2}>
                      {item.liveMatch.name} · sustainability{" "}
                      {Math.round(item.liveMatch.ai_evaluation?.sustainability_score || 0)}
                    </Text>
                  ) : null}
                  <View style={props.styles.wishlistScoutActions}>
                    <GlassButton
                      label="Why this?"
                      style={props.styles.wishlistScoutActionGhost}
                      textStyle={props.styles.wishlistScoutActionGhostText}
                      onPress={() => props.setWishlistDetailCard(item)}
                    />
                    <GlassButton
                      label="Find nearby"
                      style={props.styles.wishlistScoutActionPrimary}
                      textStyle={props.styles.wishlistScoutActionPrimaryText}
                      onPress={() => void props.onWishlistFindNearby(item)}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={props.styles.optimizerMeta}>
          {props.wishlistViewMode === "ai"
            ? "No AI needs yet. Run the optimizer to surface gaps."
            : "No wishlist items yet."}
        </Text>
      )}
    </GlassCard>
  );
}
