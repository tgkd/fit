import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { SleepAnalysis } from "@/lib/health/types";
import i18n from "@/lib/i18n";
import { ThemedText } from "../ThemedText";

interface SleepTrendsChartProps {
  currentSleep: SleepAnalysis;
  sleepAverages: {
    last14Days: {
      duration: number;
      efficiency: number;
      performance: number;
      consistency: number;
    };
    last30Days: {
      duration: number;
      efficiency: number;
      performance: number;
      consistency: number;
    };
  };
}

interface BarData {
  label: string;
  value: number;
  color: string;
  unit: string;
}

function HorizontalBar({
  label,
  value,
  maxValue,
  color,
  unit,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  unit: string;
}) {
  const barWidth = 200;
  const barHeight = 12; // Made thinner: reduced from 20 to 12
  const fillWidth = (value / maxValue) * barWidth;

  // Create paths for the bars
  const backgroundPath = Skia.Path.Make();
  backgroundPath.addRRect({
    rect: { x: 0, y: 0, width: barWidth, height: barHeight },
    rx: 6, // Reduced radius to match thinner bars
    ry: 6,
  });

  const fillPath = Skia.Path.Make();
  fillPath.addRRect({
    rect: { x: 0, y: 0, width: fillWidth, height: barHeight },
    rx: 6, // Reduced radius to match thinner bars
    ry: 6,
  });

  return (
    <View style={styles.barRow}>
      <ThemedText style={styles.barLabel} type="secondary" size="xs">
        {label}
      </ThemedText>
      <View style={styles.barContainer}>
        <Canvas style={{ width: barWidth, height: barHeight }}>
          <Path path={backgroundPath} color={Colors.charts.chartBackground} />
          <Path path={fillPath} color={color} />
        </Canvas>
      </View>
      <View style={styles.barValue}>
        <ThemedText type="defaultSemiBold" size="sm">
          {unit === "h"
            ? `${value.toFixed(1)}${unit}`
            : `${Math.round(value)}${unit}`}
        </ThemedText>
      </View>
    </View>
  );
}

export function SleepTrendsChart({
  currentSleep,
  sleepAverages,
}: SleepTrendsChartProps) {
  // Duration data (hours) - separate section
  const durationData: BarData[] = [
    {
      label: i18n.t("sleep.today"),
      value: currentSleep.totalSleepHours,
      color: Colors.charts.sleepCurrent,
      unit: "h",
    },
    {
      label: i18n.t("sleep.trends.last14Days"),
      value: sleepAverages.last14Days.duration,
      color: Colors.charts.sleep14Days,
      unit: "h",
    },
    {
      label: i18n.t("sleep.trends.last30Days"),
      value: sleepAverages.last30Days.duration,
      color: Colors.charts.sleep30Days,
      unit: "h",
    },
  ];

  // Percentage metrics data - separate sections
  const efficiencyData: BarData[] = [
    {
      label: i18n.t("sleep.today"),
      value: currentSleep.sleepEfficiency,
      color: Colors.charts.sleepCurrent,
      unit: "%",
    },
    {
      label: i18n.t("sleep.trends.last14Days"),
      value: sleepAverages.last14Days.efficiency,
      color: Colors.charts.sleep14Days,
      unit: "%",
    },
    {
      label: i18n.t("sleep.trends.last30Days"),
      value: sleepAverages.last30Days.efficiency,
      color: Colors.charts.sleep30Days,
      unit: "%",
    },
  ];

  const performanceData: BarData[] = [
    {
      label: i18n.t("sleep.today"),
      value: currentSleep.overallPerformance,
      color: Colors.charts.sleepCurrent,
      unit: "%",
    },
    {
      label: i18n.t("sleep.trends.last14Days"),
      value: sleepAverages.last14Days.performance,
      color: Colors.charts.sleep14Days,
      unit: "%",
    },
    {
      label: i18n.t("sleep.trends.last30Days"),
      value: sleepAverages.last30Days.performance,
      color: Colors.charts.sleep30Days,
      unit: "%",
    },
  ];

  const consistencyData: BarData[] = [
    {
      label: i18n.t("sleep.today"),
      value: currentSleep.sleepConsistency,
      color: Colors.charts.sleepCurrent,
      unit: "%",
    },
    {
      label: i18n.t("sleep.trends.last14Days"),
      value: sleepAverages.last14Days.consistency,
      color: Colors.charts.sleep14Days,
      unit: "%",
    },
    {
      label: i18n.t("sleep.trends.last30Days"),
      value: sleepAverages.last30Days.consistency,
      color: Colors.charts.sleep30Days,
      unit: "%",
    },
  ];

  // Calculate max values for proper scaling
  const maxDuration = Math.max(...durationData.map((d) => d.value));
  const maxPercentage = 100; // Percentages are always 0-100

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" size="md">
        {i18n.t("sleep.trends.title")}
      </ThemedText>

      {/* Duration Section */}
      <ThemedText type="defaultSemiBold" size="sm">
        {i18n.t("sleep.duration")}
      </ThemedText>
      <View style={styles.barsContainer}>
        {durationData.map((item, index) => (
          <HorizontalBar
            key={index}
            label={item.label}
            value={item.value}
            maxValue={maxDuration}
            color={item.color}
            unit={item.unit}
          />
        ))}
      </View>

      {/* Efficiency Section */}
      <ThemedText type="defaultSemiBold" size="sm">
        {i18n.t("sleep.sleepEfficiency")}
      </ThemedText>
      <View style={styles.barsContainer}>
        {efficiencyData.map((item, index) => (
          <HorizontalBar
            key={index}
            label={item.label}
            value={item.value}
            maxValue={maxPercentage}
            color={item.color}
            unit={item.unit}
          />
        ))}
      </View>

      {/* Performance Section */}
      <ThemedText type="defaultSemiBold" size="sm">
        {i18n.t("sleep.sleepPerformance")}
      </ThemedText>
      <View style={styles.barsContainer}>
        {performanceData.map((item, index) => (
          <HorizontalBar
            key={index}
            label={item.label}
            value={item.value}
            maxValue={maxPercentage}
            color={item.color}
            unit={item.unit}
          />
        ))}
      </View>

      {/* Consistency Section */}
      <ThemedText type="defaultSemiBold" size="sm">
        {i18n.t("sleep.sleepConsistency")}
      </ThemedText>
      <View style={styles.barsContainer}>
        {consistencyData.map((item, index) => (
          <HorizontalBar
            key={index}
            label={item.label}
            value={item.value}
            maxValue={maxPercentage}
            color={item.color}
            unit={item.unit}
          />
        ))}
      </View>

      <View
        style={[
          styles.tipContainer,
          {
            borderColor: Colors.charts.sleepAccent,
            backgroundColor: `${Colors.charts.sleepAccent}10`,
          },
        ]}
      >
        <ThemedText type="secondary" size="sm" textAlign="center">
          {i18n.t("sleep.trends.improvementTip")}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  barsContainer: {
    gap: 2,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  barLabel: {
    width: 80,
  },
  barContainer: {
    flex: 1,
  },
  barValue: {
    width: 50,
    alignItems: "flex-end",
  },
  tipContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
});
