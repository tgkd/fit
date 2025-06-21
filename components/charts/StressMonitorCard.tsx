import { LinearGradient, useFont, vec } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Area, CartesianChart } from "victory-native";

// import hiFont from "@/assets/fonts/Hikasami-Regular.ttf";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";
import type { HealthData, StressChartDataPoint } from "@/lib/health/types";
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
        <View>
          <ThemedText size="md">{i18n.t("stressMonitor.title")}</ThemedText>
          <ThemedText size="xs" type="secondary">Last 24 Hours</ThemedText>
        </View>
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
  const font = useFont(require("@/assets/fonts/Hikasami-Regular.ttf"), 12);
  const themedTextColor = useThemeColor({}, "text");
  const themedLineColor = useThemeColor({}, "tint");
  const themedGridColor = useThemeColor({}, "textSecondary");

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

  // Calculate domain from actual data
  const xValues = chartData.map((p) => p.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const xDomain: [number, number] = [minX, maxX];

  console.log("🔍 Chart Debug - Data points:", chartData.length);
  console.log("🔍 Chart Debug - X domain:", xDomain);
  console.log("🔍 Chart Debug - First few data points:", chartData.slice(0, 3));

  return (
    <View style={styles.chartVisualizationContainer}>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={["y"]}
        domain={{ y: yDomain, x: xDomain }}
        axisOptions={{
          font,
          labelColor: themedTextColor,
          lineColor: {
            grid: { x: "transparent", y: themedGridColor },
            frame: "transparent",
          },
          tickCount: {
            x: 3, // Show 3 time points for better readability
            y: 4,
          },
          formatXLabel: (value) => {
            const date = new Date(value);
            return date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: undefined,
            });
          },
          formatYLabel: (value) => `${Math.round(value as number)}`,
        }}
      >
        {({ points, chartBounds, canvasSize, yScale, yTicks }) => (
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
    alignItems: "flex-start", // Changed from "center" to accommodate multiple lines
    marginBottom: 8,
  },
  chartOuterContainer: {
    minHeight: 180,
    marginTop: 10,
  },
  chartVisualizationContainer: {
    height: 180,
  },
});
