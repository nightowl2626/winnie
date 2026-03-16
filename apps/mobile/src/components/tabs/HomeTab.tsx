import React from "react";
import { Animated, ScrollView, Text, View } from "react-native";

import type { AppStyles } from "../../styles/appStyles";
import type { WearLogEntry, WardrobeItem, WardrobeOptimizeResult } from "../../types";
import type { AnimatedPressableComponentType } from "../componentTypes";
import HomeOptimizerSection from "./home/HomeOptimizerSection";
import HomeSummaryOrb from "./home/HomeSummaryOrb";
import HomeWeekStreak from "./home/HomeWeekStreak";

type ColorPulseEntry = {
  color: string;
  percent: number;
};

type Props = {
  styles: AppStyles;
  AnimatedPressableComponent: AnimatedPressableComponentType;
  colorPulseSize: number;
  homeSummaryOrbGlowOpacity: Animated.AnimatedInterpolation<number> | Animated.Value;
  homeSummaryOrbGlowScale: Animated.AnimatedInterpolation<number> | Animated.Value;
  homeSummaryOrbScale: Animated.AnimatedInterpolation<number> | Animated.Value;
  homeColorPulseGradient: string;
  homeColorPulsePrimary: string;
  homeColorPulseEntries: ColorPulseEntry[];
  homeSummaryText: string;
  homeDashboardStats: { outfit_streak_days: number };
  homeWeekCells: Date[];
  wearLogByDate: Map<string, WearLogEntry>;
  resolveColorSwatch: (color: string) => { backgroundColor: string };
  resolveImageUri: (
    primaryBase64?: string,
    secondaryBase64?: string,
    imageUrl?: string
  ) => string | undefined;
  onOpenCalendarLogModal: (dateKey: string) => void;
  optimizerBusy: boolean;
  onRunWardrobeOptimizer: () => void | Promise<void>;
  optimizerResult: WardrobeOptimizeResult | null;
  homeStaleItems: WardrobeItem[];
  listingBusyIds: Set<string>;
  onGenerateMarketplaceListing: (item: WardrobeItem) => void | Promise<void>;
};

export default function HomeTab(props: Props) {
  return (
    <ScrollView
      style={props.styles.homeScrollBleed}
      contentContainerStyle={props.styles.homeScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={props.styles.homeInsightRow}>
        <HomeSummaryOrb
          styles={props.styles}
          colorPulseSize={props.colorPulseSize}
          homeSummaryOrbGlowOpacity={props.homeSummaryOrbGlowOpacity}
          homeSummaryOrbGlowScale={props.homeSummaryOrbGlowScale}
          homeSummaryOrbScale={props.homeSummaryOrbScale}
          homeColorPulseGradient={props.homeColorPulseGradient}
          homeColorPulsePrimary={props.homeColorPulsePrimary}
          homeColorPulseEntries={props.homeColorPulseEntries}
          homeSummaryText={props.homeSummaryText}
          resolveColorSwatch={props.resolveColorSwatch}
        />
      </View>

      <HomeWeekStreak
        styles={props.styles}
        streakDays={props.homeDashboardStats.outfit_streak_days}
        homeWeekCells={props.homeWeekCells}
        wearLogByDate={props.wearLogByDate}
        resolveImageUri={props.resolveImageUri}
        onOpenCalendarLogModal={props.onOpenCalendarLogModal}
      />

      <HomeOptimizerSection
        styles={props.styles}
        AnimatedPressableComponent={props.AnimatedPressableComponent}
        optimizerBusy={props.optimizerBusy}
        onRunWardrobeOptimizer={props.onRunWardrobeOptimizer}
        optimizerResult={props.optimizerResult}
        homeStaleItems={props.homeStaleItems}
        listingBusyIds={props.listingBusyIds}
        onGenerateMarketplaceListing={props.onGenerateMarketplaceListing}
        resolveImageUri={props.resolveImageUri}
      />
    </ScrollView>
  );
}
