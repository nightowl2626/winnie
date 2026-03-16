import React from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView } from "expo-camera";

import type { AppStyles } from "../styles/appStyles";
import type {
  MarketplaceListing,
  WardrobeItem,
  WishlistScoutCard,
} from "../types";
import ModalHeader from "./modals/ModalHeader";
import ModalShell from "./modals/ModalShell";

type LiveStatus = "offline" | "connecting" | "connected" | "error";

type LiveCardField = {
  key: "category" | "color" | "fabric_type" | "style" | "estimated_fit" | "note";
  label: string;
};

type PendingLiveWardrobeItem = {
  phase: string;
  category: string;
  title?: string;
  color?: string;
  style?: string;
  fabric_type?: string;
  condition?: string;
  estimated_fit?: string;
  note?: string;
  image_base64?: string;
  item_snippet_base64?: string;
};

type ClosetEditorDraft = {
  phase: string;
  category: string;
  title: string;
  color: string;
  fabric_type: string;
  style: string;
  estimated_fit: string;
  note: string;
  condition: string;
};

type MarketplaceListingModalState = {
  itemId: string;
  itemTitle: string;
  listing: MarketplaceListing;
};

type StylistExternalSuggestion = {
  slot: string;
  title: string;
  url: string;
  aestheticGoal?: string;
  aestheticMatch?: string;
  physicalStores?: string[];
  searchQueries?: string[];
};

type StylistWebResult = {
  title: string;
  url: string;
  domain?: string;
};

type CalendarLogSection = {
  category: string;
  items: WardrobeItem[];
};

type AppModalsProps = {
  styles: AppStyles;
  cameraRef: React.RefObject<CameraView | null>;
  scanStarted: boolean;
  onStopScanSession: () => void;
  captureProcessing: boolean;
  capturedItems: WardrobeItem[];
  liveStatus: LiveStatus;
  latestFeedback?: string;
  instruction?: string;
  pendingItem: PendingLiveWardrobeItem | null;
  resolveImageUri: (
    primaryBase64?: string,
    secondaryBase64?: string,
    imageUrl?: string
  ) => string | undefined;
  isLiveCardReady: (item: PendingLiveWardrobeItem | null) => boolean;
  lastCapture?: WardrobeItem | null;
  LIVE_CARD_FIELDS: readonly LiveCardField[];
  hasMeaningfulCardValue: (value?: string) => boolean;
  micStreaming: boolean;
  stopMicStreaming: () => Promise<void>;
  startMicStreaming: () => Promise<void>;
  speakerEnabled: boolean;
  setSpeakerEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  scanBusy: boolean;
  onFinalizeScan: () => Promise<void>;
  editingItem: WardrobeItem | null;
  editorDraft: ClosetEditorDraft | null;
  onCloseClosetEditor: () => void;
  editorSaving: boolean;
  useSideBySideEditor: boolean;
  setEditorDraft: React.Dispatch<React.SetStateAction<ClosetEditorDraft | null>>;
  placeholderTextColor: string;
  onSaveClosetEditor: () => Promise<void>;
  tryOnModalVisible: boolean;
  setTryOnModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  tryOnImageBase64: string;
  shopTryOnModalVisible: boolean;
  isConciergeVisible: boolean;
  setShopTryOnModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  shopTryOnImageBase64: string;
  calendarLogModalVisible: boolean;
  onCloseCalendarLogModal: () => void;
  calendarLogDate: string;
  calendarLogSelectedItems: WardrobeItem[];
  onToggleDailyLogItem: (itemId: string) => void;
  calendarLogSearchQuery: string;
  setCalendarLogSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  calendarLogCategoryTabs: string[];
  calendarLogCategoryTab: string;
  setCalendarLogCategoryTab: React.Dispatch<React.SetStateAction<string>>;
  setCalendarLogColorFilter: React.Dispatch<React.SetStateAction<string>>;
  calendarLogAvailableColors: string[];
  calendarLogColorFilter: string;
  resolveColorSwatch: (color: string) => { backgroundColor: string; borderColor?: string };
  calendarLogVisibleSections: CalendarLogSection[];
  dailyLogSelectionIds: Set<string>;
  dailyLogBusy: boolean;
  onLogTodaysOutfit: () => Promise<void>;
  listingModal: MarketplaceListingModalState | null;
  setListingModal: React.Dispatch<React.SetStateAction<MarketplaceListingModalState | null>>;
  listingModalItem?: WardrobeItem | null;
  formatUsd: (value: number) => string;
  onCopyMarketplaceListing: () => Promise<void>;
  listingKeepBusy: boolean;
  onKeepMarketplaceItem: () => Promise<void>;
  wishlistDetailCard: WishlistScoutCard | null;
  setWishlistDetailCard: React.Dispatch<React.SetStateAction<WishlistScoutCard | null>>;
  WishlistVisualPreviewComponent: React.ComponentType<{
    category: string;
    color?: string;
    large?: boolean;
  }>;
  onWishlistFindNearby: (item: WishlistScoutCard) => void;
  stylistModalVisible: boolean;
  onCloseStylistChat: () => Promise<void>;
  stylistVoiceBreathAnim: Animated.Value;
  stylistSpeechAnim: Animated.Value;
  stylistStatus: LiveStatus;
  stylistOverlayItems: WardrobeItem[];
  STYLIST_CARD_POSITIONS: readonly { x: number; y: number }[];
  stylistOverlayScale: number;
  stylistExternalSuggestions: StylistExternalSuggestion[];
  onOpenStylistSuggestion: (url: string) => Promise<void>;
  stylistWebResults: StylistWebResult[];
  stylistWebSearchQueries: string[];
  stylistMicStreaming: boolean;
  stopStylistMicStreaming: () => Promise<void>;
  startStylistMicStreaming: () => Promise<void>;
  setStylistSpeakerEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  stylistSpeakerEnabled: boolean;
  startStylistSession: () => Promise<void>;
  wishlistAgentModalVisible: boolean;
  onCloseWishlistAgent: () => Promise<void>;
  wishlistVoiceBreathAnim: Animated.Value;
  wishlistSpeechAnim: Animated.Value;
  wishlistAgentStatus: LiveStatus;
  wishlistAgentMicStreaming: boolean;
  stopWishlistAgentMicStreaming: () => Promise<void>;
  startWishlistAgentMicStreaming: () => Promise<void>;
  setWishlistAgentSpeakerEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  wishlistAgentSpeakerEnabled: boolean;
  startWishlistAgentSession: () => Promise<void>;
};

export default function AppModals(props: AppModalsProps) {
  const WishlistVisualPreviewComponent = props.WishlistVisualPreviewComponent;

  return (
    <>
      <Modal
        visible={props.scanStarted}
        transparent={false}
        animationType="fade"
        onRequestClose={props.onStopScanSession}
      >
        <View style={props.styles.scanSessionRoot}>
          <CameraView ref={props.cameraRef} style={props.styles.cameraFullscreen} facing="back" />
          <SafeAreaView style={props.styles.scanTopBar}>
            <View style={props.styles.topPill}>
              <Text style={props.styles.topPillText}>Auto Scan</Text>
            </View>
            {props.captureProcessing ? (
              <View style={[props.styles.topPill, props.styles.topPillActive]}>
                <Text style={props.styles.topPillText}>Processing image...</Text>
              </View>
            ) : null}
            <View style={props.styles.topPill}>
              <Text style={props.styles.topPillText}>{props.capturedItems.length} items</Text>
            </View>
            <View
              style={[
                props.styles.statusDot,
                props.liveStatus === "connected" ? props.styles.statusDotLive : undefined,
                props.liveStatus === "error" ? props.styles.statusDotError : undefined,
              ]}
            />
            <Pressable style={props.styles.closePill} onPress={props.onStopScanSession}>
              <Text style={props.styles.closePillText}>End</Text>
            </Pressable>
          </SafeAreaView>
          <View style={props.styles.reticule} />
          <View style={props.styles.scanBottom}>
            {props.latestFeedback || props.instruction ? (
              <Text style={props.styles.agentText} numberOfLines={3}>
                {props.latestFeedback || props.instruction}
              </Text>
            ) : null}
            {props.pendingItem ? (
              (() => {
                const pendingItem = props.pendingItem;
                return (
              <View style={props.styles.liveCard}>
                <View style={props.styles.liveCardThumbWrap}>
                  {props.resolveImageUri(
                    pendingItem.item_snippet_base64,
                    pendingItem.image_base64
                  ) ? (
                    <Image
                      source={{
                        uri: props.resolveImageUri(
                          pendingItem.item_snippet_base64,
                          pendingItem.image_base64
                        ),
                      }}
                      style={props.styles.liveCardThumb}
                    />
                  ) : (
                    <View style={props.styles.liveCardThumbEmpty} />
                  )}
                  {props.isLiveCardReady(pendingItem) ? (
                    <View style={props.styles.liveCardReadyBadge}>
                      <Text style={props.styles.liveCardReadyText}>Ready</Text>
                    </View>
                  ) : null}
                </View>
                <View style={props.styles.liveCardFields}>
                  {pendingItem.title ? (
                    <Text style={props.styles.liveCardTitle} numberOfLines={1}>
                      {pendingItem.title}
                    </Text>
                  ) : null}
                  {props.LIVE_CARD_FIELDS.map((field) => {
                    const value = pendingItem[field.key];
                    const isOptionalNoteField = field.key === "note";
                    const filled = props.hasMeaningfulCardValue(value);
                    return (
                      <View key={field.key} style={props.styles.liveCardRow}>
                        <Text style={props.styles.liveCardLabel}>{field.label}</Text>
                        <Text
                          style={[
                            props.styles.liveCardValue,
                            !filled && !isOptionalNoteField ? props.styles.liveCardValuePending : undefined,
                          ]}
                          numberOfLines={1}
                        >
                          {filled ? value : isOptionalNoteField ? "optional" : "scanning..."}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
                );
              })()
            ) : props.lastCapture ? (
              <View style={props.styles.lastSavedRow}>
                {props.resolveImageUri(
                  props.lastCapture.item_snippet_base64,
                  props.lastCapture.image_base64,
                  props.lastCapture.image_url
                ) ? (
                  <Image
                    source={{
                      uri: props.resolveImageUri(
                        props.lastCapture.item_snippet_base64,
                        props.lastCapture.image_base64,
                        props.lastCapture.image_url
                      ),
                    }}
                    style={props.styles.lastSavedThumb}
                  />
                ) : null}
                <Text style={props.styles.lastSavedText} numberOfLines={1}>
                  Saved: {props.lastCapture.title ?? props.lastCapture.category}
                  {props.lastCapture.color ? ` · ${props.lastCapture.color}` : ""}
                </Text>
              </View>
            ) : null}
            <View style={props.styles.controlRow}>
              <Pressable
                style={[
                  props.styles.controlPill,
                  props.micStreaming ? props.styles.controlPillActive : undefined,
                ]}
                onPress={() => {
                  if (props.micStreaming) {
                    void props.stopMicStreaming();
                  } else {
                    void props.startMicStreaming();
                  }
                }}
              >
                <Text style={props.styles.controlPillText}>Mic {props.micStreaming ? "On" : "Off"}</Text>
              </Pressable>
              <Pressable
                style={[
                  props.styles.controlPill,
                  props.speakerEnabled ? props.styles.controlPillActive : undefined,
                ]}
                onPress={() => props.setSpeakerEnabled((value: boolean) => !value)}
              >
                <Text style={props.styles.controlPillText}>
                  Speaker {props.speakerEnabled ? "On" : "Off"}
                </Text>
              </Pressable>
            </View>
            <Pressable
              style={[props.styles.finishBtn, props.scanBusy ? props.styles.dimmed : undefined]}
              disabled={props.scanBusy}
              onPress={() => void props.onFinalizeScan()}
            >
              <Text style={props.styles.finishBtnText}>
                {props.scanBusy ? "Processing..." : "Finish Scan"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(props.editingItem && props.editorDraft)}
        transparent
        animationType="fade"
        onRequestClose={props.onCloseClosetEditor}
      >
        <ModalShell
          styles={props.styles}
          cardStyle={[props.styles.editorCard, props.styles.editItemCardGlass]}
          glowWrapStyle={props.styles.editItemCardGlowWrap}
          glowPrimaryStyle={props.styles.editItemCardGlowPrimary}
          glowSecondaryStyle={props.styles.editItemCardGlowSecondary}
          sheenStyle={props.styles.editItemCardSheen}
        >
            <ModalHeader
              styles={props.styles}
              title="Edit Item"
              alignStart
              onClose={props.onCloseClosetEditor}
              disabled={props.editorSaving}
              closeButtonStyle={[props.styles.editorCloseBtn, props.styles.editItemCloseBtn]}
              titleStyle={props.styles.editItemHeaderTitle}
            />
            <View
              style={[
                props.styles.editorBody,
                !props.useSideBySideEditor ? props.styles.editorBodyStacked : undefined,
              ]}
            >
              {props.editingItem ? (
                <View
                  style={[
                    props.styles.editorPreviewWrap,
                    props.styles.editItemPreviewWrap,
                    !props.useSideBySideEditor ? props.styles.editorPreviewWrapStacked : undefined,
                  ]}
                >
                  {props.resolveImageUri(
                    props.editingItem.item_snippet_base64,
                    props.editingItem.image_base64,
                    props.editingItem.image_url
                  ) ? (
                    <Image
                      source={{
                        uri: props.resolveImageUri(
                          props.editingItem.item_snippet_base64,
                          props.editingItem.image_base64,
                          props.editingItem.image_url
                        ),
                      }}
                      style={[
                        props.styles.editorPreviewImage,
                        !props.useSideBySideEditor ? props.styles.editorPreviewImageStacked : undefined,
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        props.styles.editorPreviewFallback,
                        !props.useSideBySideEditor ? props.styles.editorPreviewImageStacked : undefined,
                      ]}
                    >
                      <Text style={props.styles.gridFallbackText}>No Photo</Text>
                    </View>
                  )}
                </View>
              ) : null}
              <ScrollView
                style={props.styles.editorScroll}
                contentContainerStyle={[
                  props.styles.editorScrollContent,
                  props.styles.editItemScrollContent,
                ]}
                keyboardShouldPersistTaps="handled"
              >
                {props.editorDraft ? (
                  <>
                    <Text style={[props.styles.editorLabel, props.styles.editItemLabel]}>Category *</Text>
                    <TextInput
                      value={props.editorDraft.category}
                      onChangeText={(text) =>
                        props.setEditorDraft((current) =>
                          current ? { ...current, category: text } : current
                        )
                      }
                      style={[props.styles.editorInput, props.styles.editItemInput]}
                      placeholder="tops, pants, dress..."
                      placeholderTextColor={props.placeholderTextColor}
                    />
                    <Text style={[props.styles.editorLabel, props.styles.editItemLabel]}>Title</Text>
                    <TextInput
                      value={props.editorDraft.title}
                      onChangeText={(text) =>
                        props.setEditorDraft((current) =>
                          current ? { ...current, title: text } : current
                        )
                      }
                      style={[props.styles.editorInput, props.styles.editItemInput]}
                      placeholder="Item title"
                      placeholderTextColor={props.placeholderTextColor}
                    />
                    <Text style={[props.styles.editorLabel, props.styles.editItemLabel]}>Color</Text>
                    <TextInput
                      value={props.editorDraft.color}
                      onChangeText={(text) =>
                        props.setEditorDraft((current) =>
                          current ? { ...current, color: text } : current
                        )
                      }
                      style={[props.styles.editorInput, props.styles.editItemInput]}
                      placeholder="Color"
                      placeholderTextColor={props.placeholderTextColor}
                    />
                    <Text style={[props.styles.editorLabel, props.styles.editItemLabel]}>Material</Text>
                    <TextInput
                      value={props.editorDraft.fabric_type}
                      onChangeText={(text) =>
                        props.setEditorDraft((current) =>
                          current ? { ...current, fabric_type: text } : current
                        )
                      }
                      style={[props.styles.editorInput, props.styles.editItemInput]}
                      placeholder="Material"
                      placeholderTextColor={props.placeholderTextColor}
                    />
                    <Text style={[props.styles.editorLabel, props.styles.editItemLabel]}>Style</Text>
                    <TextInput
                      value={props.editorDraft.style}
                      onChangeText={(text) =>
                        props.setEditorDraft((current) =>
                          current ? { ...current, style: text } : current
                        )
                      }
                      style={[props.styles.editorInput, props.styles.editItemInput]}
                      placeholder="Style"
                      placeholderTextColor={props.placeholderTextColor}
                    />
                    <Text style={[props.styles.editorLabel, props.styles.editItemLabel]}>Fit</Text>
                    <TextInput
                      value={props.editorDraft.estimated_fit}
                      onChangeText={(text) =>
                        props.setEditorDraft((current) =>
                          current ? { ...current, estimated_fit: text } : current
                        )
                      }
                      style={[props.styles.editorInput, props.styles.editItemInput]}
                      placeholder="Fit"
                      placeholderTextColor={props.placeholderTextColor}
                    />
                    <Text style={[props.styles.editorLabel, props.styles.editItemLabel]}>Extra Notes</Text>
                    <TextInput
                      value={props.editorDraft.note}
                      onChangeText={(text) =>
                        props.setEditorDraft((current) =>
                          current ? { ...current, note: text } : current
                        )
                      }
                      style={[
                        props.styles.editorInput,
                        props.styles.editorInputMultiline,
                        props.styles.editItemInput,
                      ]}
                      placeholder="Optional notes"
                      placeholderTextColor={props.placeholderTextColor}
                      multiline
                    />
                    <Text style={[props.styles.editorMeta, props.styles.editItemMeta]}>
                      ID: {props.editingItem?.id ?? ""}
                    </Text>
                    <Text style={[props.styles.editorMeta, props.styles.editItemMeta]}>
                      Added: {props.editingItem?.created_at ?? ""}
                    </Text>
                  </>
                ) : null}
              </ScrollView>
            </View>
            <View style={props.styles.editorActions}>
              <Pressable
                style={[props.styles.editorGhostBtn, props.styles.editItemGhostBtn]}
                onPress={props.onCloseClosetEditor}
                disabled={props.editorSaving}
              >
                <Text style={[props.styles.editorGhostText, props.styles.editItemGhostText]}>Close</Text>
              </Pressable>
              <Pressable
                style={[
                  props.styles.editorSaveBtn,
                  props.styles.editItemSaveBtn,
                  props.editorSaving ? props.styles.dimmed : undefined,
                ]}
                onPress={() => void props.onSaveClosetEditor()}
                disabled={props.editorSaving}
              >
                <Text style={[props.styles.editorSaveText, props.styles.editItemSaveText]}>
                  {props.editorSaving ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>
        </ModalShell>
      </Modal>

      <Modal
        visible={props.tryOnModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => props.setTryOnModalVisible(false)}
      >
        <View style={props.styles.editorBackdrop}>
          <View style={props.styles.tryOnResultCard}>
            <View style={props.styles.editorHeaderRow}>
              <Text style={props.styles.editorTitle}>Try-On Result</Text>
              <Pressable
                style={props.styles.editorCloseBtn}
                onPress={() => props.setTryOnModalVisible(false)}
              >
                <Text style={props.styles.editorCloseText}>×</Text>
              </Pressable>
            </View>
            {props.resolveImageUri(props.tryOnImageBase64) ? (
              <Image
                source={{ uri: props.resolveImageUri(props.tryOnImageBase64) }}
                style={props.styles.tryOnResultImage}
              />
            ) : (
              <View style={props.styles.editorPreviewFallback}>
                <Text style={props.styles.gridFallbackText}>No try-on image yet</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={props.shopTryOnModalVisible && !props.isConciergeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => props.setShopTryOnModalVisible(false)}
      >
        <View style={props.styles.editorBackdrop}>
          <View style={props.styles.tryOnResultCard}>
            <View style={props.styles.editorHeaderRow}>
              <Text style={props.styles.editorTitle}>In-Store Try-On Preview</Text>
              <Pressable
                style={props.styles.editorCloseBtn}
                onPress={() => props.setShopTryOnModalVisible(false)}
              >
                <Text style={props.styles.editorCloseText}>×</Text>
              </Pressable>
            </View>
            {props.resolveImageUri(props.shopTryOnImageBase64) ? (
              <Image
                source={{ uri: props.resolveImageUri(props.shopTryOnImageBase64) }}
                style={props.styles.tryOnResultImage}
              />
            ) : (
              <View style={props.styles.editorPreviewFallback}>
                <Text style={props.styles.gridFallbackText}>No try-on image yet</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={props.calendarLogModalVisible}
        animationType="fade"
        transparent
        onRequestClose={props.onCloseCalendarLogModal}
      >
        <ModalShell
          styles={props.styles}
          cardStyle={[props.styles.editorCard, props.styles.calendarLogCardGlass]}
          glowWrapStyle={props.styles.calendarLogCardGlowWrap}
          glowPrimaryStyle={props.styles.calendarLogCardGlowPrimary}
          glowSecondaryStyle={props.styles.calendarLogCardGlowSecondary}
          sheenStyle={props.styles.calendarLogCardSheen}
        >
            <ModalHeader
              styles={props.styles}
              title="Log Outfit"
              subtitle={props.calendarLogDate || "Select a date"}
              alignStart
              onClose={props.onCloseCalendarLogModal}
              closeButtonStyle={[props.styles.editorCloseBtn, props.styles.editItemCloseBtn]}
              titleStyle={props.styles.calendarLogHeaderTitle}
              subtitleStyle={props.styles.calendarLogHeaderDate}
            />
            <ScrollView
              contentContainerStyle={[
                props.styles.calendarLogModalContent,
                props.styles.calendarLogModalContentGlass,
              ]}
            >
              <Text style={props.styles.calendarLogIntro}>
                Tap the items you wore on this date, then save. The calendar will update with the look.
              </Text>
              {props.calendarLogSelectedItems.length ? (
                <View style={props.styles.calendarLogSelectedSection}>
                  <Text style={props.styles.calendarLogSectionTitle}>Selected</Text>
                  <View style={props.styles.dailyLogGrid}>
                    {props.calendarLogSelectedItems.map((item) => (
                      <Pressable
                        key={`calendar-log-selected-${item.id}`}
                        style={[props.styles.dailyLogItem, props.styles.dailyLogItemActive]}
                        onPress={() => props.onToggleDailyLogItem(item.id)}
                      >
                        {props.resolveImageUri(item.item_snippet_base64, item.image_base64, item.image_url) ? (
                          <Image
                            source={{
                              uri: props.resolveImageUri(
                                item.item_snippet_base64,
                                item.image_base64,
                                item.image_url
                              ),
                            }}
                            style={props.styles.dailyLogImage}
                          />
                        ) : (
                          <View style={props.styles.dailyLogImageFallback}>
                            <Text style={props.styles.gridFallbackText}>No Photo</Text>
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              <TextInput
                value={props.calendarLogSearchQuery}
                onChangeText={props.setCalendarLogSearchQuery}
                style={props.styles.calendarLogSearchInput}
                placeholder="Search item, color, style..."
                placeholderTextColor={props.placeholderTextColor}
              />
              {props.capturedItems.length ? (
                <View style={props.styles.calendarLogSections}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={props.styles.calendarLogTabRow}
                  >
                    {props.calendarLogCategoryTabs.map((tab: string) => (
                      <Pressable
                        key={`calendar-tab-${tab}`}
                        style={[
                          props.styles.calendarLogTab,
                          props.calendarLogCategoryTab === tab ? props.styles.calendarLogTabActive : undefined,
                        ]}
                        onPress={() => {
                          props.setCalendarLogCategoryTab(tab);
                          props.setCalendarLogColorFilter("all");
                        }}
                      >
                        <Text
                          style={[
                            props.styles.calendarLogTabText,
                            props.calendarLogCategoryTab === tab
                              ? props.styles.calendarLogTabTextActive
                              : undefined,
                          ]}
                        >
                          {tab}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={props.styles.calendarLogFilterRow}
                  >
                    {props.calendarLogAvailableColors.map((color: string) => (
                      <Pressable
                        key={`calendar-color-${color}`}
                        style={[
                          props.styles.calendarLogFilterChip,
                          props.calendarLogColorFilter === color
                            ? props.styles.calendarLogFilterChipActive
                            : undefined,
                        ]}
                        onPress={() => props.setCalendarLogColorFilter(color)}
                      >
                        {color === "all" ? (
                          <Text
                            style={[
                              props.styles.calendarLogFilterChipText,
                              props.calendarLogColorFilter === color
                                ? props.styles.calendarLogFilterChipTextActive
                                : undefined,
                            ]}
                          >
                            All
                          </Text>
                        ) : color === "multicolor" ? (
                          <View style={props.styles.calendarLogSwatchMulti}>
                            <View
                              style={[
                                props.styles.calendarLogSwatchDot,
                                props.styles.calendarLogSwatchDotTopLeft,
                              ]}
                            />
                            <View
                              style={[
                                props.styles.calendarLogSwatchDot,
                                props.styles.calendarLogSwatchDotTopRight,
                              ]}
                            />
                            <View
                              style={[
                                props.styles.calendarLogSwatchDot,
                                props.styles.calendarLogSwatchDotBottomLeft,
                              ]}
                            />
                            <View
                              style={[
                                props.styles.calendarLogSwatchDot,
                                props.styles.calendarLogSwatchDotBottomRight,
                              ]}
                            />
                          </View>
                        ) : (
                          <View
                            style={[
                              props.styles.calendarLogSwatch,
                              props.resolveColorSwatch(color),
                            ]}
                          />
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                  {props.calendarLogVisibleSections.map((section) => (
                    <View key={`log-section-${section.category}`} style={props.styles.calendarLogSection}>
                      <Text style={props.styles.calendarLogSectionTitle}>{section.category}</Text>
                      <View style={props.styles.dailyLogGrid}>
                        {section.items.map((item) => {
                          const selected = props.dailyLogSelectionIds.has(item.id);
                          return (
                            <Pressable
                              key={`calendar-log-${item.id}`}
                              style={[
                                props.styles.dailyLogItem,
                                selected ? props.styles.dailyLogItemActive : undefined,
                              ]}
                              onPress={() => props.onToggleDailyLogItem(item.id)}
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
                                  style={props.styles.dailyLogImage}
                                />
                              ) : (
                                <View style={props.styles.dailyLogImageFallback}>
                                  <Text style={props.styles.gridFallbackText}>No Photo</Text>
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                  {!props.calendarLogVisibleSections.length ? (
                    <Text style={props.styles.optimizerMeta}>No items match this category/filter/search.</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={props.styles.optimizerMeta}>No closet items yet.</Text>
              )}
            </ScrollView>
            <View style={props.styles.editorActions}>
              <Pressable
                style={[props.styles.editorGhostBtn, props.styles.editItemGhostBtn]}
                onPress={props.onCloseCalendarLogModal}
              >
                <Text style={[props.styles.editorGhostText, props.styles.editItemGhostText]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  props.styles.editorSaveBtn,
                  props.styles.editItemSaveBtn,
                  (props.dailyLogBusy || !props.dailyLogSelectionIds.size) ? props.styles.dimmed : undefined,
                ]}
                onPress={() => void props.onLogTodaysOutfit()}
                disabled={props.dailyLogBusy || !props.dailyLogSelectionIds.size}
              >
                <Text style={[props.styles.editorSaveText, props.styles.editItemSaveText]}>
                  {props.dailyLogBusy ? "Logging..." : "Save Outfit"}
                </Text>
              </Pressable>
            </View>
        </ModalShell>
      </Modal>

      <Modal
        visible={Boolean(props.listingModal)}
        transparent
        animationType="fade"
        onRequestClose={() => props.setListingModal(null)}
      >
        <ModalShell
          styles={props.styles}
          cardStyle={[props.styles.listingCard, props.styles.listingCardGlass]}
          glowWrapStyle={props.styles.listingCardGlowWrap}
          glowPrimaryStyle={props.styles.listingCardGlowPrimary}
          glowSecondaryStyle={props.styles.listingCardGlowSecondary}
          sheenStyle={props.styles.listingCardSheen}
        >
            <ModalHeader
              styles={props.styles}
              onClose={() => props.setListingModal(null)}
              leading={<View />}
              closeButtonStyle={[props.styles.editorCloseBtn, props.styles.listingCloseBtn]}
            />
            {props.listingModal ? (
              <ScrollView
                style={props.styles.listingScroll}
                contentContainerStyle={props.styles.listingScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {props.listingModalItem &&
                props.resolveImageUri(
                  props.listingModalItem.item_snippet_base64,
                  props.listingModalItem.image_base64,
                  props.listingModalItem.image_url
                ) ? (
                  <Image
                    source={{
                      uri: props.resolveImageUri(
                        props.listingModalItem.item_snippet_base64,
                        props.listingModalItem.image_base64,
                        props.listingModalItem.image_url
                      ),
                    }}
                    style={props.styles.listingImage}
                  />
                ) : null}
                <Text style={props.styles.listingItemTitle}>{props.listingModal.itemTitle}</Text>
                <View style={props.styles.listingPriceRow}>
                  <Text style={props.styles.listingPriceLabel}>Suggested price</Text>
                  <Text style={props.styles.listingPrice}>
                    {props.formatUsd(Number(props.listingModal.listing.suggested_price || 0))}
                  </Text>
                </View>
                <View style={props.styles.listingTextCard}>
                  <Text style={props.styles.listingGeneratedTitle}>
                    {props.listingModal.listing.title}
                  </Text>
                  <Text style={props.styles.listingDescription}>
                    {props.listingModal.listing.description}
                  </Text>
                </View>
                <View style={props.styles.listingActionsRow}>
                  <Pressable
                    style={props.styles.listingPrimaryBtn}
                    onPress={() => void props.onCopyMarketplaceListing()}
                  >
                    <Text style={props.styles.listingPrimaryBtnText}>Copy</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      props.styles.listingGhostBtn,
                      props.listingKeepBusy ? props.styles.dimmed : undefined,
                    ]}
                    onPress={() => void props.onKeepMarketplaceItem()}
                    disabled={props.listingKeepBusy}
                  >
                    <Text style={props.styles.listingGhostBtnText}>
                      {props.listingKeepBusy ? "Saving..." : "Keep"}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
        </ModalShell>
      </Modal>

      <Modal
        visible={Boolean(props.wishlistDetailCard)}
        transparent
        animationType="fade"
        onRequestClose={() => props.setWishlistDetailCard(null)}
      >
        <ModalShell
          styles={props.styles}
          cardStyle={[props.styles.wishlistDetailCard, props.styles.wishlistDetailCardGlass]}
          glowWrapStyle={props.styles.wishlistCardGlowWrap}
          glowPrimaryStyle={props.styles.wishlistCardGlowPrimary}
          glowSecondaryStyle={props.styles.wishlistCardGlowSecondary}
          sheenStyle={props.styles.wishlistCardSheen}
        >
            <ModalHeader
              styles={props.styles}
              title={props.wishlistDetailCard?.category || "Wishlist"}
              alignStart
              onClose={() => props.setWishlistDetailCard(null)}
              closeButtonStyle={[props.styles.editorCloseBtn, props.styles.editItemCloseBtn]}
              titleStyle={props.styles.editItemHeaderTitle}
            />
            {props.wishlistDetailCard ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={props.styles.wishlistDetailScrollContent}
              >
                <WishlistVisualPreviewComponent
                  category={props.wishlistDetailCard.category}
                  color={props.wishlistDetailCard.color}
                  large
                />
                <Text style={props.styles.wishlistDetailReasoning}>
                  {props.wishlistDetailCard.notes || props.wishlistDetailCard.reasoning}
                </Text>
                {props.wishlistDetailCard.liveMatch ? (
                  <View style={props.styles.wishlistDetailInfoCard}>
                    <Text style={props.styles.wishlistDetailInfoTitle}>Live market match</Text>
                    <Text style={props.styles.wishlistDetailInfoBody}>
                      {props.wishlistDetailCard.liveMatch.name} · sustainability{" "}
                      {Math.round(
                        props.wishlistDetailCard.liveMatch.ai_evaluation?.sustainability_score || 0
                      )}
                    </Text>
                  </View>
                ) : null}
                <View style={props.styles.wishlistDetailActions}>
                  <Pressable
                    style={props.styles.listingPrimaryBtn}
                    onPress={() => {
                      const activeCard = props.wishlistDetailCard;
                      if (!activeCard) {
                        return;
                      }
                      props.onWishlistFindNearby(activeCard);
                      props.setWishlistDetailCard(null);
                    }}
                  >
                    <Text style={props.styles.listingPrimaryBtnText}>Find nearby</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
        </ModalShell>
      </Modal>

      <Modal
        visible={props.stylistModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          void props.onCloseStylistChat();
        }}
      >
        <View style={props.styles.sheetBackdrop}>
          <View style={props.styles.stylistCard}>
            <Pressable
              style={props.styles.stylistCloseFloating}
              onPress={() => {
                void props.onCloseStylistChat();
              }}
            >
              <Text style={props.styles.editorCloseText}>×</Text>
            </Pressable>

            <View style={props.styles.stylistVoiceStage}>
              <Animated.View
                style={[
                  props.styles.stylistVoiceHalo,
                  {
                    transform: [
                      {
                        scale: props.stylistVoiceBreathAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.08],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  props.styles.stylistVoiceHaloOuter,
                  {
                    opacity: props.stylistSpeechAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.14, 0.45],
                    }),
                    transform: [
                      {
                        scale: props.stylistSpeechAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1.02, 1.28],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  props.styles.stylistVoiceCore,
                  props.stylistStatus !== "connected" ? props.styles.stylistVoiceCoreIdle : undefined,
                  {
                    transform: [
                      {
                        scale: props.stylistSpeechAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.12],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={props.styles.stylistVoiceCoreDot} />
              </Animated.View>
              <View style={props.styles.stylistOverlayCards} pointerEvents="none">
                {props.stylistOverlayItems.map((item, index) => {
                  const slot =
                    props.STYLIST_CARD_POSITIONS[index % props.STYLIST_CARD_POSITIONS.length];
                  const uri = props.resolveImageUri(
                    item.item_snippet_base64,
                    item.image_base64,
                    item.image_url
                  );
                  return (
                    <View
                      key={`${item.id}-${index}`}
                      style={[
                        props.styles.stylistOverlayCard,
                        {
                          transform: [
                            { translateX: slot.x * props.stylistOverlayScale },
                            { translateY: slot.y * props.stylistOverlayScale },
                          ],
                        },
                      ]}
                    >
                      {uri ? (
                        <Image source={{ uri }} style={props.styles.stylistOverlayImage} />
                      ) : (
                        <View style={props.styles.stylistOverlayFallback} />
                      )}
                    </View>
                  );
                })}
              </View>
              {props.stylistExternalSuggestions.length ? (
                <View style={props.styles.stylistSuggestionPanel}>
                  <Text style={props.styles.stylistSuggestionTitle}>Suggested Purchases</Text>
                  {props.stylistExternalSuggestions.map((suggestion, index) => (
                    <View
                      key={`ext-${index}-${suggestion.url}`}
                      style={props.styles.stylistSuggestionRow}
                    >
                      <View style={props.styles.stylistSuggestionTextWrap}>
                        <Text style={props.styles.stylistSuggestionText} numberOfLines={1}>
                          {suggestion.aestheticGoal ||
                            `${suggestion.slot || "item"}: ${suggestion.title}`}
                        </Text>
                        {suggestion.title ? (
                          <Text style={props.styles.stylistSuggestionMeta} numberOfLines={1}>
                            {`${suggestion.slot || "item"} target: ${suggestion.title}`}
                          </Text>
                        ) : null}
                        {suggestion.physicalStores?.length ? (
                          <Text style={props.styles.stylistSuggestionStoreLine} numberOfLines={2}>
                            {`Nearby match: ${suggestion.physicalStores.join(" • ")}`}
                          </Text>
                        ) : null}
                        {suggestion.aestheticMatch ? (
                          <Text style={props.styles.stylistSuggestionMatchLine} numberOfLines={2}>
                            {suggestion.aestheticMatch}
                          </Text>
                        ) : null}
                        <Text style={props.styles.stylistSuggestionUrl} numberOfLines={1}>
                          {suggestion.searchQueries?.[0] || suggestion.url}
                        </Text>
                      </View>
                      <Pressable
                        style={props.styles.stylistSuggestionLinkBtn}
                        onPress={() => void props.onOpenStylistSuggestion(suggestion.url)}
                      >
                        <Text style={props.styles.stylistSuggestionLinkText}>Where to find it</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              {props.stylistWebResults.length ? (
                <View style={props.styles.stylistWebResultsPanel}>
                  <Text style={props.styles.stylistSuggestionTitle}>Live Web Results</Text>
                  {props.stylistWebSearchQueries.length ? (
                    <Text style={props.styles.stylistWebQueryText} numberOfLines={2}>
                      {props.stylistWebSearchQueries.join("  •  ")}
                    </Text>
                  ) : null}
                  {props.stylistWebResults.map((result, index) => (
                    <View key={`web-${index}-${result.url}`} style={props.styles.stylistSuggestionRow}>
                      <View style={props.styles.stylistSuggestionTextWrap}>
                        <Text style={props.styles.stylistSuggestionText} numberOfLines={1}>
                          {result.title}
                        </Text>
                        {result.domain ? (
                          <Text style={props.styles.stylistSuggestionMeta} numberOfLines={1}>
                            {result.domain}
                          </Text>
                        ) : null}
                        <Text style={props.styles.stylistSuggestionUrl} numberOfLines={1}>
                          {result.url}
                        </Text>
                      </View>
                      <Pressable
                        style={props.styles.stylistSuggestionLinkBtn}
                        onPress={() => void props.onOpenStylistSuggestion(result.url)}
                      >
                        <Text style={props.styles.stylistSuggestionLinkText}>Open</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={props.styles.stylistActions}>
              <Pressable
                style={[
                  props.styles.stylistIconBtn,
                  props.stylistMicStreaming ? props.styles.stylistIconBtnActive : undefined,
                  props.stylistStatus !== "connected" ? props.styles.stylistIconBtnDisabled : undefined,
                ]}
                onPress={() => {
                  if (props.stylistMicStreaming) {
                    void props.stopStylistMicStreaming();
                  } else {
                    void props.startStylistMicStreaming();
                  }
                }}
                disabled={props.stylistStatus !== "connected"}
              >
                <View style={props.styles.stylistMicStem} />
                <View style={props.styles.stylistMicBase} />
              </Pressable>
              <Pressable
                style={[
                  props.styles.stylistIconBtn,
                  props.stylistSpeakerEnabled ? props.styles.stylistIconBtnActive : undefined,
                ]}
                onPress={() => props.setStylistSpeakerEnabled((value: boolean) => !value)}
              >
                <View style={props.styles.stylistSpeakerBody} />
                <View style={props.styles.stylistSpeakerWaveA} />
                <View style={props.styles.stylistSpeakerWaveB} />
              </Pressable>
              <Pressable
                style={props.styles.stylistReconnectBtn}
                onPress={() => void props.startStylistSession()}
              >
                <View style={props.styles.stylistReconnectRing} />
                <View style={props.styles.stylistReconnectArrow} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={props.wishlistAgentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          void props.onCloseWishlistAgent();
        }}
      >
        <View style={props.styles.sheetBackdrop}>
          <View style={props.styles.stylistCard}>
            <Pressable
              style={props.styles.stylistCloseFloating}
              onPress={() => {
                void props.onCloseWishlistAgent();
              }}
            >
              <Text style={props.styles.editorCloseText}>×</Text>
            </Pressable>

            <View style={props.styles.stylistVoiceStage}>
              <Animated.View
                style={[
                  props.styles.stylistVoiceHalo,
                  {
                    transform: [
                      {
                        scale: props.wishlistVoiceBreathAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.08],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  props.styles.stylistVoiceHaloOuter,
                  {
                    opacity: props.wishlistSpeechAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.14, 0.45],
                    }),
                    transform: [
                      {
                        scale: props.wishlistSpeechAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1.02, 1.28],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  props.styles.stylistVoiceCore,
                  props.wishlistAgentStatus !== "connected"
                    ? props.styles.stylistVoiceCoreIdle
                    : undefined,
                  {
                    transform: [
                      {
                        scale: props.wishlistSpeechAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.12],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={props.styles.stylistVoiceCoreDot} />
              </Animated.View>
              <Text style={props.styles.wishlistAgentHint}>
                {props.wishlistAgentStatus === "connected"
                  ? "Wishlist assistant is listening"
                  : props.wishlistAgentStatus === "connecting"
                    ? "Connecting wishlist assistant..."
                    : props.wishlistAgentStatus === "error"
                      ? "Connection error. Retry."
                      : "Wishlist assistant offline"}
              </Text>
            </View>

            <View style={props.styles.stylistActions}>
              <Pressable
                style={[
                  props.styles.stylistIconBtn,
                  props.wishlistAgentMicStreaming ? props.styles.stylistIconBtnActive : undefined,
                  props.wishlistAgentStatus !== "connected"
                    ? props.styles.stylistIconBtnDisabled
                    : undefined,
                ]}
                onPress={() => {
                  if (props.wishlistAgentMicStreaming) {
                    void props.stopWishlistAgentMicStreaming();
                  } else {
                    void props.startWishlistAgentMicStreaming();
                  }
                }}
                disabled={props.wishlistAgentStatus !== "connected"}
              >
                <View style={props.styles.stylistMicStem} />
                <View style={props.styles.stylistMicBase} />
              </Pressable>
              <Pressable
                style={[
                  props.styles.stylistIconBtn,
                  props.wishlistAgentSpeakerEnabled ? props.styles.stylistIconBtnActive : undefined,
                ]}
                onPress={() => props.setWishlistAgentSpeakerEnabled((value: boolean) => !value)}
              >
                <View style={props.styles.stylistSpeakerBody} />
                <View style={props.styles.stylistSpeakerWaveA} />
                <View style={props.styles.stylistSpeakerWaveB} />
              </Pressable>
              <Pressable
                style={props.styles.stylistReconnectBtn}
                onPress={() => void props.startWishlistAgentSession()}
              >
                <View style={props.styles.stylistReconnectRing} />
                <View style={props.styles.stylistReconnectArrow} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
