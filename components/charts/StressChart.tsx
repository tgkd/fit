import * as React from "react";
import { StyleSheet, View } from "react-native";
import { CartesianChart, Line, Scatter } from "victory-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { HealthData } from "@/context/HealthDataContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { formatDateForChart, formatNumber } from "@/lib/formatters";
import i18n from "@/lib/i18n";
import { Card } from "../ui/Card";

interface StressChartProps {
  data: HealthData;
}

export function StressChart({ data: initData }: StressChartProps) {
  const stressData = generateStressChartData(initData);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const chartColors = {
    stroke: isDark ? Colors.charts.stress : Colors.charts.stress,
    grid: isDark ? "#374151" : "#e5e7eb",
    labels: isDark ? Colors.dark.text : Colors.light.text,
    scatter: Colors.charts.stress,
    background: isDark ? Colors.dark.background : Colors.light.background,
  };

  const formatStressLabel = (value: number) => {
    const formattedValue = formatNumber(value, 0);
    if (value < 20) return `${formattedValue} ${i18n.t("stressChart.low")}`;
    if (value < 40) return `${formattedValue} ${i18n.t("stressChart.mild")}`;
    if (value < 60)
      return `${formattedValue} ${i18n.t("stressChart.moderate")}`;
    if (value < 80) return `${formattedValue} ${i18n.t("stressChart.high")}`;
    return `${formattedValue} ${i18n.t("stressChart.max")}`;
  };

  const formatDayLabel = (value: number): string => {
    const dataPoint = stressData.find((d) => d.day === value);
    return (
      dataPoint?.timeLabel ||
      i18n.t("stressChart.dayLabel", { day: value }) ||
      ""
    );
  };

  const maxStress = Math.max(...stressData.map((d) => d.stress), 100);
  const avgStress =
    stressData.reduce((sum, d) => sum + d.stress, 0) / stressData.length;

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
          xKey="day"
          padding={15}
          yKeys={["stress"]}
          axisOptions={{
            lineWidth: { grid: { x: 0, y: 1 }, frame: 0 },
            lineColor: {
              grid: {
                x: chartColors.grid,
                y: chartColors.grid,
              },
              frame: chartColors.grid,
            },
            labelColor: {
              x: chartColors.labels,
              y: chartColors.labels,
            },
            labelOffset: { x: 8, y: 8 },
            tickCount: { x: 5, y: 5 },
            axisSide: { x: "bottom", y: "left" },
            labelPosition: {
              x: "outset",
              y: "outset",
            },
            formatXLabel: formatDayLabel,
            formatYLabel: formatStressLabel,
          }}
          data={stressData}
          domainPadding={{ left: 10, right: 10, top: 10, bottom: 10 }}
        >
          {({ points }) => (
            <>
              <Line
                points={points.stress}
                curveType="natural"
                color={chartColors.stroke}
                strokeWidth={3}
                animate={{ type: "spring", duration: 1000 }}
              />
              <Scatter
                radius={4}
                points={points.stress}
                animate={{ type: "spring", duration: 1000 }}
                color={chartColors.scatter}
              />
            </>
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

interface StressDataPoint extends Record<string, unknown> {
  day: number;
  stress: number;
  timeLabel: string;
}

function generateStressChartData(healthData: HealthData): StressDataPoint[] {
  // If we have multiple HRV values, we can create a time series
  if (healthData.hrvValues.length > 1) {
    return healthData.hrvValues.map((hrv, index) => {
      // Calculate stress from HRV (inverse relationship)
      const stress = Math.max(0, Math.min(100, 100 - (hrv / 50) * 100));

      return {
        day: index + 1,
        stress,
        timeLabel: `Day ${index + 1}`,
      };
    });
  }

  // If we only have current stress level, create a simple 7-day view
  const currentStress = healthData.stressLevel;
  const days = 7;

  return Array.from({ length: days }, (_, index) => {
    // Add some variation around the current stress level
    const variation = (Math.random() - 0.5) * 20; // ±10 points variation
    const stress = Math.max(0, Math.min(100, currentStress + variation));

    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));

    return {
      day: index + 1,
      stress,
      timeLabel: formatDateForChart(date),
    };
  });
}
