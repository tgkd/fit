import * as React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { formatNumber } from "@/lib/formatters";
import type { HealthData } from "@/lib/health/types";
import i18n from "@/lib/i18n";
import { Card } from "../ui/Card";
import { StressVisualization } from "./StressVisualization";

interface StressChartProps {
  data: HealthData;
}

export function StressChart({ data: initData }: StressChartProps) {
  if (!initData || !initData.stressChartDisplayData) {
    return (
      <Card>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">{i18n.t("stressChart.title")}</ThemedText>
        </ThemedView>
        <View
          style={[
            styles.chartContainer,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <ThemedText>{i18n.t("stressChart.noData")}</ThemedText>
        </View>
      </Card>
    );
  }

  const { chartPlotData, yDomainForVisualization, workouts } =
    initData.stressChartDisplayData;

  // Calculate stats for display
  const avgStress =
    chartPlotData.length > 0
      ? chartPlotData.reduce((sum, d) => sum + d.stress, 0) /
        chartPlotData.length
      : 0;
  const maxStress =
    chartPlotData.length > 0
      ? Math.max(...chartPlotData.map((d) => d.stress))
      : 0;

  return (
    <Card>
      <ThemedView style={styles.header}>
        <ThemedText type="subtitle">{i18n.t("stressChart.title")}</ThemedText>
        <ThemedView style={styles.statsRow}>
          <ThemedView style={styles.stat}>
            <ThemedText style={styles.statValue}>
              {formatNumber(avgStress, 1)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              {i18n.t("stressChart.avg")}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.stat}>
            <ThemedText style={styles.statValue}>
              {formatNumber(maxStress, 1)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              {i18n.t("stressChart.peak")}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      <View style={styles.chartContainer}>
        <StressVisualization
          data={chartPlotData}
          yDomain={yDomainForVisualization}
          height={220}
          showXAxisTicks={4}
          workouts={workouts}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  chartContainer: {
    flex: 1,
    minHeight: 220,
  },
});
