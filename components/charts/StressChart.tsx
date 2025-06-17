import { LinearGradient, useFont, vec } from "@shopify/react-native-skia";
import * as React from "react";
import { StyleSheet, View } from "react-native";
import { Area, CartesianChart } from "victory-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { formatNumber } from "@/lib/formatters";
import type { HealthData } from "@/lib/health/types";
import i18n from "@/lib/i18n";
import { Card } from "../ui/Card";

const hiFont = require("@/assets/fonts/Hikasami-Regular.ttf");

interface StressChartProps {
  data: HealthData;
}

export function StressChart({ data: initData }: StressChartProps) {
  const font = useFont(hiFont, 12);
  const themedTextColor = useThemeColor({}, "text");
  const themedLineColor = useThemeColor({}, "tint");
  const themedGridColor = useThemeColor({}, "textSecondary");

  if (!initData || !initData.stressChartDisplayData) {
    return (
      <Card>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">{i18n.t("stressChart.title")}</ThemedText>
        </ThemedView>
        <View style={[styles.chartContainer, { justifyContent: "center", alignItems: "center" }]}>
          <ThemedText>{i18n.t("stressChart.noData")}</ThemedText>
        </View>
      </Card>
    );
  }

  const {
    chartPlotData,
    yDomainForVisualization,
  } = initData.stressChartDisplayData;

  // Convert chart data to the format expected by CartesianChart
  const chartData = chartPlotData.map((item) => ({
    x: typeof item.time === "number" ? item.time : new Date(item.time).getTime(),
    y: item.stress,
    originalTimestamp: item.timestamp,
  }));

  // Calculate stats for display
  const avgStress = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.y, 0) / chartData.length
    : 0;
  const maxStress = chartData.length > 0
    ? Math.max(...chartData.map((d) => d.y))
    : 0;

  // Ensure xDomain is correctly calculated based on actual data points
  const xValues = chartData.map((p) => p.x);
  const xDomain: [number, number] = chartData.length > 1
    ? [Math.min(...xValues), Math.max(...xValues)]
    : [0, 1];

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
        <CartesianChart
          data={chartData}
          xKey="x"
          yKeys={["y"]}
          domain={{ y: yDomainForVisualization, x: xDomain }}
          axisOptions={{
            font,
            labelColor: themedTextColor,
            lineColor: {
              grid: { x: "transparent", y: themedGridColor },
              frame: "transparent",
            },
            tickCount: {
              x: 4,
              y: 4,
            },
            formatXLabel: (value) => {
              return new Date(value).toLocaleTimeString([], {
                hour: "2-digit",
                minute: undefined,
              });
            },
            formatYLabel: (value) => `${Math.round(value as number)}`,
          }}
        >
          {({ points, chartBounds }) => (
            <Area
              y0={chartBounds.bottom}
              points={points.y}
              curveType="linear"
              color={themedLineColor}
              opacity={0.3}
              animate={{ type: "timing", duration: 300 }}
            >
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, chartBounds.bottom)}
                colors={["#ef4444", "#f59e0b", "#10b981"]}
              />
            </Area>
          )}
        </CartesianChart>
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
