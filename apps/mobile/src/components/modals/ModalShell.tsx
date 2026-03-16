import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

import type { AppStyles } from "../../styles/appStyles";

type Props = {
  styles: AppStyles;
  cardStyle: StyleProp<ViewStyle>;
  glowWrapStyle?: StyleProp<ViewStyle>;
  glowPrimaryStyle?: StyleProp<ViewStyle>;
  glowSecondaryStyle?: StyleProp<ViewStyle>;
  sheenStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export default function ModalShell(props: Props) {
  return (
    <View style={props.styles.editorBackdrop}>
      <View style={props.cardStyle}>
        {props.glowWrapStyle ? (
          <View pointerEvents="none" style={props.glowWrapStyle}>
            {props.glowPrimaryStyle ? <View style={props.glowPrimaryStyle} /> : null}
            {props.glowSecondaryStyle ? <View style={props.glowSecondaryStyle} /> : null}
            {props.sheenStyle ? <View style={props.sheenStyle} /> : null}
          </View>
        ) : null}
        {props.children}
      </View>
    </View>
  );
}
