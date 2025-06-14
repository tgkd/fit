import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Colors } from "@/constants/Colors";
import { getPerformanceColor } from "@/lib/health";
import i18n from "@/lib/i18n";
import { ThemedText } from "../ThemedText";

interface SleepPerformanceChartProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export function SleepPerformanceChart({
  percentage,
  size = 200,
  strokeWidth = 8,
}: SleepPerformanceChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const performanceColor = getPerformanceColor(percentage);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={Colors.charts.chartBackground}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={performanceColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.textContainer}>
        <ThemedText size="lg">{Math.round(percentage)}%</ThemedText>
        <ThemedText size="sm">{i18n.t("sleep.sleep")}</ThemedText>
        <ThemedText size="sm">{i18n.t("sleep.sleepPerformance")}</ThemedText>

        <View
          style={[styles.indicator, { backgroundColor: performanceColor }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  svg: {
    position: "absolute",
  },
  textContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    marginTop: 8,
  },
});
