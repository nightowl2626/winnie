import type React from "react";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";

export type AnimatedPressableProps = PressableProps & {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  scaleValue?: number;
};

export type AnimatedPressableComponentType = React.ComponentType<AnimatedPressableProps>;
