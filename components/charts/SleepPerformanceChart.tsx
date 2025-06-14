import { useThemeColor } from "@/hooks/useThemeColor";
import i18n from "@/lib/i18n";
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

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
  const textColor = useThemeColor({}, "text");

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on performance
  const getPerformanceColor = (perf: number) => {
    if (perf >= 80) return "#00E676"; // Green - Optimal
    if (perf >= 60) return "#FFEB3B"; // Yellow - Sufficient
    return "#FF9800"; // Orange - Poor
  };

  const performanceColor = getPerformanceColor(percentage);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#333333"
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
        <ThemedText style={[styles.percentageText, { color: textColor }]}>
          {Math.round(percentage)}%
        </ThemedText>
        <ThemedText style={[styles.labelText, { color: textColor }]}>
          {i18n.t("sleep.sleep")}
        </ThemedText>
        <ThemedText style={[styles.labelText, { color: textColor }]}>
          {i18n.t("sleep.sleepPerformance")}
        </ThemedText>

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
  brandText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    marginBottom: 4,
  },
  percentageText: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    lineHeight: 14,
  },
  indicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    marginTop: 8,
  },
});
