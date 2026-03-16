import React from "react";
import { Pressable, StyleProp, Text, TextStyle, ViewStyle } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function GlassButton(props: Props) {
  return (
    <Pressable style={props.style} onPress={props.onPress} disabled={props.disabled}>
      <Text style={props.textStyle}>{props.label}</Text>
    </Pressable>
  );
}
