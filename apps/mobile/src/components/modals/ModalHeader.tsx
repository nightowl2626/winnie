import React from "react";
import { Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";

import type { AppStyles } from "../../styles/appStyles";

type Props = {
  styles: AppStyles;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  disabled?: boolean;
  alignStart?: boolean;
  closeButtonStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  leading?: React.ReactNode;
};

export default function ModalHeader(props: Props) {
  return (
    <View style={props.styles.editorHeaderRow}>
      {props.leading ? (
        props.leading
      ) : props.alignStart ? (
        <View style={props.styles.editItemHeaderText}>
          {props.title ? <Text style={props.titleStyle || props.styles.editItemHeaderTitle}>{props.title}</Text> : null}
          {props.subtitle ? <Text style={props.subtitleStyle || props.styles.calendarLogHeaderDate}>{props.subtitle}</Text> : null}
        </View>
      ) : (
        <Text style={props.titleStyle || props.styles.editorTitle}>{props.title}</Text>
      )}
      <Pressable
        style={props.closeButtonStyle || props.styles.editorCloseBtn}
        onPress={props.onClose}
        disabled={props.disabled}
      >
        <Text style={props.styles.editorCloseText}>×</Text>
      </Pressable>
    </View>
  );
}
