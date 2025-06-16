import React from "react";
import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getPerformanceColor } from "@/lib/health";
import { SleepMetrics } from "@/lib/health/types";
import i18n from "@/lib/i18n";
import { ThemedText } from "../ThemedText";

interface MetricRowProps {
  icon?: string;
  label: string;
  percentage: number;
}

function MetricRow({ icon, label, percentage }: MetricRowProps) {
  const metricColor = getPerformanceColor(percentage);

  return (
    <View style={styles.metricRow}>
      <View style={styles.metricInfo}>
        {icon ? <ThemedText size="md">{icon}</ThemedText> : null}
        <ThemedText type="defaultSemiBold" size="sm">
          {label}
        </ThemedText>
      </View>
      <View style={styles.metricValue}>
        <View style={styles.progressBar}>
          <View style={styles.progressTrack} />
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: metricColor,
                width: `${Math.min(percentage, 100)}%`,
              },
            ]}
          />
        </View>
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
  metrics: SleepMetrics;
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
  },
  progressBar: {
    width: 80,
    height: 4,
    marginRight: 12,
    position: "relative",
  },
  progressTrack: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: Colors.charts.chartBackground,
    borderRadius: 2,
  },
  progressFill: {
    position: "absolute",
    height: "100%",
    borderRadius: 2,
  },
  percentageText: {
    minWidth: 40,
    textAlign: "right",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
