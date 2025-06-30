import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Colors } from "@/constants/Colors";
import { ThemedText } from "../ThemedText";
import { IconSymbol } from "../ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";

interface Props {
  value: number;
  maxValue?: number;
  color?: string;
  backgroundColor?: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
  onPress?: () => void;
}

export function CircularProgressChart({
  value,
  maxValue = 100,
  color = "#4CAF50",
  backgroundColor = Colors.charts.chartBackground,
  size = 96,
  strokeWidth = 8,
  label,
  onPress,
}: Props) {
  const iconColor = useThemeColor({}, 'icon');
  const percentage = Math.max(0, Math.min(100, (value / maxValue) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isPressable = onPress && label;

  const content = (
    <View style={styles.container}>
      <View style={[styles.chartContainer, { width: size, height: size }]}>
        <Svg width={size} height={size} style={styles.svg}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        <View style={styles.percentageContainer}>
          <ThemedText style={[styles.percentageText, { color: color }]}>
            {maxValue === 100 ? `${Math.round(percentage)}%` : `${value}`}
          </ThemedText>
        </View>
      </View>

      {label ? (
        <View style={styles.labelContainer}>
          <ThemedText size="xs" type="secondary" style={styles.labelText}>
            {label}
          </ThemedText>
          {isPressable && (
            <IconSymbol
              name="chevron.right"
              size={12}
              color={iconColor}
              style={styles.chevronIcon}
            />
          )}
        </View>
      ) : null}
    </View>
  );

  if (isPressable) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.pressableContainer,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  pressableContainer: {
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  chartContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
  percentageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  percentageText: {
    fontWeight: "bold",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  labelText: {
    marginLeft: -2,
  },
  chevronIcon: {
    marginLeft: 4,
  },
});
