import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Colors } from "@/constants/Colors";
import { ThemedText } from "../ThemedText";

interface Props {
  value: number;
  maxValue?: number;
  color?: string;
  backgroundColor?: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function CircularProgressChart({
  value,
  maxValue = 100,
  color = "#4CAF50",
  backgroundColor = Colors.charts.chartBackground,
  size = 96,
  strokeWidth = 8,
  label,
}: Props) {
  const percentage = Math.max(0, Math.min(100, (value / maxValue) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
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
        <ThemedText size="xs" type="secondary" style={styles.labelText}>
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
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
  labelText: {
    marginLeft: -4,
    marginTop: 4,
  },
});
