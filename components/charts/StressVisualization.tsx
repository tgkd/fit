import { LinearGradient, Path, useFont, vec } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, View } from "react-native";
import { CartesianChart, type PointsArray, useLinePath } from "victory-native";

import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import type { StressChartDataPoint } from "@/lib/health/types";
import i18n from "@/lib/i18n";

interface StressVisualizationProps {
  data: StressChartDataPoint[];
  yDomain: [number, number];
  height?: number;
  showXAxisTicks?: number;
}

export function StressVisualization({
  data,
  yDomain,
  height = 180,
  showXAxisTicks = 3,
}: StressVisualizationProps) {
  const font = useFont(require("@/assets/fonts/Hikasami-Regular.ttf"), 12);
  const themedTextColor = useThemeColor({}, "text");
  const themedGridColor = useThemeColor({}, "textSecondary");

  if (!data || data.length < 1) {
    return (
      <View
        style={[
          styles.chartContainer,
          { height, justifyContent: "center", alignItems: "center" },
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

  return (
    <View style={[styles.chartContainer, { height }]}>
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
            x: showXAxisTicks,
            y: 4,
          },
          formatXLabel: (value) => {
            return new Date(value).toLocaleTimeString([], {
              hour: "2-digit",
            });
          },
          formatYLabel: (value) => `${Math.round(value as number)}`,
        }}
      >
        {({ points }) => <StressLine points={points.y} height={height} />}
      </CartesianChart>
    </View>
  );
}

interface StressLineProps {
  points: PointsArray;
  height: number;
}

function StressLine({ points, height }: StressLineProps) {
  const { path } = useLinePath(points);

  return (
    <Path path={path} style="stroke" strokeWidth={2}>
      <LinearGradient
        start={vec(0, 0)}
        end={vec(0, height)}
        colors={["#f67300", "#00ff5e"]}
      />
    </Path>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    flex: 1,
  },
});
