import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { AppStyles } from "../../../styles/appStyles";
import type { AnimatedPressableComponentType } from "../../componentTypes";

type Props = {
  styles: AppStyles;
  placeholderTextColor: string;
  AnimatedPressableComponent: AnimatedPressableComponentType;
  wishlistFormCategory: string;
  setWishlistFormCategory: (value: string) => void;
  wishlistFormColor: string;
  setWishlistFormColor: (value: string) => void;
  wishlistFormNotes: string;
  setWishlistFormNotes: (value: string) => void;
  wishlistFormBusy: boolean;
  onAddWishlistItemManually: () => void | Promise<void>;
  onOpenWishlistAgent: () => void | Promise<void>;
};

export default function WishlistManualSection(props: Props) {
  const AnimatedPressableComponent = props.AnimatedPressableComponent;

  return (
    <View style={[props.styles.optimizerCard, props.styles.wishlistManualCard]}>
      <View pointerEvents="none" style={props.styles.wishlistCardGlowWrap}>
        <View style={props.styles.wishlistCardGlowPrimary} />
        <View style={props.styles.wishlistCardGlowSecondary} />
        <View style={props.styles.wishlistCardSheen} />
      </View>
      <View style={props.styles.collectionHeaderRow}>
        <AnimatedPressableComponent
          style={props.styles.outfitChatBtn}
          onPress={() => void props.onOpenWishlistAgent()}
        >
          <Text style={props.styles.outfitChatBtnText}>Live Voice</Text>
        </AnimatedPressableComponent>
      </View>
      <View style={props.styles.wishlistManualRow}>
        <TextInput
          value={props.wishlistFormCategory}
          onChangeText={props.setWishlistFormCategory}
          style={[
            props.styles.editorInput,
            props.styles.editItemInput,
            props.styles.wishlistManualInput,
          ]}
          placeholder="Category (required)"
          placeholderTextColor={props.placeholderTextColor}
        />
        <TextInput
          value={props.wishlistFormColor}
          onChangeText={props.setWishlistFormColor}
          style={[
            props.styles.editorInput,
            props.styles.editItemInput,
            props.styles.wishlistManualInput,
          ]}
          placeholder="Color (optional)"
          placeholderTextColor={props.placeholderTextColor}
        />
      </View>
      <TextInput
        value={props.wishlistFormNotes}
        onChangeText={props.setWishlistFormNotes}
        style={[
          props.styles.editorInput,
          props.styles.editorInputMultiline,
          props.styles.editItemInput,
          props.styles.wishlistManualNotesInput,
        ]}
        placeholder="Extra notes (optional)"
        placeholderTextColor={props.placeholderTextColor}
        multiline
      />
      <Pressable
        style={[
          props.styles.optimizerActionBtn,
          props.styles.wishlistPrimaryBtn,
          props.wishlistFormBusy ? props.styles.dimmed : undefined,
        ]}
        onPress={() => void props.onAddWishlistItemManually()}
        disabled={props.wishlistFormBusy}
      >
        <Text style={props.styles.optimizerActionText}>
          {props.wishlistFormBusy ? "Adding..." : "Add Item"}
        </Text>
      </Pressable>
    </View>
  );
}
