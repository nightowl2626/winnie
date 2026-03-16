import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import type { AppStyles } from "../../../styles/appStyles";
import type { WearLogEntry } from "../../../types";

type Props = {
  styles: AppStyles;
  streakDays: number;
  homeWeekCells: Date[];
  wearLogByDate: Map<string, WearLogEntry>;
  resolveImageUri: (
    primaryBase64?: string,
    secondaryBase64?: string,
    imageUrl?: string
  ) => string | undefined;
  onOpenCalendarLogModal: (dateKey: string) => void;
};

export default function HomeWeekStreak(props: Props) {
  return (
    <View style={props.styles.optimizerCard}>
      <View style={props.styles.calendarWidgetHeader}>
        <Text style={props.styles.calendarStreakInline}>{props.streakDays} day streak</Text>
        <Text style={props.styles.calendarStreakSubtitle}>Log your outfits</Text>
      </View>
      <View style={props.styles.calendarWeekRow}>
        {props.homeWeekCells.map((cell) => {
          const dateKey = cell.toISOString().slice(0, 10);
          const entry = props.wearLogByDate.get(dateKey);
          const thumb = props.resolveImageUri(
            entry?.items?.[0]?.item_snippet_base64,
            entry?.items?.[0]?.image_base64,
            entry?.items?.[0]?.image_url
          );
          const dayLabel = new Intl.DateTimeFormat("en-US", {
            weekday: "narrow",
          }).format(cell);
          const isToday = dateKey === new Date().toISOString().slice(0, 10);

          return (
            <Pressable
              key={`week-${dateKey}`}
              style={[
                props.styles.weekCell,
                thumb ? props.styles.weekCellFilled : undefined,
                isToday ? props.styles.weekCellToday : undefined,
              ]}
              onPress={() => props.onOpenCalendarLogModal(dateKey)}
            >
              {thumb ? <Image source={{ uri: thumb }} style={props.styles.weekCellImage} /> : null}
              <View
                style={[
                  props.styles.weekCellOverlay,
                  thumb ? props.styles.weekCellOverlayFilled : undefined,
                ]}
              />
              <View style={props.styles.weekCellHeader}>
                <Text
                  numberOfLines={1}
                  style={[
                    props.styles.weekCellWeekday,
                    thumb ? props.styles.weekCellTextOnImage : undefined,
                  ]}
                >
                  {dayLabel}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    props.styles.weekCellDay,
                    thumb ? props.styles.weekCellTextOnImage : undefined,
                  ]}
                >
                  {cell.getDate()}
                </Text>
              </View>
              {thumb ? null : (
                <View style={props.styles.weekCellEmptyState}>
                  <View style={props.styles.weekCellDot} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
