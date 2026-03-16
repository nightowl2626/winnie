import React from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";

import type { AppStyles } from "../../../styles/appStyles";
import type { AnimatedPressableComponentType } from "../../componentTypes";
import type { WardrobeItem, WardrobeOptimizeResult } from "../../../types";
import GlassCard from "../../ui/GlassCard";

type Props = {
  styles: AppStyles;
  AnimatedPressableComponent: AnimatedPressableComponentType;
  optimizerBusy: boolean;
  onRunWardrobeOptimizer: () => void | Promise<void>;
  optimizerResult: WardrobeOptimizeResult | null;
  homeStaleItems: WardrobeItem[];
  listingBusyIds: Set<string>;
  onGenerateMarketplaceListing: (item: WardrobeItem) => void | Promise<void>;
  resolveImageUri: (
    primaryBase64?: string,
    secondaryBase64?: string,
    imageUrl?: string
  ) => string | undefined;
};

export default function HomeOptimizerSection(props: Props) {
  const AnimatedPressableComponent = props.AnimatedPressableComponent;

  return (
    <GlassCard
      style={[
        props.styles.optimizerCard,
        props.styles.homeOptimizerCardTight,
        props.styles.homeOptimizerGlassCard,
      ]}
      glowWrapStyle={props.styles.homeOptimizerGlassBackdrop}
      glowPrimaryStyle={props.styles.homeOptimizerGlassGlowPrimary}
      glowSecondaryStyle={props.styles.homeOptimizerGlassGlowSecondary}
      sheenStyle={props.styles.homeOptimizerGlassSheen}
    >
      <View style={props.styles.homeOptimizerHeader}>
        <View style={props.styles.homeOptimizerHeaderText}>
          <Text style={props.styles.optimizerTitle}>Optimizer</Text>
          <Text style={props.styles.optimizerBody}>
            Underused items are surfaced here so you can decide what to sell next.
          </Text>
        </View>
        <AnimatedPressableComponent
          style={[props.styles.optimizerActionBtn, props.optimizerBusy ? props.styles.dimmed : undefined]}
          onPress={() => void props.onRunWardrobeOptimizer()}
        >
          <Text style={props.styles.optimizerActionText}>
            {props.optimizerBusy ? "Optimizing..." : "Run Optimizer"}
          </Text>
        </AnimatedPressableComponent>
      </View>

      {props.optimizerResult ? (
        <View style={props.styles.optimizerResultBox}>
          <View style={props.styles.optimizerResultMetric}>
            <Text style={props.styles.optimizerResultValue}>
              {props.optimizerResult.flagged_count}
            </Text>
            <Text style={props.styles.optimizerResultLabel}>
              flagged item{props.optimizerResult.flagged_count === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={props.styles.optimizerResultDivider} />
          <View style={props.styles.optimizerResultMetric}>
            <Text style={props.styles.optimizerResultValue}>
              {props.optimizerResult.gaps.length}
            </Text>
            <Text style={props.styles.optimizerResultLabel}>
              gap{props.optimizerResult.gaps.length === 1 ? "" : "s"} found
            </Text>
          </View>
        </View>
      ) : null}

      {props.homeStaleItems.length ? (
        <View style={props.styles.homeOptimizerGrid}>
          {props.homeStaleItems.map((item) => {
            const thumb = props.resolveImageUri(
              item.item_snippet_base64,
              item.image_base64,
              item.image_url
            );
            const hasListing = Boolean(item.marketplace_listing);
            const busy = props.listingBusyIds.has(item.id);
            return (
              <View key={`stale-${item.id}`} style={props.styles.homeOptimizerItemCard}>
                {thumb ? (
                  <Image source={{ uri: thumb }} style={props.styles.homeOptimizerItemImage} />
                ) : (
                  <View style={props.styles.homeOptimizerItemFallback}>
                    <Text style={props.styles.gridFallbackText}>No Photo</Text>
                  </View>
                )}
                <AnimatedPressableComponent
                  style={[
                    props.styles.homeOptimizerItemAction,
                    busy ? props.styles.dimmed : undefined,
                  ]}
                  onPress={() => void props.onGenerateMarketplaceListing(item)}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={props.styles.homeOptimizerItemActionText}>
                      {hasListing ? "View Listing" : "Sell Item"}
                    </Text>
                  )}
                </AnimatedPressableComponent>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={props.styles.optimizerMeta}>
          Run the optimizer to surface underused pieces and wardrobe gaps.
        </Text>
      )}
    </GlassCard>
  );
}
