import React from "react";
import { ScrollView } from "react-native";

import type { AppStyles } from "../../styles/appStyles";
import type { WardrobeItem } from "../../types";
import type { AnimatedPressableComponentType } from "../componentTypes";
import ClosetCollectionSection from "./closet/ClosetCollectionSection";
import ClosetTryOnSection from "./closet/ClosetTryOnSection";

type ClosetSection = {
  category: string;
  items: WardrobeItem[];
};

type Props = {
  styles: AppStyles;
  AnimatedPressableComponent: AnimatedPressableComponentType;
  scanSummary?: string;
  styleProfilePhotoBase64: string;
  resolveImageUri: (
    primaryBase64?: string,
    secondaryBase64?: string,
    imageUrl?: string
  ) => string | undefined;
  stylePhotoSaving: boolean;
  onUploadModelPhoto: () => void;
  selectedTryOnCount: number;
  hasModelPhoto: boolean;
  tryOnBusy: boolean;
  onRunTryOn: () => void | Promise<void>;
  tryOnPreviewSlots: Array<WardrobeItem | null>;
  onOpenStylistChat: () => void | Promise<void>;
  capturedItems: WardrobeItem[];
  closetSearchQuery: string;
  setClosetSearchQuery: (value: string) => void;
  placeholderTextColor: string;
  closetCategoryTabs: string[];
  closetCategoryTab: string;
  setClosetCategoryTab: (value: string) => void;
  setClosetColorFilter: (value: string) => void;
  closetAvailableColors: string[];
  closetColorFilter: string;
  resolveColorSwatch: (color: string) => { backgroundColor: string; borderColor?: string };
  closetVisibleSections: ClosetSection[];
  selectedTryOnItemIds: Set<string>;
  onToggleTryOnItem: (itemId: string) => void;
  deletingIds: Set<string>;
  onDeleteClosetItem: (item: WardrobeItem) => void | Promise<void>;
  onOpenClosetItem: (item: WardrobeItem) => void;
  enhancingIds: Set<string>;
  accentColor: string;
};

export default function ClosetTab(props: Props) {
  return (
    <ScrollView
      contentContainerStyle={props.styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <ClosetTryOnSection
        styles={props.styles}
        AnimatedPressableComponent={props.AnimatedPressableComponent}
        scanSummary={props.scanSummary}
        styleProfilePhotoBase64={props.styleProfilePhotoBase64}
        resolveImageUri={props.resolveImageUri}
        stylePhotoSaving={props.stylePhotoSaving}
        onUploadModelPhoto={props.onUploadModelPhoto}
        selectedTryOnCount={props.selectedTryOnCount}
        hasModelPhoto={props.hasModelPhoto}
        tryOnBusy={props.tryOnBusy}
        onRunTryOn={props.onRunTryOn}
        tryOnPreviewSlots={props.tryOnPreviewSlots}
        onOpenStylistChat={props.onOpenStylistChat}
      />
      <ClosetCollectionSection
        styles={props.styles}
        AnimatedPressableComponent={props.AnimatedPressableComponent}
        capturedItems={props.capturedItems}
        closetSearchQuery={props.closetSearchQuery}
        setClosetSearchQuery={props.setClosetSearchQuery}
        placeholderTextColor={props.placeholderTextColor}
        closetCategoryTabs={props.closetCategoryTabs}
        closetCategoryTab={props.closetCategoryTab}
        setClosetCategoryTab={props.setClosetCategoryTab}
        setClosetColorFilter={props.setClosetColorFilter}
        closetAvailableColors={props.closetAvailableColors}
        closetColorFilter={props.closetColorFilter}
        resolveColorSwatch={props.resolveColorSwatch}
        closetVisibleSections={props.closetVisibleSections}
        selectedTryOnItemIds={props.selectedTryOnItemIds}
        onToggleTryOnItem={props.onToggleTryOnItem}
        deletingIds={props.deletingIds}
        onDeleteClosetItem={props.onDeleteClosetItem}
        onOpenClosetItem={props.onOpenClosetItem}
        enhancingIds={props.enhancingIds}
        resolveImageUri={props.resolveImageUri}
        accentColor={props.accentColor}
      />
    </ScrollView>
  );
}
