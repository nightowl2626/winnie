import { Animated } from "react-native";

/** Spring config for "liquid" micro-interactions (organic, bouncy feel) */
export const LIQUID_SPRING = {
  damping: 15,
  stiffness: 100,
  useNativeDriver: true,
} as const;

/** Gentler spring for subtle hover/focus effects */
export const GENTLE_SPRING = {
  damping: 20,
  stiffness: 80,
  useNativeDriver: true,
} as const;

/** Quick spring for snappy interactions */
export const SNAPPY_SPRING = {
  damping: 18,
  stiffness: 150,
  useNativeDriver: true,
} as const;

/** Pulse animation config for orbs */
export const PULSE_CONFIG = {
  duration: 2000,
  useNativeDriver: true,
} as const;

/**
 * Creates a press-in / press-out spring animation pair.
 * Returns [onPressIn, onPressOut] callbacks and the animated value.
 */
export function createPressAnimation(scale = 0.95) {
  const anim = new Animated.Value(1);

  const onPressIn = () => {
    Animated.spring(anim, {
      toValue: scale,
      ...LIQUID_SPRING,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(anim, {
      toValue: 1,
      ...LIQUID_SPRING,
    }).start();
  };

  return { anim, onPressIn, onPressOut };
}

/**
 * Creates a looping pulse animation for orbs.
 * Returns the animated value and a start/stop interface.
 */
export function createPulseAnimation(
  minScale = 1,
  maxScale = 1.08,
  duration = PULSE_CONFIG.duration,
) {
  const anim = new Animated.Value(0);

  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: duration / 2,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: duration / 2,
        useNativeDriver: true,
      }),
    ]),
  );

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [minScale, maxScale],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return { anim, scale, opacity, loop };
}

/**
 * Creates a slow drift animation for aurora background orbs.
 */
export function createDriftAnimation(duration = 12000) {
  const anim = new Animated.Value(0);

  const loop = Animated.loop(
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

  return { anim, loop };
}
