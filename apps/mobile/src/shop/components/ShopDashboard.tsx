import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView } from "expo-camera";

import type { NearbyStore, WardrobeItem } from "../../types";
import type { ShopCoords, ShopGeoPermission } from "../types";
import ClusteredShopMap from "./ClusteredShopMap";
import { formatMeters, shopSearchRadiusForZoom } from "../utils/geo";
import { normalizeSustainabilityScore, sustainabilityBand } from "../utils/sustainability";

type ShopScoutHeadline = {
  eyebrow: string;
  title: string;
  body: string;
};

type Props = {
  styles: any;
  cameraRef: React.RefObject<any>;
  shopAssistantActive: boolean;
  shopStatus: "offline" | "connecting" | "connected" | "error";
  shopStatusLabel: string;
  shopSuggestedItems: WardrobeItem[];
  shopMicStreaming: boolean;
  shopSpeakerEnabled: boolean;
  shopSelectedStore: NearbyStore | null;
  shopSelectedStoreId: string;
  shopPerimeterStores: NearbyStore[];
  shopFavoriteBusyIds: Set<string>;
  shopFavoriteStoresCount: number;
  shopFavoritesOnly: boolean;
  shopMatchMode: boolean;
  shopMatchLoading: boolean;
  shopStoresLoading: boolean;
  shopStoresError: string;
  shopBrowseMode: "nearby" | "directory";
  shopDirectoryCityDraft: string;
  shopDirectoryCity: string;
  shopDirectoryRefreshBusy: boolean;
  shopSearchQuery: string;
  shopNeedsSearchAreaRefresh: boolean;
  shopGeoPermission: ShopGeoPermission;
  shopStaticMapUrl: string;
  shopOverlayMarkers: Array<{ store: NearbyStore; left: number; top: number; visible: boolean }>;
  shopMapCenter: ShopCoords | null;
  shopLocation: ShopCoords | null;
  shopMapZoom: number;
  shopDragAnim: Animated.ValueXY;
  shopZoomScaleAnim: Animated.Value;
  shopScoutHeadline: ShopScoutHeadline;
  shopCarouselCardWidth: number;
  shopCarouselRef: React.RefObject<ScrollView | null>;
  resolveImageUri: (
    primaryBase64?: string,
    secondaryBase64?: string,
    imageUrl?: string
  ) => string | undefined;
  onCloseShopAssistant: () => void;
  onStartAssistant: () => void;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onShopMapLayout: (event: any) => void;
  onShopStaticMapLoad: () => void;
  onShopStaticMapError: (event: any) => void;
  onShopMapSelectStore: (store: NearbyStore) => void;
  onShopMapDragStart: (event: any) => void;
  onShopMapDragMove: (event: any) => void;
  onShopMapDragEnd: () => void;
  onShopMapWheel: (event: any) => void;
  onShopNativeViewportChange: (next: { center: ShopCoords; zoom: number }) => void;
  onBackToMap: () => void;
  onToggleFavorites: () => void;
  onPrimaryTopAction: () => void;
  primaryTopActionLabel: string;
  onChangeDirectoryCity: (value: string) => void;
  onLoadDirectory: () => void;
  onRefreshDirectory: () => void;
  onChangeSearchQuery: (value: string) => void;
  onClearSearchQuery: () => void;
  onSearchThisArea: () => void;
  onLaunchAssistantForStore: (store: NearbyStore) => void;
  onToggleFavoriteStore: (store: NearbyStore) => void;
  onOpenStoreInMaps: (store: NearbyStore) => void;
  onMomentumScrollEnd: (event: any) => void;
};

function buildSustainabilityWhy(store: NearbyStore): string {
  const score = normalizeSustainabilityScore(store.ai_evaluation?.sustainability_score);
  const tags = store.ai_evaluation?.best_for?.slice(0, 3).join(", ") || "";
  const vibe = store.ai_evaluation?.vibe_check?.trim() || "";
  const matchReason = store.match_reason?.trim() || "";
  const category = String(store.category || "").trim();
  const showCategorySignal = category && category.toLowerCase() !== "clothing store";
  const scoreRead =
    score >= 90
      ? "The store reads as strongly circular, likely secondhand, vintage, thrift, or consignment-led."
      : score >= 70
      ? "The store looks meaningfully aligned with circular shopping, but with a more mixed signal."
      : "The store looks more mainstream or mixed, so the circularity signal is weaker."
  return [
    matchReason ? `AI match read: ${matchReason}` : "",
    scoreRead,
    vibe ? `AI vibe check: ${vibe}` : "",
    tags ? `Best-for signals: ${tags}.` : "",
    showCategorySignal ? `Category signal: ${category}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function ShopDashboard(props: Props) {
  const [insightStore, setInsightStore] = useState<NearbyStore | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const insightBody = useMemo(
    () => (insightStore ? buildSustainabilityWhy(insightStore) : ""),
    [insightStore]
  );

  const emptyText = props.shopMatchMode
    ? "No strong shop matches in this view yet."
    : props.shopFavoritesOnly
    ? "No favorite shops in this area yet."
    : props.shopBrowseMode === "directory"
    ? "No saved directory shops match this city view yet."
    : "No nearby shops in this view. Drag, zoom, or refresh.";

  return props.shopAssistantActive ? (
    <View style={props.styles.shopScreen}>
      <CameraView ref={props.cameraRef} style={props.styles.shopCamera} facing="back" />
      <View style={props.styles.shopTopBar}>
        <Pressable style={props.styles.shopBackBtn} onPress={props.onCloseShopAssistant}>
          <Text style={props.styles.shopBackBtnText}>Back</Text>
        </Pressable>
        <View style={props.styles.shopStatusPill}>
          <Text style={props.styles.shopStatusText}>{props.shopStatusLabel}</Text>
        </View>
        <View style={props.styles.shopStatusPill}>
          <Text style={props.styles.shopStatusText}>
            {props.shopSuggestedItems.length ? `${props.shopSuggestedItems.length} matches` : "No matches yet"}
          </Text>
        </View>
        <View
          style={[
            props.styles.statusDot,
            props.shopStatus === "connected" ? props.styles.statusDotLive : undefined,
            props.shopStatus === "error" ? props.styles.statusDotError : undefined,
          ]}
        />
      </View>

      <View style={props.styles.shopBottomOverlay}>
        <Text style={props.styles.shopHintText}>
          Point to an in-store item and ask: "What matches this?" or "Show me a try-on."
        </Text>

        {props.shopSuggestedItems.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={props.styles.shopSuggestionRow}
          >
            {props.shopSuggestedItems.map((item) => (
              <View key={`shop-match-${item.id}`} style={props.styles.shopSuggestionCard}>
                {props.resolveImageUri(item.item_snippet_base64, item.image_base64, item.image_url) ? (
                  <Image
                    source={{
                      uri: props.resolveImageUri(
                        item.item_snippet_base64,
                        item.image_base64,
                        item.image_url
                      ),
                    }}
                    style={props.styles.shopSuggestionImage}
                  />
                ) : (
                  <View style={props.styles.shopSuggestionImageFallback}>
                    <Text style={props.styles.gridFallbackText}>No Photo</Text>
                  </View>
                )}
                <Text style={props.styles.shopSuggestionTitle} numberOfLines={1}>
                  {item.title ?? item.category}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={props.styles.shopActionsRow}>
          <Pressable style={props.styles.shopActionPrimary} onPress={props.onStartAssistant}>
            <Text style={props.styles.shopActionPrimaryText}>
              {props.shopStatus === "connected" ? "Reconnect" : "Start Assistant"}
            </Text>
          </Pressable>
          <Pressable style={props.styles.shopActionSecondary} onPress={props.onCloseShopAssistant}>
            <Text style={props.styles.shopActionSecondaryText}>Close</Text>
          </Pressable>
          <Pressable
            style={[
              props.styles.shopActionIcon,
              props.shopMicStreaming ? props.styles.shopActionIconActive : undefined,
              props.shopStatus !== "connected" ? props.styles.shopActionIconDisabled : undefined,
            ]}
            onPress={props.onToggleMic}
            disabled={props.shopStatus !== "connected"}
          >
            <Text style={props.styles.shopActionIconText}>Mic</Text>
          </Pressable>
          <Pressable
            style={[
              props.styles.shopActionIcon,
              props.shopSpeakerEnabled ? props.styles.shopActionIconActive : undefined,
            ]}
            onPress={props.onToggleSpeaker}
          >
            <Text style={props.styles.shopActionIconText}>Spk</Text>
          </Pressable>
        </View>
      </View>
    </View>
  ) : (
    <>
      <View style={props.styles.shopDashboardScreen}>
        <View style={props.styles.shopMapFoundation} onLayout={props.onShopMapLayout}>
          {Platform.OS === "web" ? (
            <>
              <Animated.View
                style={[
                  props.styles.shopMapContentLayer,
                  {
                    transform: [
                      ...props.shopDragAnim.getTranslateTransform(),
                      { scale: props.shopZoomScaleAnim },
                    ],
                  },
                ]}
              >
                {props.shopStaticMapUrl ? (
                  <Image
                    source={{ uri: props.shopStaticMapUrl }}
                    style={props.styles.shopMapFoundationImage}
                    onLoad={props.onShopStaticMapLoad}
                    onError={props.onShopStaticMapError}
                  />
                ) : (
                  <View style={props.styles.shopMapFoundationEmpty}>
                    <Text style={props.styles.shopMapFallbackText}>
                      {props.shopGeoPermission === "denied"
                        ? "Location permission denied. Enable location to view nearby stores."
                        : "Map preview unavailable. Check location permission and Google Maps API key."}
                    </Text>
                  </View>
                )}

                <View style={props.styles.shopMapTint} />
              </Animated.View>

              <View
                style={props.styles.shopMapGestureLayer}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={props.onShopMapDragStart}
                onResponderMove={props.onShopMapDragMove}
                onResponderRelease={props.onShopMapDragEnd}
                onResponderTerminate={props.onShopMapDragEnd}
                {...(Platform.OS === "web" ? ({ onWheel: props.onShopMapWheel } as any) : {})}
              />
              <View pointerEvents="box-none" style={props.styles.shopMarkerHitLayer}>
                {props.shopOverlayMarkers.map(({ store, left, top }) => (
                  <Pressable
                    key={`shop-marker-hit-${store.id}`}
                    style={[
                      props.styles.shopMarkerHitArea,
                      {
                        left: left - 18,
                        top: top - 38,
                      },
                    ]}
                    onPress={() => props.onShopMapSelectStore(store)}
                  />
                ))}
              </View>
            </>
          ) : (
            <>
              <ClusteredShopMap
                center={props.shopMapCenter}
                fallbackCenter={props.shopLocation}
                zoom={props.shopMapZoom}
                stores={props.shopPerimeterStores}
                onSelectStore={props.onShopMapSelectStore}
                onViewportChange={props.onShopNativeViewportChange}
              />
              <View pointerEvents="none" style={props.styles.shopMapTint} />
            </>
          )}

          <View style={props.styles.shopDashboardTopOverlay}>
            <View style={props.styles.shopDashboardTopPanel}>
              <View style={props.styles.shopDashboardTopRow}>
                <View style={props.styles.shopMapLabelWrap}>
                  <Text style={props.styles.shopMapLabelTitle}>
                    Map <Text style={props.styles.shopMapLabelBeta}>beta</Text>
                  </Text>
                </View>
              </View>

              {props.shopMatchMode ? (
                <View style={props.styles.shopBackRow}>
                  <Pressable style={props.styles.shopTopPill} onPress={props.onBackToMap}>
                    <Text style={props.styles.shopTopPillText}>Back to map</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={props.styles.shopTopActions}>
                <Pressable
                  style={[
                    props.styles.shopTopPill,
                    props.shopFavoritesOnly ? props.styles.shopTopPillActive : undefined,
                  ]}
                  onPress={props.onToggleFavorites}
                >
                  <Text
                    style={[
                      props.styles.shopTopPillText,
                      props.shopFavoritesOnly ? props.styles.shopTopPillTextActive : undefined,
                    ]}
                  >
                    {`Favorites ${props.shopFavoriteStoresCount}`}
                  </Text>
                </Pressable>
                <Pressable style={props.styles.shopTopPill} onPress={props.onPrimaryTopAction}>
                  <Text style={props.styles.shopTopPillText}>{props.primaryTopActionLabel}</Text>
                </Pressable>
              </View>

              <View style={props.styles.shopSearchStack}>
                <View style={props.styles.shopSearchRow}>
                  <TextInput
                    value={props.shopSearchQuery}
                    onChangeText={props.onChangeSearchQuery}
                    style={props.styles.shopSearchInput}
                    placeholder="Search stores, vibe, category..."
                    placeholderTextColor="rgba(95,74,57,0.7)"
                    returnKeyType="search"
                  />
                  {props.shopSearchQuery.trim() ? (
                    <Pressable style={props.styles.shopSearchClearBtn} onPress={props.onClearSearchQuery}>
                      <Text style={props.styles.shopSearchClearText}>Clear</Text>
                    </Pressable>
                  ) : null}
                  {!props.shopMatchMode ? (
                    <Pressable
                      style={props.styles.shopSearchToggleBtn}
                      onPress={() => setFiltersExpanded((current) => !current)}
                    >
                      <Text style={props.styles.shopSearchToggleText}>
                        {filtersExpanded ? "Hide" : "Filters"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {!filtersExpanded && !props.shopMatchMode && props.shopBrowseMode === "directory" && props.shopDirectoryCity ? (
                  <View style={props.styles.shopSearchMetaPill}>
                    <Text style={props.styles.shopSearchMetaText}>
                      {`City directory: ${props.shopDirectoryCity}`}
                    </Text>
                  </View>
                ) : null}

                {filtersExpanded && !props.shopMatchMode ? (
                  <View style={props.styles.shopSearchStack}>
                    <View style={props.styles.shopSearchRow}>
                      <TextInput
                        value={props.shopDirectoryCityDraft}
                        onChangeText={props.onChangeDirectoryCity}
                        style={props.styles.shopSearchInput}
                        placeholder="Load city directory..."
                        placeholderTextColor="rgba(95,74,57,0.7)"
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="search"
                        onSubmitEditing={() => props.onLoadDirectory()}
                      />
                      <Pressable style={props.styles.shopSearchClearBtn} onPress={props.onLoadDirectory}>
                        <Text style={props.styles.shopSearchClearText}>
                          {props.shopBrowseMode === "directory" ? "Reload" : "Load City"}
                        </Text>
                      </Pressable>
                      {props.shopBrowseMode === "directory" && props.shopDirectoryCity ? (
                        <Pressable
                          style={props.styles.shopSearchClearBtn}
                          onPress={props.onRefreshDirectory}
                          disabled={props.shopDirectoryRefreshBusy}
                        >
                          <Text style={props.styles.shopSearchClearText}>
                            {props.shopDirectoryRefreshBusy ? "Sweeping..." : "Refresh City"}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>

              <Pressable style={props.styles.shopMapRefreshBtn} onPress={props.onSearchThisArea}>
                <Text style={props.styles.shopMapRefreshText}>Search This Area</Text>
              </Pressable>
            </View>
          </View>

          <View style={props.styles.shopBottomHud}>
            {props.shopStoresLoading || props.shopMatchLoading ? (
              <View style={props.styles.shopInlineStatus}>
                <ActivityIndicator color="#D87C3D" size="small" />
                <Text style={props.styles.shopInlineStatusText}>
                  {props.shopMatchLoading
                    ? "Scouting best nearby matches..."
                    : props.shopBrowseMode === "directory"
                    ? "Loading saved city directory..."
                    : "Finding nearby shops..."}
                </Text>
              </View>
            ) : null}
            {props.shopStoresError ? (
              <Text style={props.styles.shopInlineErrorText}>{props.shopStoresError}</Text>
            ) : null}
            {!props.shopStoresLoading &&
            !props.shopMatchLoading &&
            !props.shopPerimeterStores.length &&
            !props.shopStoresError ? (
              <Text style={props.styles.shopInlineStatusText}>{emptyText}</Text>
            ) : null}

            {props.shopPerimeterStores.length ? (
              <ScrollView
                ref={props.shopCarouselRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={props.shopCarouselCardWidth + 14}
                decelerationRate="fast"
                contentContainerStyle={props.styles.shopCarouselContent}
                onMomentumScrollEnd={props.onMomentumScrollEnd}
              >
                {props.shopPerimeterStores.map((store) => {
                  const score = normalizeSustainabilityScore(store.ai_evaluation?.sustainability_score);
                  const band = sustainabilityBand(store.ai_evaluation?.sustainability_score, store);
                  const selected = store.id === props.shopSelectedStoreId;
                  const favoriteBusy = props.shopFavoriteBusyIds.has(store.id);
                  const primaryInsight =
                    store.match_reason || store.ai_evaluation?.vibe_check || "No AI insight yet.";
                  const secondaryInsight =
                    store.match_reason && store.ai_evaluation?.vibe_check
                      ? store.ai_evaluation.vibe_check
                      : "";
                  return (
                    <Pressable
                      key={`shop-carousel-${store.id}`}
                      style={[
                        props.styles.shopScoutCard,
                        { width: props.shopCarouselCardWidth },
                        selected ? props.styles.shopScoutCardActive : undefined,
                      ]}
                      onPress={() => props.onShopMapSelectStore(store)}
                    >
                      <View style={props.styles.shopScoutHeader}>
                        <View style={props.styles.shopScoutHeaderText}>
                          <Text style={props.styles.shopScoutStoreName} numberOfLines={1}>
                            {store.name}
                          </Text>
                          <Text style={props.styles.shopScoutStoreMeta} numberOfLines={1}>
                            {[store.category || "Secondhand", formatMeters(store.distance_meters)]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                        </View>
                        <Pressable
                          style={[
                            props.styles.shopFavoriteBtn,
                            store.is_favorite ? props.styles.shopFavoriteBtnActive : undefined,
                          ]}
                          onPress={() => props.onToggleFavoriteStore(store)}
                          disabled={favoriteBusy}
                        >
                          <Text style={props.styles.shopFavoriteBtnText}>
                            {favoriteBusy ? "…" : store.is_favorite ? "♥" : "♡"}
                          </Text>
                        </Pressable>
                      </View>

                      {store.match_reason ? (
                        <Text style={props.styles.shopScoutInsightEyebrow}>AI MATCH</Text>
                      ) : null}
                      <Text style={props.styles.shopScoutInsightTitle} numberOfLines={3}>
                        {primaryInsight}
                      </Text>
                      {secondaryInsight ? (
                        <Text style={props.styles.shopScoutVibe} numberOfLines={2}>
                          {secondaryInsight}
                        </Text>
                      ) : null}

                      <View style={props.styles.shopScoutFooter}>
                        <View style={props.styles.shopScoutFooterLeft}>
                          <View
                            style={[
                              props.styles.shopScoutScoreBadge,
                              band === "high"
                                ? props.styles.shopStoreScoreHigh
                                : band === "mid"
                                ? props.styles.shopStoreScoreMid
                                : props.styles.shopStoreScoreLow,
                            ]}
                          >
                            <Text
                              style={[
                                props.styles.shopScoutScoreText,
                                band === "high"
                                  ? props.styles.shopScoutScoreTextLight
                                  : props.styles.shopScoutScoreTextDark,
                              ]}
                            >
                              {`Circularity ${score}/100`}
                            </Text>
                          </View>
                          <Pressable
                            style={props.styles.shopScoutWhyBtn}
                            onPress={() => setInsightStore(store)}
                          >
                            <Text style={props.styles.shopScoutWhyBtnText}>i</Text>
                          </Pressable>
                        </View>
                      </View>

                      {store.ai_evaluation?.best_for?.length ? (
                        <View style={props.styles.shopStoreTagsRow}>
                          {store.ai_evaluation.best_for.slice(0, 3).map((tag) => (
                            <View key={`carousel-tag-${store.id}-${tag}`} style={props.styles.shopStoreTagPill}>
                              <Text style={props.styles.shopStoreTagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      <View style={props.styles.shopScoutActionsRow}>
                        <Pressable
                          style={props.styles.shopScoutLiveBtn}
                          onPress={() => props.onLaunchAssistantForStore(store)}
                        >
                          <Text style={props.styles.shopScoutLiveBtnText}>Start Live Assistant</Text>
                        </Pressable>
                        <Pressable
                          style={props.styles.shopStoreOpenBtn}
                          onPress={() => props.onOpenStoreInMaps(store)}
                        >
                          <Text style={props.styles.shopStoreOpenText}>Open</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </View>

      <Modal
        visible={Boolean(insightStore)}
        animationType="fade"
        transparent
        onRequestClose={() => setInsightStore(null)}
      >
        <View style={props.styles.editorBackdrop}>
          <View style={props.styles.shopInsightModalCard}>
            <View style={props.styles.shopInsightModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={props.styles.shopInsightModalTitle}>
                  {insightStore?.name || "Store insight"}
                </Text>
                <Text style={props.styles.shopInsightModalMeta}>
                  {[insightStore?.category || "Secondhand", insightStore ? formatMeters(insightStore.distance_meters) : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <Pressable style={props.styles.editorCloseBtn} onPress={() => setInsightStore(null)}>
                <Text style={props.styles.editorCloseText}>×</Text>
              </Pressable>
            </View>
            {insightStore ? (
              <>
                <Text style={props.styles.shopInsightModalScore}>
                  {`Circularity ${normalizeSustainabilityScore(insightStore.ai_evaluation?.sustainability_score)}/100`}
                </Text>
                <Text style={props.styles.shopInsightModalBody}>{insightBody}</Text>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}
