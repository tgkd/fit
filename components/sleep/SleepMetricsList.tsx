import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getPerformanceColor } from "@/lib/health/sleep";
import { SleepAnalysis } from "@/lib/health/types";
import i18n from "@/lib/i18n";
import { ThemedText } from "../ThemedText";

interface MetricRowProps {
  icon?: string;
  label: string;
  percentage: number;
}

function MetricRow({ icon, label, percentage }: MetricRowProps) {
  const metricColor = getPerformanceColor(percentage);
  const barWidth = 120;
  const barHeight = 12;
  const fillWidth = (percentage / 100) * barWidth;

  // Create paths for the bars
  const backgroundPath = Skia.Path.Make();
  backgroundPath.addRRect({
    rect: { x: 0, y: 0, width: barWidth, height: barHeight },
    rx: 8,
    ry: 8,
  });

  const fillPath = Skia.Path.Make();
  fillPath.addRRect({
    rect: { x: 0, y: 0, width: fillWidth, height: barHeight },
    rx: 8,
    ry: 8,
  });

  return (
    <View style={styles.metricRow}>
      <View style={styles.metricInfo}>
        {icon ? <ThemedText size="md">{icon}</ThemedText> : null}
        <ThemedText type="defaultSemiBold" size="sm">
          {label}
        </ThemedText>
      </View>
      <View style={styles.metricValue}>
        <Canvas style={{ width: barWidth, height: barHeight }}>
          <Path path={backgroundPath} color={Colors.charts.chartBackground} />
          <Path path={fillPath} color={metricColor} />
        </Canvas>
        <ThemedText
          type="defaultSemiBold"
          size="md"
          style={styles.percentageText}
        >
          {Math.round(percentage)}%
        </ThemedText>
      </View>
    </View>
  );
}

interface SleepMetricsListProps {
  metrics: SleepAnalysis;
}

export function SleepMetricsList({ metrics }: SleepMetricsListProps) {
  const borderColor = useThemeColor({}, "border");

  return (
    <>
      <MetricRow
        label={i18n.t("sleep.hoursVsNeeded")}
        percentage={metrics.hoursVsNeeded}
      />
      <View style={[styles.divider, { backgroundColor: borderColor }]} />
      <MetricRow
        label={i18n.t("sleep.sleepConsistency")}
        percentage={metrics.sleepConsistency}
      />
      <View style={[styles.divider, { backgroundColor: borderColor }]} />

      <MetricRow
        label={i18n.t("sleep.sleepEfficiency")}
        percentage={metrics.sleepEfficiency}
      />
      <View style={[styles.divider, { backgroundColor: borderColor }]} />

      <MetricRow
        label={i18n.t("sleep.sleepStress")}
        percentage={metrics.sleepStress}
      />
    </>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  metricInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    columnGap: 8,
  },
  metricValue: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    gap: 12,
  },
  percentageText: {
    minWidth: 40,
    textAlign: "right",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
