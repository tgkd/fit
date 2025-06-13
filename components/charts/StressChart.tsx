import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import i18n from "@/lib/i18n"; // Corrected import
import * as React from "react";
import { StyleSheet, View } from "react-native";
import { CartesianChart, Line, Scatter } from "victory-native";
import { Card } from "../ui/Card";

interface StressDataPoint extends Record<string, unknown> {
  day: number;
  stress: number;
  timeLabel: string;
}

interface StressChartProps {
  stressData: StressDataPoint[];
}

export function StressChart({ stressData }: StressChartProps) {
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
    if (value < 20) return `${value.toFixed(0)} ${i18n.t("stressChart.low")}`;
    if (value < 40) return `${value.toFixed(0)} ${i18n.t("stressChart.mild")}`;
    if (value < 60) return `${value.toFixed(0)} ${i18n.t("stressChart.moderate")}`;
    if (value < 80) return `${value.toFixed(0)} ${i18n.t("stressChart.high")}`;
    return `${value.toFixed(0)} ${i18n.t("stressChart.max")}`;
  };

  const formatDayLabel = (value: number): string => {
    const dataPoint = stressData.find((d) => d.day === value);
    return dataPoint?.timeLabel || i18n.t("stressChart.dayLabel", { day: value }) || "";
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
              {avgStress.toFixed(1)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>{i18n.t("stressChart.avg")}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.stat}>
            <ThemedText style={styles.statValue}>
              {maxStress.toFixed(1)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>{i18n.t("stressChart.peak")}</ThemedText>
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

      <ThemedView style={styles.legend}>
        <ThemedView style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
          <ThemedText style={styles.legendText}>{i18n.t("stressChart.legendLow")}</ThemedText>

          <View style={[styles.legendDot, { backgroundColor: "#f59e0b" }]} />
          <ThemedText style={styles.legendText}>{i18n.t("stressChart.legendMid")}</ThemedText>

          <View style={[styles.legendDot, { backgroundColor: "#f97316" }]} />
          <ThemedText style={styles.legendText}>{i18n.t("stressChart.legendModerate")}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
          <ThemedText style={styles.legendText}>{i18n.t("stressChart.legendHigh")}</ThemedText>

          <View style={[styles.legendDot, { backgroundColor: "#dc2626" }]} />
          <ThemedText style={styles.legendText}>{i18n.t("stressChart.legendMax")}</ThemedText>
        </ThemedView>
      </ThemedView>
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
  legend: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    flex: 1,
  },
});
