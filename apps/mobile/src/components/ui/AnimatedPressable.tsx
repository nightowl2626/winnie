import React, { useCallback, useRef } from "react";
import { Animated, Pressable } from "react-native";

import type { AnimatedPressableProps } from "../componentTypes";

export default function AnimatedPressable({
  onPress,
  style,
  children,
  scaleValue = 0.97,
  ...rest
}: AnimatedPressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      damping: 15,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, scaleValue]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 15,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} {...rest}>
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
