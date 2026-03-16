import React from "react";
import { ScrollView } from "react-native";

import type { AppStyles } from "../../styles/appStyles";
import type { WishlistItem, WishlistScoutCard } from "../../types";
import type { AnimatedPressableComponentType } from "../componentTypes";
import WishlistCollectionSection from "./wishlist/WishlistCollectionSection";
import WishlistManualSection from "./wishlist/WishlistManualSection";

type Props = {
  styles: AppStyles;
  placeholderTextColor: string;
  AnimatedPressableComponent: AnimatedPressableComponentType;
  WishlistVisualPreviewComponent: React.ComponentType<{
    category: string;
    color?: string;
    large?: boolean;
  }>;
  wishlistViewMode: "ai" | "manual";
  setWishlistViewMode: (mode: "ai" | "manual") => void;
  wishlistFormCategory: string;
  setWishlistFormCategory: (value: string) => void;
  wishlistFormColor: string;
  setWishlistFormColor: (value: string) => void;
  wishlistFormNotes: string;
  setWishlistFormNotes: (value: string) => void;
  wishlistFormBusy: boolean;
  onAddWishlistItemManually: () => void | Promise<void>;
  onOpenWishlistAgent: () => void | Promise<void>;
  wishlistScoutCards: {
    ai: WishlistScoutCard[];
    manual: WishlistScoutCard[];
  };
  wishlistItems: WishlistItem[];
  wishlistDeletingIds: Set<string>;
  setWishlistDetailCard: (card: WishlistScoutCard | null) => void;
  onDeleteWishlistItem: (item: WishlistItem) => void | Promise<void>;
  onWishlistFindNearby: (item: WishlistScoutCard) => void | Promise<void>;
};

export default function WishlistTab(props: Props) {
  const activeCards =
    props.wishlistViewMode === "ai"
      ? props.wishlistScoutCards.ai
      : props.wishlistScoutCards.manual;

  return (
    <ScrollView
      contentContainerStyle={props.styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {props.wishlistViewMode === "manual" ? (
        <WishlistManualSection
          styles={props.styles}
          placeholderTextColor={props.placeholderTextColor}
          AnimatedPressableComponent={props.AnimatedPressableComponent}
          wishlistFormCategory={props.wishlistFormCategory}
          setWishlistFormCategory={props.setWishlistFormCategory}
          wishlistFormColor={props.wishlistFormColor}
          setWishlistFormColor={props.setWishlistFormColor}
          wishlistFormNotes={props.wishlistFormNotes}
          setWishlistFormNotes={props.setWishlistFormNotes}
          wishlistFormBusy={props.wishlistFormBusy}
          onAddWishlistItemManually={props.onAddWishlistItemManually}
          onOpenWishlistAgent={props.onOpenWishlistAgent}
        />
      ) : null}

      <WishlistCollectionSection
        styles={props.styles}
        wishlistViewMode={props.wishlistViewMode}
        setWishlistViewMode={props.setWishlistViewMode}
        activeCards={activeCards}
        wishlistItems={props.wishlistItems}
        wishlistDeletingIds={props.wishlistDeletingIds}
        setWishlistDetailCard={props.setWishlistDetailCard}
        onDeleteWishlistItem={props.onDeleteWishlistItem}
        onWishlistFindNearby={props.onWishlistFindNearby}
        WishlistVisualPreviewComponent={props.WishlistVisualPreviewComponent}
      />
    </ScrollView>
  );
}
