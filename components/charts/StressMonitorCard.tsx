import { useFont } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { CartesianChart, Line, Scatter } from "victory-native";

import hiFont from "@/assets/fonts/Hikasami-Regular.ttf";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";
import type { HealthData, StressChartDataPoint } from "@/lib/health"; // Updated import
import i18n from "@/lib/i18n";

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

  if (!healthData || !healthData.stressChartDisplayData) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ThemedText>
          {healthData
            ? i18n.t("stressMonitor.noData")
            : i18n.t("stressMonitor.loadingData")}
        </ThemedText>
      </View>
    );
  }

  const {
    chartPlotData,
    currentStressForVisualization,
    yDomainForVisualization,
    xAxisDataType,
    lastUpdatedDisplay,
  } = healthData.stressChartDisplayData;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <ThemedText size="md">{i18n.t("stressMonitor.title")}</ThemedText>
        <IconSymbol name="chevron.right" size={16} color={iconColorSecondary} />
      </View>

      <ThemedText size="xs">
        {i18n.t("stressMonitor.lastUpdated", { time: lastUpdatedDisplay })}
      </ThemedText>

      <View style={styles.chartOuterContainer}>
        <StressVisualization
          data={chartPlotData}
          currentStress={currentStressForVisualization}
          yDomain={yDomainForVisualization}
          xAxisDataType={xAxisDataType}
        />
      </View>
    </TouchableOpacity>
  );
}

interface StressVisualizationProps {
  data: StressChartDataPoint[];
  currentStress: number;
  yDomain: [number, number];
  xAxisDataType: "hourly" | "daily";
}

function StressVisualization({
  data,
  currentStress,
  yDomain,
  xAxisDataType,
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
    // Ensure x is always a number (timestamp or index)
    x:
      typeof item.time === "number" ? item.time : new Date(item.time).getTime(),
    y: item.stress,
    originalTimestamp: item.timestamp, // Keep original for formatting
  }));

  // Ensure xDomain is correctly calculated based on actual data points
  const xValues = chartData.map((p) => p.x);
  const xDomain: [number, number] = [
    Math.min(...xValues),
    Math.max(...xValues),
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
            x: 2,
            y: 5,
          },
          formatXLabel: (value) => {
            const numValue = Number(value);
            const firstX = Math.min(...xValues);
            const lastX = Math.max(...xValues);
            if (Math.abs(numValue - firstX) <= Math.abs(numValue - lastX)) {
              return (chartData[0]?.originalTimestamp as string) || " ";
            } else {
              return (
                (chartData[chartData.length - 1]
                  ?.originalTimestamp as string) || " "
              );
            }
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
                      // Ensure currentStress is scaled against the correct yDomain max
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
  chartOuterContainer: {
    minHeight: 180,
    marginTop: 10,
  },
  chartVisualizationContainer: {
    height: 150,
  },
});
