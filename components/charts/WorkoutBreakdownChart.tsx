import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import i18n from "@/lib/i18n";
import { LinearGradient, vec } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Bar, CartesianChart } from "victory-native";

interface WorkoutTypeData {
  type: string;
  count: number;
  color: string;
}

interface WorkoutBreakdownChartProps {
  data: Record<string, number>;
  title: string;
  height?: number;
}

export function WorkoutBreakdownChart({
  data,
  title,
  height = 180,
}: WorkoutBreakdownChartProps) {
  const textSecondary = useThemeColor({}, "textSecondary");

  // Transform data for the chart and assign colors
  const colors = [
    "#8B5CF6",
    "#06B6D4",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5A2B",
  ];
  const chartData: WorkoutTypeData[] = Object.entries(data)
    .map(([type, count], index) => ({
      type: type.replace(/([A-Z])/g, " $1").trim(),
      count: count as number,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.count - a.count) // Sort by count descending
    .slice(0, 6); // Limit to top 6 workout types

  // Prepare data for victory chart
  const victoryData = chartData.map((item, index) => ({
    index: index + 1,
    count: item.count,
    type: item.type,
    color: item.color,
  }));

  const maxCount = Math.max(...victoryData.map((d) => d.count));
  const yMax = maxCount * 1.1;

  // Calculate dynamic bar width based on number of bars
  const dynamicBarWidth = victoryData.length === 2 
    ? 80 
    : Math.min(60, Math.max(20, 240 / victoryData.length));

  if (victoryData.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText type="defaultSemiBold" size="md">
          {title}
        </ThemedText>
        <View style={[styles.emptyContainer, { height }]}>
          <ThemedText type="secondary" size="sm">
            {i18n.t("strainScreen.noWorkoutData")}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" size="md">
        {title}
      </ThemedText>

      <View style={[styles.chartContainer, { height }]}>
        <CartesianChart
          data={victoryData}
          xKey="index"
          yKeys={["count"]}
          domainPadding={{ left: 80, right: 40 }}
          domain={{ y: [0, yMax] }}
          xAxis={{
            tickCount: victoryData.length,
            labelColor: textSecondary,
            lineWidth: 0,
            formatXLabel: (value) => {
              const dataPoint = victoryData[value - 1];
              if (!dataPoint) return "";
              return dataPoint.type.length > 8
                ? dataPoint.type.substring(0, 8) + "..."
                : dataPoint.type;
            },
          }}
          yAxis={[
            {
              yKeys: ["count"],
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
            <Bar
              points={points.count}
              chartBounds={chartBounds}
              animate={{ type: "spring", damping: 15, stiffness: 150 }}
              barCount={victoryData.length}
              barWidth={dynamicBarWidth}
              roundedCorners={{
                topLeft: 4,
                topRight: 4,
              }}
            >
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, height)}
                colors={["#10B981", "#10B98150"]}
              />
            </Bar>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  chartContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    padding: 4,
  },
  emptyContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});
