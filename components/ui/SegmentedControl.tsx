import SegmentedControlLib from "@react-native-segmented-control/segmented-control";
import React from "react";
import { ViewStyle } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

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
  const tint = useThemeColor({}, "tint");
  const textSecondary = useThemeColor({}, "textSecondary");

  // Convert options array to values array for the library
  const values = options.map((option) => option.label);

  // Find selected index based on selectedValue
  const selectedIndex = options.findIndex(
    (option) => option.value === selectedValue
  );

  // Handle value change - convert back from index to value
  const handleValueChange = (value: string) => {
    const optionIndex = values.indexOf(value);
    if (optionIndex >= 0) {
      onValueChange(options[optionIndex].value);
    }
  };

  return (
    <SegmentedControlLib
      values={values}
      selectedIndex={selectedIndex >= 0 ? selectedIndex : 0}
      onValueChange={handleValueChange}
      style={[
        {
          width: "100%",
        },
        style,
      ]}
      tintColor={tint}
      fontStyle={{
        color: textSecondary,
        fontSize: 14,
      }}
      activeFontStyle={{
        color: backgroundColor,
        fontSize: 14,
        fontWeight: "600",
      }}
    />
  );
}
