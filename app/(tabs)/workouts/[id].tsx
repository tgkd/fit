import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { ThemedScrollView } from "@/components/ui/ThemedScrollView";
import { getWorkoutTypeIcon, WorkoutDetailsChart } from "@/components/workouts";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWorkoutDetails } from "@/hooks/useWorkoutDetails";
import { localizedWorkoutName } from "@/lib/workouts/config";

export default function WorkoutDetailsScreen() {
  const { workout, config, dateTimeRange, isLoading, error } =
    useWorkoutDetails();
  const cardBackground = useThemeColor({}, "cardBackground");

  if (error) {
    return (
      <ThemedScrollView>
        <ThemedText type="title">Error</ThemedText>
        <ThemedText type="secondary">{error}</ThemedText>
      </ThemedScrollView>
    );
  }

  if (isLoading) {
    return (
      <ThemedScrollView>
        <ThemedText type="title">Loading...</ThemedText>
      </ThemedScrollView>
    );
  }

  return (
    <ThemedScrollView safeAreaEdges={["bottom"]} paddingTop={16}>
      {/* Header Section */}
      <ThemedText type="title">
        {getWorkoutTypeIcon(workout.type)}&nbsp;
        {localizedWorkoutName(workout.type)}
      </ThemedText>
      <ThemedText type="secondary">{dateTimeRange}</ThemedText>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {config.metrics.slice(0, 4).map((metric) => (
          <View
            key={metric.key}
            style={[styles.metricCard, { backgroundColor: cardBackground }]}
          >
            <ThemedText type="monospace" size="xxl">
              {metric.getValue(workout)}
              {metric.unit && (
                <ThemedText type="secondary" size="xs">
                  {metric.unit}
                </ThemedText>
              )}
            </ThemedText>
            <ThemedText type="secondary" size="xs" style={styles.metricLabel}>
              {metric.label}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Heart Rate Chart */}
      <Card>
        <WorkoutDetailsChart workout={workout} />
      </Card>

      {/* Workout Details */}

      {/* Additional Metrics (if more than 4) */}
      {config.metrics.length > 4 ? (
        <Card>
          {config.metrics.slice(4).map((metric) => (
            <View key={metric.key} style={styles.additionalMetricRow}>
              <ThemedText
                type="secondary"
                size="xs"
                style={styles.additionalMetricLabel}
              >
                {metric.label}
              </ThemedText>
              <ThemedText type="defaultSemiBold">
                {metric.getValue(workout)}
                {metric.unit && ` ${metric.unit}`}
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : null}
    </ThemedScrollView>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    width: "47%",
    padding: 16,
    borderRadius: 12,
  },
  metricLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  additionalMetricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  additionalMetricLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
