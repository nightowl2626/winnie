import React from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import type { AppStyles } from "../../../styles/appStyles";
import type { WardrobeItem } from "../../../types";
import type { AnimatedPressableComponentType } from "../../componentTypes";

type ClosetSection = {
  category: string;
  items: WardrobeItem[];
};

type Props = {
  styles: AppStyles;
  AnimatedPressableComponent: AnimatedPressableComponentType;
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
  resolveImageUri: (
    primaryBase64?: string,
    secondaryBase64?: string,
    imageUrl?: string
  ) => string | undefined;
  accentColor: string;
};

export default function ClosetCollectionSection(props: Props) {
  const AnimatedPressableComponent = props.AnimatedPressableComponent;

  return (
    <View style={[props.styles.collectionCard, props.styles.closetCollectionCard]}>
      <View pointerEvents="none" style={props.styles.closetCollectionBackdrop}>
        <View style={props.styles.closetCollectionGlowPrimary} />
        <View style={props.styles.closetCollectionGlowSecondary} />
        <View style={props.styles.closetCollectionSheen} />
      </View>
      {props.capturedItems.length ? (
        <View style={props.styles.closetBrowseSection}>
          <TextInput
            value={props.closetSearchQuery}
            onChangeText={props.setClosetSearchQuery}
            style={props.styles.calendarLogSearchInput}
            placeholder="Search item, color, style..."
            placeholderTextColor={props.placeholderTextColor}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={props.styles.calendarLogTabRow}
          >
            {props.closetCategoryTabs.map((tab) => (
              <AnimatedPressableComponent
                key={`closet-tab-${tab}`}
                style={[
                  props.styles.calendarLogTab,
                  props.closetCategoryTab === tab ? props.styles.calendarLogTabActive : undefined,
                ]}
                onPress={() => {
                  props.setClosetCategoryTab(tab);
                  props.setClosetColorFilter("all");
                }}
                scaleValue={0.93}
              >
                <Text
                  style={[
                    props.styles.calendarLogTabText,
                    props.closetCategoryTab === tab ? props.styles.calendarLogTabTextActive : undefined,
                  ]}
                >
                  {tab}
                </Text>
              </AnimatedPressableComponent>
            ))}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={props.styles.calendarLogFilterRow}
          >
            {props.closetAvailableColors.map((color) => (
              <Pressable
                key={`closet-color-${color}`}
                style={[
                  props.styles.calendarLogFilterChip,
                  props.closetColorFilter === color ? props.styles.calendarLogFilterChipActive : undefined,
                ]}
                onPress={() => props.setClosetColorFilter(color)}
              >
                {color === "all" ? (
                  <Text
                    style={[
                      props.styles.calendarLogFilterChipText,
                      props.closetColorFilter === color
                        ? props.styles.calendarLogFilterChipTextActive
                        : undefined,
                    ]}
                  >
                    All
                  </Text>
                ) : color === "multicolor" ? (
                  <View style={props.styles.calendarLogSwatchMulti}>
                    <View style={[props.styles.calendarLogSwatchDot, props.styles.calendarLogSwatchDotTopLeft]} />
                    <View style={[props.styles.calendarLogSwatchDot, props.styles.calendarLogSwatchDotTopRight]} />
                    <View style={[props.styles.calendarLogSwatchDot, props.styles.calendarLogSwatchDotBottomLeft]} />
                    <View style={[props.styles.calendarLogSwatchDot, props.styles.calendarLogSwatchDotBottomRight]} />
                  </View>
                ) : (
                  <View style={[props.styles.calendarLogSwatch, props.resolveColorSwatch(color)]} />
                )}
              </Pressable>
            ))}
          </ScrollView>
          {props.closetVisibleSections.length ? (
            props.closetVisibleSections.map((section) => (
              <View key={`closet-section-${section.category}`} style={props.styles.closetSection}>
                {props.closetCategoryTab === "all" ? (
                  <Text style={props.styles.calendarLogSectionTitle}>{section.category}</Text>
                ) : null}
                <View style={props.styles.gridWrap}>
                  {section.items.map((item) => (
                    <View key={item.id} style={props.styles.gridItem}>
                      <Pressable
                        style={[
                          props.styles.selectChip,
                          props.selectedTryOnItemIds.has(item.id) ? props.styles.selectChipActive : undefined,
                        ]}
                        onPress={() => props.onToggleTryOnItem(item.id)}
                      >
                        <Text
                          style={[
                            props.styles.selectChipText,
                            props.selectedTryOnItemIds.has(item.id)
                              ? props.styles.selectChipTextActive
                              : undefined,
                          ]}
                        >
                          Try
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          props.styles.deleteChip,
                          props.deletingIds.has(item.id) ? props.styles.deleteChipBusy : undefined,
                        ]}
                        disabled={props.deletingIds.has(item.id)}
                        onPress={() => props.onDeleteClosetItem(item)}
                      >
                        <Text style={props.styles.deleteChipText}>
                          {props.deletingIds.has(item.id) ? "…" : "×"}
                        </Text>
                      </Pressable>
                      {item.flagged_for_donation ? (
                        <View style={props.styles.sellChip}>
                          <Text style={props.styles.sellChipText}>To sell</Text>
                        </View>
                      ) : null}
                      <AnimatedPressableComponent
                        style={props.styles.gridTapArea}
                        onPress={() => props.onOpenClosetItem(item)}
                        scaleValue={0.95}
                      >
                        {props.resolveImageUri(
                          item.item_snippet_base64,
                          item.image_base64,
                          item.image_url
                        ) ? (
                          <Image
                            source={{
                              uri: props.resolveImageUri(
                                item.item_snippet_base64,
                                item.image_base64,
                                item.image_url
                              ),
                            }}
                            style={props.styles.gridImage}
                          />
                        ) : (
                          <View style={props.styles.gridImageFallback}>
                            <Text style={props.styles.gridFallbackText}>No Photo</Text>
                          </View>
                        )}
                        {props.enhancingIds.has(item.id) ? (
                          <View style={props.styles.enhancingOverlay}>
                            <ActivityIndicator size="small" color={props.accentColor} />
                            <Text style={props.styles.enhancingText}>Processing</Text>
                          </View>
                        ) : null}
                      </AnimatedPressableComponent>
                    </View>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <Text style={props.styles.optimizerMeta}>No items match this category/filter/search.</Text>
          )}
        </View>
      ) : (
        <View style={props.styles.emptyCard}>
          <Text style={props.styles.emptyTitle}>No garments yet</Text>
          <Text style={props.styles.emptySubtitle}>Start a scan to build your closet</Text>
        </View>
      )}
    </View>
  );
}
