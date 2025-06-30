import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import i18n from "@/lib/i18n";

interface WorkoutTypeData {
  type: string;
  count: number;
  color: string;
}

interface WorkoutRowProps {
  type: string;
  count: number;
  totalCount: number;
  color: string;
}

function WorkoutRow({ type, count, totalCount, color }: WorkoutRowProps) {
  const barHeight = 12;
  const percentage = (count / totalCount) * 100;
  const [barWidth, setBarWidth] = useState(300);

  return (
    <View style={styles.workoutRow}>
      <View style={styles.workoutHeader}>
        <ThemedText type="defaultSemiBold" size="sm">
          {type}
        </ThemedText>
        <ThemedText type="defaultSemiBold" size="sm">
          {count} ({percentage.toFixed(0)}%)
        </ThemedText>
      </View>
      <View
        style={styles.barContainer}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      >
        <Canvas style={styles.fullWidthBar}>
          <Path
            path={Skia.Path.Make().addRRect({
              rect: { x: 0, y: 0, width: barWidth, height: barHeight },
              rx: 6,
              ry: 6,
            })}
            color={Colors.charts.chartBackground}
          />
          <Path
            path={Skia.Path.Make().addRRect({
              rect: {
                x: 0,
                y: 0,
                width: (percentage / 100) * barWidth,
                height: barHeight,
              },
              rx: 6,
              ry: 6,
            })}
            color={color}
          />
        </Canvas>
      </View>
    </View>
  );
}

interface WorkoutBreakdownChartProps {
  data: Record<string, number>;
  title: string;
}

const colors = [
  Colors.charts.primary,
  Colors.charts.positive,
  Colors.charts.strain,
  Colors.charts.sleepAccent,
  Colors.charts.sleepWarm,
  Colors.charts.negative,
];

export function WorkoutBreakdownChart({
  data,
  title,
}: WorkoutBreakdownChartProps) {
  const borderColor = useThemeColor({}, "border");

  const chartData: WorkoutTypeData[] = Object.entries(data)
    .map(([type, count], index) => ({
      type:
        type && type.trim() !== ""
          ? type.replace(/([A-Z])/g, " $1").trim()
          : "Unknown Workout",
      count: count as number,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.count - a.count) // Sort by count descending
    .slice(0, 6); // Limit to top 6 workout types

  if (chartData.length === 0) {
    return (
      <>
        <ThemedText type="defaultSemiBold" size="md">
          {title}
        </ThemedText>
        <View style={styles.emptyContainer}>
          <ThemedText type="secondary" size="sm">
            {i18n.t("strainScreen.noWorkoutData")}
          </ThemedText>
        </View>
      </>
    );
  }

  const totalCount = chartData.reduce((sum, d) => sum + d.count, 0);

  return (
    <>
      <ThemedText type="defaultSemiBold" size="md">
        {title}
      </ThemedText>

      {chartData.map((item, index) => (
        <React.Fragment key={item.type}>
          <WorkoutRow
            type={item.type}
            count={item.count}
            totalCount={totalCount}
            color={item.color}
          />
          {index < chartData.length - 1 && (
            <View style={[styles.divider, { backgroundColor: borderColor }]} />
          )}
        </React.Fragment>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  workoutRow: {
    paddingVertical: 8,
    gap: 8,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barContainer: {
    width: "100%",
  },
  fullWidthBar: {
    width: "100%",
    height: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
