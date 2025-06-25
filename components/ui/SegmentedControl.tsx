import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";

export interface SegmentedControlOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  style?: ViewStyle;
}

export function SegmentedControl({
  options,
  selectedValue,
  onValueChange,
  style,
}: SegmentedControlProps) {
  const backgroundColor = useThemeColor({}, "background");
  const cardBackground = useThemeColor({}, "cardBackground");
  const tint = useThemeColor({}, "tint");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={[styles.container, { backgroundColor: cardBackground }, style]}>
      {options.map((option, index) => {
        const isSelected = option.value === selectedValue;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;

        return (
          <Pressable
            key={option.value}
            style={[
              styles.segment,
              isFirst && styles.firstSegment,
              isLast && styles.lastSegment,
              isSelected && {
                backgroundColor: tint,
              },
              !isSelected && {
                backgroundColor: "transparent",
              },
            ]}
            onPress={() => onValueChange(option.value)}
            android_ripple={{
              color: tint,
              borderless: false,
            }}
          >
            <ThemedText
              type={isSelected ? "defaultSemiBold" : "default"}
              size="sm"
              style={[
                styles.segmentText,
                {
                  color: isSelected ? backgroundColor : textSecondary,
                },
              ]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 2,
    alignSelf: "center",
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    minWidth: 80,
  },
  firstSegment: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  lastSegment: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  segmentText: {
    textAlign: "center",
  },
});
