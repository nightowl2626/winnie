import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View, ViewStyle } from "react-native";
import { auroraConfigs, type AuroraMode } from "../../design/aurora";
import { colors } from "../../design/tokens";

type AuroraBackgroundProps = {
  mode?: AuroraMode;
  style?: ViewStyle;
  children?: React.ReactNode;
};

let styleInjected = false;
const ANIMATION_NAME = "winnie-aurora-drift";

function injectWebAnimation(): void {
  if (Platform.OS !== "web" || styleInjected) return;
  const doc = globalThis.document;
  if (!doc) return;

  const style = doc.createElement("style");
  style.id = "winnie-aurora-css";
  style.textContent = `
    @keyframes ${ANIMATION_NAME} {
      0% { background-position: 0% 0%; }
      25% { background-position: 5% 3%; }
      50% { background-position: 2% 6%; }
      75% { background-position: -3% 2%; }
      100% { background-position: 0% 0%; }
    }
  `;
  doc.head.appendChild(style);
  styleInjected = true;
}

export default function AuroraBackground({
  mode = "default",
  style,
  children,
}: AuroraBackgroundProps) {
  const config = auroraConfigs[mode];

  // -- Web: CSS background with animation ---
  if (Platform.OS === "web") {
    useEffect(() => {
      injectWebAnimation();
    }, []);

    const webStyle: any = {
      flex: 1,
      backgroundImage: config.cssBackground,
      backgroundSize: "180% 180%",
      animation: `${ANIMATION_NAME} ${config.animationDuration} ease-in-out infinite`,
      ...style,
    };

    return <View style={webStyle}>{children}</View>;
  }

  // -- Native: animated translating orbs ---
  const driftAnims = useRef(config.orbs.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = driftAnims.map((anim, i) => {
      const duration = 10000 + i * 3000;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ]),
      );
    });
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [driftAnims]);

  return (
    <View style={[nativeStyles.container, style]}>
      {config.orbs.map((orb, i) => {
        const translateX = driftAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-18, 22],
        });
        const translateY = driftAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-12, 18],
        });
        const scale = driftAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1.08],
        });
        const opacity = driftAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0.72, 1],
        });
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              nativeStyles.orb,
              {
                left: orb.x as any,
                top: orb.y as any,
                width: orb.size as any,
                height: orb.size as any,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          >
            <View style={[nativeStyles.orbHalo, { backgroundColor: orb.color }]} />
            <View style={[nativeStyles.orbCore, { backgroundColor: orb.color }]} />
          </Animated.View>
        );
      })}
      {children}
    </View>
  );
}

const nativeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  orbHalo: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 9999,
    opacity: 0.48,
  },
  orbCore: {
    width: "42%",
    height: "42%",
    borderRadius: 9999,
    opacity: 0.18,
  },
});
