import React from "react";
import { Text } from "react-native";

import type { AnimatedPressableComponentType } from "./componentTypes";
import AgentConcierge from "./AgentConcierge";
import AgentPortal from "./AgentPortal";
import AppModals from "./AppModals";
import FirstRunTutorial from "./FirstRunTutorial";
import BottomNav from "./nav/BottomNav";

type Props = {
  portalProps: React.ComponentProps<typeof AgentPortal>;
  conciergeProps: React.ComponentProps<typeof AgentConcierge>;
  tutorialProps: React.ComponentProps<typeof FirstRunTutorial>;
  bottomNavProps: React.ComponentProps<typeof BottomNav>;
  modalsProps: React.ComponentProps<typeof AppModals>;
  AnimatedPressableComponent: AnimatedPressableComponentType;
  showClosetScanFab: boolean;
  closetScanFabStyle: React.ComponentProps<AnimatedPressableComponentType>["style"];
  closetScanFabTextStyle: any;
  onClosetScanPress: () => void;
};

export default function AppOverlays({
  portalProps,
  conciergeProps,
  tutorialProps,
  bottomNavProps,
  modalsProps,
  AnimatedPressableComponent,
  showClosetScanFab,
  closetScanFabStyle,
  closetScanFabTextStyle,
  onClosetScanPress,
}: Props) {
  return (
    <>
      <AgentPortal {...portalProps} />
      <AgentConcierge {...conciergeProps} />
      <FirstRunTutorial {...tutorialProps} />
      <BottomNav {...bottomNavProps} />

      {showClosetScanFab ? (
        <AnimatedPressableComponent style={closetScanFabStyle} onPress={onClosetScanPress} scaleValue={0.9}>
          <Text style={closetScanFabTextStyle}>＋</Text>
        </AnimatedPressableComponent>
      ) : null}

      <AppModals {...modalsProps} />
    </>
  );
}
