import { useThemeColor } from "@/hooks/useThemeColor";
import { SleepMetrics } from "@/lib/health/types";
import i18n from "@/lib/i18n";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "../ThemedText";

interface MetricRowProps {
  icon: string;
  label: string;
  percentage: number;
}

function MetricRow({ icon, label, percentage }: MetricRowProps) {
  const textColor = useThemeColor({}, "text");

  // Color based on performance
  const getMetricColor = (perf: number) => {
    if (perf >= 80) return "#00E676";
    if (perf >= 60) return "#FFEB3B";
    return "#FF9800";
  };

  const metricColor = getMetricColor(percentage);

  return (
    <View style={styles.metricRow}>
      <View style={styles.metricInfo}>
        <ThemedText style={styles.metricIcon}>{icon}</ThemedText>
        <ThemedText style={[styles.metricLabel, { color: textColor }]}>
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
        <ThemedText style={[styles.percentageText, { color: textColor }]}>
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
  return (
    <View style={styles.container}>
      <MetricRow
        icon="🕐"
        label={i18n.t("sleep.hoursVsNeeded")}
        percentage={metrics.hoursVsNeeded}
      />
      <MetricRow
        icon="🌙"
        label={i18n.t("sleep.sleepConsistency")}
        percentage={metrics.sleepConsistency}
      />
      <MetricRow
        icon="📊"
        label={i18n.t("sleep.sleepEfficiency")}
        percentage={metrics.sleepEfficiency}
      />
      <MetricRow
        icon="💤"
        label={i18n.t("sleep.highSleepStress")}
        percentage={metrics.highSleepStress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  metricInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  metricIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.5,
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
    backgroundColor: "#333333",
    borderRadius: 2,
  },
  progressFill: {
    position: "absolute",
    height: "100%",
    borderRadius: 2,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },
});
