import { Line, LinearGradient, vec } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { Bar, CartesianChart, useChartPressState } from "victory-native";

import { ThemedText } from "@/components/ThemedText";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useThemeColor } from "@/hooks/useThemeColor";
import { MAX_STRAIN } from "@/lib/health/strain";
import { DailyStrainData } from "@/lib/health/types";

interface StrainBarChartProps {
  data: DailyStrainData[];
  title: string;
  height?: number;
}

export function StrainBarChart({ data, title, height }: StrainBarChartProps) {
  const textSecondary = useThemeColor({}, "textSecondary");
  const { state, isActive } = useChartPressState({ x: 0, y: { strain: 0 } });

  // Tooltip positioning
  const tooltipX = useSharedValue(0);
  const tooltipY = useSharedValue(0);

  useAnimatedReaction(
    () => ({ x: state.x.position, y: state.y.strain.position }),
    ({ x, y }) => {
      tooltipX.value = x.value;
      tooltipY.value = y.value;
    }
  );

  // Calculate responsive height based on data length
  const chartHeight =
    height || Math.max(180, Math.min(250, data.length * 15 + 120));

  // Transform data for the chart
  const chartData = data.map((item, index) => ({
    day: index + 1,
    strain: item.strainScore,
    date: item.date,
    category: item.category,
  }));

  // Calculate domain for better visualization
  const maxStrain = Math.max(...chartData.map((d) => d.strain));
  const yMax = Math.min(Math.max(maxStrain * 1.1, 20), MAX_STRAIN);

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" size="md">
        {title}
      </ThemedText>

      <View style={[styles.chartContainer, { height: chartHeight }]}>
        <CartesianChart
          data={chartData}
          xKey="day"
          yKeys={["strain"]}
          domainPadding={{ left: 12, right: 24 }}
          domain={{ y: [0, yMax] }}
          chartPressState={state}
          xAxis={{
            tickCount: Math.min(chartData.length, 7),
            labelColor: textSecondary,
            lineWidth: 0,
            formatXLabel: (value) => {
              const dataPoint = chartData[value - 1];
              if (!dataPoint) return "";
              return dataPoint.date.toLocaleDateString("en-US", {
                month: "numeric",
                day: "numeric",
              });
            },
          }}
          yAxis={[
            {
              yKeys: ["strain"],
              labelColor: textSecondary,
              lineWidth: 1,
              lineColor: "rgba(142, 142, 147, 0.2)",
              tickCount: 3,
              formatYLabel: (value) => Math.round(value).toString(),
            },
          ]}
          frame={{
            lineWidth: 0,
          }}
        >
          {({ points, chartBounds }) => (
            <>
              <Bar
                points={points.strain}
                chartBounds={chartBounds}
                animate={{ type: "spring", damping: 15, stiffness: 150 }}
                roundedCorners={{
                  topLeft: 4,
                  topRight: 4,
                }}
              >
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, chartHeight)}
                  colors={["#F59E0B", "#F59E0B50"]} // Amber gradient for strain
                />
              </Bar>
              {isActive && (
                <Line
                  p1={vec(tooltipX.value, chartBounds.bottom)}
                  p2={vec(tooltipX.value, chartBounds.top)}
                  color={textSecondary}
                  strokeWidth={1}
                  opacity={0.2}
                />
              )}
            </>
          )}
        </CartesianChart>
      </View>

      <ChartTooltip
        isActive={isActive}
        tooltipX={tooltipX}
        date={chartData[
          Math.round(state.x.value.value) - 1
        ]?.date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
        value={Math.round(state.y.strain.value.value)}
        category={chartData[Math.round(state.x.value.value) - 1]?.category}
        label="Strain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    position: "relative",
  },
  chartContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
  },
});
