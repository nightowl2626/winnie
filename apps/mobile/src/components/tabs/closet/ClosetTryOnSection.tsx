import React from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import type { AppStyles } from "../../../styles/appStyles";
import type { WardrobeItem } from "../../../types";
import type { AnimatedPressableComponentType } from "../../componentTypes";

type Props = {
  styles: AppStyles;
  AnimatedPressableComponent: AnimatedPressableComponentType;
  scanSummary?: string;
  styleProfilePhotoBase64: string;
  resolveImageUri: (
    primaryBase64?: string,
    secondaryBase64?: string,
    imageUrl?: string
  ) => string | undefined;
  stylePhotoSaving: boolean;
  onUploadModelPhoto: () => void;
  selectedTryOnCount: number;
  hasModelPhoto: boolean;
  tryOnBusy: boolean;
  onRunTryOn: () => void | Promise<void>;
  tryOnPreviewSlots: Array<WardrobeItem | null>;
  onOpenStylistChat: () => void | Promise<void>;
};

export default function ClosetTryOnSection(props: Props) {
  const AnimatedPressableComponent = props.AnimatedPressableComponent;

  return (
    <>
      {props.scanSummary ? (
        <View style={props.styles.summaryCard}>
          <Text style={props.styles.summaryEyebrow}>LATEST ANALYSIS</Text>
          <Text style={props.styles.summaryBody}>{props.scanSummary}</Text>
        </View>
      ) : null}

      <View style={[props.styles.collectionCard, props.styles.closetTryOnCard]}>
        <View style={props.styles.tryOnPanel}>
          <View style={props.styles.modelPhotoBlock}>
            <View style={props.styles.modelPhotoMediaWrap}>
              {props.resolveImageUri(props.styleProfilePhotoBase64) ? (
                <Image
                  source={{ uri: props.resolveImageUri(props.styleProfilePhotoBase64) }}
                  style={props.styles.modelPhotoPreview}
                />
              ) : (
                <View style={props.styles.modelPhotoFallback}>
                  <Text style={props.styles.gridFallbackText}>No photo yet</Text>
                </View>
              )}
              <Pressable
                style={[
                  props.styles.modelPhotoEditBtn,
                  props.stylePhotoSaving ? props.styles.dimmed : undefined,
                ]}
                onPress={props.onUploadModelPhoto}
                disabled={props.stylePhotoSaving}
              >
                {props.stylePhotoSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="pencil" size={15} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
          <View style={props.styles.tryOnActionBlock}>
            <AnimatedPressableComponent
              style={[
                props.styles.tryOnBtn,
                (!props.selectedTryOnCount || !props.hasModelPhoto || props.tryOnBusy)
                  ? props.styles.dimmed
                  : undefined,
              ]}
              onPress={() => void props.onRunTryOn()}
              disabled={!props.selectedTryOnCount || !props.hasModelPhoto || props.tryOnBusy}
            >
              <Text style={props.styles.tryOnBtnText}>
                {props.tryOnBusy ? "Generating..." : "Try On Selected"}
              </Text>
            </AnimatedPressableComponent>
            <View style={props.styles.tryOnSelectedPreviewRow}>
              {props.tryOnPreviewSlots.map((item, index) => {
                const previewUri = item
                  ? props.resolveImageUri(item.item_snippet_base64, item.image_base64, item.image_url)
                  : "";
                return (
                  <View
                    key={item ? `try-on-preview-${item.id}` : `try-on-placeholder-${index}`}
                    style={[
                      props.styles.tryOnSelectedPreviewCard,
                      !item ? props.styles.tryOnSelectedPreviewCardEmpty : undefined,
                    ]}
                  >
                    {previewUri ? (
                      <Image source={{ uri: previewUri }} style={props.styles.tryOnSelectedPreviewImage} />
                    ) : (
                      <View style={props.styles.tryOnSelectedPreviewFallback}>
                        <Text style={props.styles.tryOnSelectedPreviewFallbackText}>+</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
            <AnimatedPressableComponent
              style={props.styles.outfitChatBtn}
              onPress={() => void props.onOpenStylistChat()}
            >
              <Text style={props.styles.outfitChatBtnText}>Outfit Chat</Text>
            </AnimatedPressableComponent>
          </View>
        </View>
      </View>
    </>
  );
}
