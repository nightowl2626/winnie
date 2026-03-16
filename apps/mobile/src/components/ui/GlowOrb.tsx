import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View, ViewStyle } from "react-native";

type GlowOrbProps = {
  size?: number;
  colors?: string[];
  pulseSpeed?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
};

let orbStyleInjected = false;

function injectOrbAnimation(): void {
  if (Platform.OS !== "web" || orbStyleInjected) return;
  const doc = globalThis.document;
  if (!doc) return;

  const style = doc.createElement("style");
  style.id = "winnie-orb-css";
  style.textContent = `
    @keyframes winnie-orb-pulse {
      0%, 100% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.08); opacity: 1; }
    }
  `;
  doc.head.appendChild(style);
  orbStyleInjected = true;
}

const DEFAULT_COLORS = ["#FF7652", "#C89A63", "#8D7968", "#F1DED0"];

export default function GlowOrb({
  size = 64,
  colors: orbColors = DEFAULT_COLORS,
  pulseSpeed = 2000,
  style,
  children,
}: GlowOrbProps) {
  // -- Web: CSS box-shadow + animation ---
  if (Platform.OS === "web") {
    useEffect(() => {
      injectOrbAnimation();
    }, []);

    const shadowParts = orbColors.map((c, i) => {
      const spread = 18 + i * 16;
      return `0 0 ${spread}px ${c}88`;
    });

    const webStyle: any = {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundImage: `radial-gradient(circle, ${orbColors[0]}88 0%, ${orbColors[1] || orbColors[0]}44 42%, transparent 76%)`,
      filter: "blur(2px)",
      boxShadow: shadowParts.join(", "),
      animation: `winnie-orb-pulse ${pulseSpeed}ms ease-in-out infinite`,
      alignItems: "center",
      justifyContent: "center",
      ...style,
    };

    return <View style={webStyle}>{children}</View>;
  }

  // -- Native: animated scale + opacity ---
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: pulseSpeed / 2,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: pulseSpeed / 2,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, pulseSpeed]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      {/* Glow rings */}
      {orbColors.map((color, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            width: size + i * 22,
            height: size + i * 22,
            borderRadius: (size + i * 22) / 2,
            backgroundColor: color,
            opacity: Animated.multiply(opacity, new Animated.Value(0.12 - i * 0.02)),
            transform: [{ scale }],
          }}
        />
      ))}
      {/* Core */}
      <Animated.View
        style={[
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: (size * 0.7) / 2,
            backgroundColor: orbColors[0],
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
      {children}
    </View>
  );
}
