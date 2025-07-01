import { LinearGradient, Path, useFont, vec } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Area,
  CartesianChart,
  useLinePath,
  type PointsArray,
} from "victory-native";

import { ThemedText } from "@/components/ThemedText";
import { getWorkoutTypeIcon } from "@/components/workouts/utils";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import type { StressChartDataPoint } from "@/lib/health/types";
import i18n from "@/lib/i18n";
import { WorkoutActivityType } from "@kingstinct/react-native-healthkit";

interface ActivityBlock {
  type: WorkoutActivityType | "sleep";
  startTime: number;
  endTime: number;
}

function addWorkoutHighlighting(
  chartData: { x: number; y: number }[],
  activities: ActivityBlock[],
  yDomain: [number, number]
): {
  combinedData: any[];
  workoutYKeys: string[];
  validActivities: ActivityBlock[];
} {
  const [, maxY] = yDomain;
  const workoutYKeys: string[] = [];
  const validActivities: ActivityBlock[] = [];

  const combinedData = chartData.map((point) => ({ ...point }));

  const chartMinX = Math.min(...chartData.map((p) => p.x));
  const chartMaxX = Math.max(...chartData.map((p) => p.x));

  activities.forEach((activity, index) => {
    const activityOverlaps =
      activity.endTime > chartMinX && activity.startTime < chartMaxX;

    if (activityOverlaps) {
      const yKey = `workout_${index}`;
      workoutYKeys.push(yKey);
      validActivities.push(activity);

      combinedData.forEach((point) => {
        const isInWorkout =
          point.x >= activity.startTime && point.x <= activity.endTime;
        (point as any)[yKey] = isInWorkout ? maxY : 0;
      });
    }
  });

  return { combinedData, workoutYKeys, validActivities };
}

function createActivityBlocks(
  workouts: {
    type: WorkoutActivityType;
    id: string;
    startDate: Date;
    endDate: Date;
  }[] = [],
  _sleepData?: { asleepStart: Date; asleepEnd: Date } | null
): ActivityBlock[] {
  return workouts.map((workout) => ({
    type: workout.type,
    startTime: workout.startDate.getTime(),
    endTime: workout.endDate.getTime(),
  }));
}

interface StressVisualizationProps {
  data: StressChartDataPoint[];
  yDomain: [number, number];
  height?: number;
  showXAxisTicks?: number;
  workouts?: {
    type: WorkoutActivityType;
    id: string;
    startDate: Date;
    endDate: Date;
  }[];
}

export function StressVisualization({
  data,
  yDomain,
  height = 180,
  showXAxisTicks = 3,
  workouts = [],
}: StressVisualizationProps) {
  const font = useFont(require("@/assets/fonts/Hikasami-Regular.ttf"), 14);
  const themedTextColor = useThemeColor({}, "text");
  const themedGridColor = useThemeColor({}, "textSecondary");
  const activities = createActivityBlocks(workouts, null);

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
    x:
      typeof item.time === "number" ? item.time : new Date(item.time).getTime(),
    y: item.stress,
    originalTimestamp: item.timestamp,
  }));

  const xValues = chartData.map((p) => p.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const xDomain: [number, number] = [minX, maxX];

  const { combinedData, workoutYKeys, validActivities } =
    addWorkoutHighlighting(chartData, activities, yDomain);

  return (
    <View style={[styles.chartContainer, { height }]}>
      {validActivities.map((activity, index) => {
        const activityX = (activity.startTime + activity.endTime) / 2;

        const xRange = maxX - minX;
        const relativeX = xRange > 0 ? (activityX - minX) / xRange : 0.5;

        const activityIcon =
          activity.type === "sleep"
            ? "😴"
            : getWorkoutTypeIcon(activity.type as WorkoutActivityType);

        return (
          <ThemedText
            key={`workout_${index}_icon`}
            style={[
              styles.workoutIconLabel,
              { left: `${Math.max(0, Math.min(90, relativeX * 100))}%` },
            ]}
          >
            {activityIcon}
          </ThemedText>
        );
      })}

      <CartesianChart
        data={combinedData}
        xKey="x"
        yKeys={["y", ...workoutYKeys]}
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
        {({ points, chartBounds }) => (
          <>
            {workoutYKeys.map((yKey) => {
              const workoutPoints = (points as any)[yKey];
              if (!workoutPoints) return null;

              return (
                <Area
                  key={yKey}
                  points={workoutPoints}
                  y0={chartBounds.bottom}
                  curveType="step"
                  animate={{ type: "timing", duration: 300 }}
                >
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, height)}
                    colors={[
                      "rgba(135, 206, 235, 0.3)",
                      "rgba(135, 206, 235, 0.1)",
                    ]}
                  />
                </Area>
              );
            })}

            <StressLine points={points.y} height={height} />
          </>
        )}
      </CartesianChart>
    </View>
  );
}

interface StressLineProps {
  points: PointsArray;
  height: number;
}

function StressLine({ points, height }: StressLineProps) {
  const { path } = useLinePath(points, { curveType: "monotoneX" });

  return (
    <Path path={path} style="stroke" strokeWidth={3}>
      <LinearGradient
        start={vec(0, 0)}
        end={vec(0, height)}
        colors={[Colors.charts.negative, Colors.charts.positive]}
      />
    </Path>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    flex: 1,
  },
  workoutIconLabel: {
    position: "absolute",
    top: 6,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 16,
    textAlign: "center",
    minWidth: 24,
    minHeight: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
