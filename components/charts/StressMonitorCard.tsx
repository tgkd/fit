import { useFont } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { CartesianChart, Line, Scatter } from "victory-native";

import hiFont from "@/assets/fonts/Hikasami-Regular.ttf";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import type { HealthData } from "@/context/HealthDataContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import i18n from "@/lib/i18n";

export interface StressChartDataPoint {
  time: number;
  stress: number;
  timestamp: string;
}

export type StressDisplayCategory = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

function calculatePointStress(hrv: number, restingHR: number): number {
  if (hrv === 0 || restingHR === 0) return 2;
  const ratio = restingHR / hrv;
  const stress = ((ratio - 0.5) / (3.0 - 0.5)) * 4;
  return Math.max(0, Math.min(4, stress));
}

function generateStressChartData(
  hrvValues: number[],
  restingHeartRate: number | null
): StressChartDataPoint[] {
  const rhr = restingHeartRate || 60;
  const today = new Date();

  if (!hrvValues || hrvValues.length === 0) {
    return [];
  }

  const recentHrvValues = hrvValues.slice(-7);

  return recentHrvValues.map((hrv, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (recentHrvValues.length - 1 - index));

    return {
      time: index,
      stress: calculatePointStress(hrv, rhr),
      timestamp: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    };
  });
}

interface StressMonitorCardProps {
  healthData: HealthData | null;
  onPress?: () => void;
}

export function StressMonitorCard({
  healthData,
  onPress,
}: StressMonitorCardProps) {
  const backgroundColor = useThemeColor({}, "background");
  const iconColorSecondary = useThemeColor({}, "textSecondary");

  if (!healthData) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ThemedText>{i18n.t("stressMonitor.loadingData")}</ThemedText>
      </View>
    );
  }

  const {
    hrvValues,
    restingHeartRate,
    stressLevel: overallStressLevelFromContext,
  } = healthData;

  const currentOverallStressChartScaled = overallStressLevelFromContext / 25;

  const chartPlotData = generateStressChartData(hrvValues, restingHeartRate);

  const lastUpdatedDisplay = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <IconSymbol name="moon" size={16} color={iconColorSecondary} />
          <ThemedText size="md">{i18n.t("stressMonitor.title")}</ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={16} color={iconColorSecondary} />
      </View>

      <ThemedText size="xs">
        {i18n.t("stressMonitor.lastUpdated", { time: lastUpdatedDisplay })}
      </ThemedText>

      <View style={styles.chartOuterContainer}>
        <StressVisualization
          data={chartPlotData}
          currentStress={currentOverallStressChartScaled}
        />
      </View>
    </TouchableOpacity>
  );
}

interface StressVisualizationProps {
  data: StressChartDataPoint[];
  currentStress: number;
}

function StressVisualization({
  data,
  currentStress,
}: StressVisualizationProps) {
  const font = useFont(hiFont, 12);
  const themedTextColor = useThemeColor({}, "text");
  const themedLineColor = useThemeColor({}, "tint");
  const themedGridColor = useThemeColor({}, "textSecondary");
  const themedScatterColor = useThemeColor({}, "tint");

  const getStressColor = (stress: number) => {
    if (stress <= 1) return "#10b981";
    if (stress <= 2) return "#3b82f6";
    if (stress <= 3) return "#f59e0b";
    return "#ef4444";
  };

  if (!data || data.length < 1) {
    return (
      <View
        style={[
          styles.chartVisualizationContainer,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ThemedText>{i18n.t("stressMonitor.noData")}</ThemedText>
      </View>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    x: item.time,
    y: item.stress,
  }));

  const yDomain: [number, number] = [0, 4];
  const xDomain: [number, number] = [
    chartData[0].x,
    chartData[chartData.length - 1].x,
  ];

  return (
    <View style={styles.chartVisualizationContainer}>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={["y"]}
        domain={{ y: yDomain, x: xDomain }}
        domainPadding={{ left: 20, right: 20, top: 10, bottom: 10 }}
        axisOptions={{
          font,
          labelColor: themedTextColor,
          lineColor: {
            grid: { x: "transparent", y: themedGridColor },
            frame: "transparent",
          },
          tickCount: {
            x: Math.min(chartData.length > 1 ? chartData.length : 1, 4),
            y: 5,
          },
          formatXLabel: (value) => {
            const point = chartData.find((p) => p.x === value);
            return point ? point.timestamp : "";
          },
          formatYLabel: (value) => `${Math.round(value as number)}`,
        }}
      >
        {({ points, chartBounds }) => {
          const chartWidth = chartBounds.right - chartBounds.left;
          const chartHeight = chartBounds.bottom - chartBounds.top;

          return (
            <>
              {chartData.length > 1 && (
                <Line
                  points={points.y}
                  color={themedLineColor}
                  strokeWidth={2}
                  curveType="natural"
                />
              )}
              <Scatter
                points={points.y}
                color={themedScatterColor}
                radius={3}
              />
              <View
                style={{
                  position: "absolute",
                  left: chartBounds.left,
                  top: Math.max(
                    chartBounds.top,
                    Math.min(
                      chartBounds.bottom,
                      chartBounds.bottom -
                        (currentStress / yDomain[1]) * chartHeight
                    )
                  ),
                  height: 2,
                  backgroundColor: getStressColor(currentStress),
                  opacity: 0.8,
                  width: chartWidth,
                }}
              />
            </>
          );
        }}
      </CartesianChart>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chartOuterContainer: {
    minHeight: 180,
    marginTop: 10,
  },
  chartVisualizationContainer: {
    height: 150,
  },
});
