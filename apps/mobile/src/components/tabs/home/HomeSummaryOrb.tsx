import React from "react";
import { Animated, Platform, Text, View } from "react-native";

import type { AppStyles } from "../../../styles/appStyles";

type ColorPulseEntry = {
  color: string;
  percent: number;
};

type Props = {
  styles: AppStyles;
  colorPulseSize: number;
  homeSummaryOrbGlowOpacity: Animated.AnimatedInterpolation<number> | Animated.Value;
  homeSummaryOrbGlowScale: Animated.AnimatedInterpolation<number> | Animated.Value;
  homeSummaryOrbScale: Animated.AnimatedInterpolation<number> | Animated.Value;
  homeColorPulseGradient: string;
  homeColorPulsePrimary: string;
  homeColorPulseEntries: ColorPulseEntry[];
  homeSummaryText: string;
  resolveColorSwatch: (color: string) => { backgroundColor: string };
};

export default function HomeSummaryOrb(props: Props) {
  return (
    <View
      style={[
        props.styles.summaryCard,
        props.styles.homeInsightCard,
        props.styles.homeSummaryOrbCard,
      ]}
    >
      <View style={props.styles.homeSummaryOrbBody}>
        <Animated.View
          pointerEvents="none"
          style={[
            props.styles.homeSummaryOrbGlow,
            {
              width: props.colorPulseSize + 56,
              height: props.colorPulseSize + 56,
              opacity: props.homeSummaryOrbGlowOpacity,
              transform: [{ scale: props.homeSummaryOrbGlowScale }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            props.styles.homeSummaryOrbFeather,
            {
              width: props.colorPulseSize + 26,
              height: props.colorPulseSize + 26,
              opacity: props.homeSummaryOrbGlowOpacity,
              transform: [{ scale: props.homeSummaryOrbGlowScale }],
            },
            Platform.OS === "web"
              ? ({
                  backgroundImage: props.homeColorPulseGradient,
                  maskImage:
                    "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.28) 42%, rgba(0,0,0,0.12) 62%, rgba(0,0,0,0.04) 78%, transparent 100%)",
                  WebkitMaskImage:
                    "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.28) 42%, rgba(0,0,0,0.12) 62%, rgba(0,0,0,0.04) 78%, transparent 100%)",
                } as any)
              : {
                  backgroundColor: props.homeColorPulsePrimary,
                },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            props.styles.homeSummaryOrbContourSoftener,
            {
              width: props.colorPulseSize + 18,
              height: props.colorPulseSize + 18,
              opacity: props.homeSummaryOrbGlowOpacity,
              transform: [{ scale: props.homeSummaryOrbGlowScale }],
            },
            Platform.OS === "web"
              ? ({
                  backgroundImage: props.homeColorPulseGradient,
                  maskImage:
                    "radial-gradient(circle at 50% 50%, transparent 54%, rgba(0,0,0,0.18) 66%, rgba(0,0,0,0.3) 76%, rgba(0,0,0,0.16) 88%, transparent 100%)",
                  WebkitMaskImage:
                    "radial-gradient(circle at 50% 50%, transparent 54%, rgba(0,0,0,0.18) 66%, rgba(0,0,0,0.3) 76%, rgba(0,0,0,0.16) 88%, transparent 100%)",
                } as any)
              : {
                  backgroundColor: props.homeColorPulsePrimary,
                },
          ]}
        />
        <Animated.View
          style={[
            props.styles.homeSummaryOrb,
            {
              width: props.colorPulseSize,
              height: props.colorPulseSize,
              transform: [{ scale: props.homeSummaryOrbScale }],
            },
            Platform.OS === "web"
              ? ({
                  backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,250,244,0.58) 0%, rgba(255,250,244,0.2) 24%, rgba(255,250,244,0) 40%), radial-gradient(circle at 50% 50%, rgba(255,226,192,0.44) 0%, rgba(255,226,192,0.24) 30%, rgba(255,226,192,0) 56%), ${props.homeColorPulseGradient}`,
                  backgroundBlendMode: "screen, soft-light, normal",
                  maskImage:
                    "radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.98) 44%, rgba(0,0,0,0.84) 58%, rgba(0,0,0,0.42) 74%, rgba(0,0,0,0.1) 90%, transparent 100%)",
                  WebkitMaskImage:
                    "radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.98) 44%, rgba(0,0,0,0.84) 58%, rgba(0,0,0,0.42) 74%, rgba(0,0,0,0.1) 90%, transparent 100%)",
                } as any)
              : {
                  backgroundColor: props.homeColorPulsePrimary,
                },
          ]}
        >
          {Platform.OS !== "web" ? (
            <View style={props.styles.homeSummaryOrbNativeBlend}>
              {props.homeColorPulseEntries.slice(0, 5).map((entry, index) => {
                const swatch = props.resolveColorSwatch(entry.color);
                const size = Math.round(
                  props.colorPulseSize * Math.max(0.2, Math.min(0.54, entry.percent / 100 + 0.16))
                );
                const placements = [
                  { top: Math.round(props.colorPulseSize * 0.08), left: Math.round(props.colorPulseSize * 0.12) },
                  { top: Math.round(props.colorPulseSize * 0.14), right: Math.round(props.colorPulseSize * 0.1) },
                  { bottom: Math.round(props.colorPulseSize * 0.16), left: Math.round(props.colorPulseSize * 0.12) },
                  { bottom: Math.round(props.colorPulseSize * 0.12), right: Math.round(props.colorPulseSize * 0.12) },
                  { top: Math.round(props.colorPulseSize * 0.34), left: Math.round(props.colorPulseSize * 0.34) },
                ] as const;
                return (
                  <View
                    key={`home-orb-${entry.color}`}
                    style={[
                      props.styles.homeSummaryOrbNativeBlob,
                      {
                        width: size,
                        height: size,
                        backgroundColor: swatch.backgroundColor,
                        opacity: Math.max(0.46, Math.min(0.88, entry.percent / 100 + 0.38)),
                      },
                      placements[index] || placements[placements.length - 1],
                    ]}
                  />
                );
              })}
            </View>
          ) : null}
          <View style={props.styles.homeSummaryOrbShade} />
        </Animated.View>
        <View pointerEvents="none" style={props.styles.homeSummaryOrbTextShell}>
          <Text style={props.styles.homeSummaryOrbEyebrow}>Welcome to Winnie</Text>
          <Text style={props.styles.homeSummaryOrbText} numberOfLines={6}>
            {props.homeSummaryText}
          </Text>
        </View>
      </View>
      {!props.homeColorPulseEntries.length ? (
        <Text style={props.styles.optimizerMeta}>
          Scan more items to surface your closet palette.
        </Text>
      ) : null}
    </View>
  );
}
