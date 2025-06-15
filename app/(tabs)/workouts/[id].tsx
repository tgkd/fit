import { HKWorkoutActivityType } from "@kingstinct/react-native-healthkit";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedScrollView } from "@/components/ui/ThemedScrollView";
import { getWorkoutTypeIcon, WorkoutDetailsChart } from "@/components/workouts";
import { formatFullDate, formatTime } from "@/lib/formatters";
import { fetchWorkoutHeartRateData, WorkoutHeartRateData } from "@/lib/health/workouts";
import { getWorkoutConfig, localizedWorkoutName, WorkoutData } from "@/lib/workouts/config";

export default function WorkoutDetailsScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [heartRateData, setHeartRateData] = useState<WorkoutHeartRateData | null>(null);

  // Memoize date calculations to prevent unnecessary re-renders
  const { workoutDate, workoutEndDate, workoutDuration } = useMemo(() => {
    const date = new Date(params.date as string);
    const duration = parseInt(params.duration as string);
    const endDate = new Date(date.getTime() + (duration * 60 * 1000));

    return {
      workoutDate: date,
      workoutEndDate: endDate,
      workoutDuration: duration,
    };
  }, [params.date, params.duration]);

  // Parse workout data from params
  const workout: WorkoutData = {
    id: params.id as string,
    type: parseInt(params.type as string) as HKWorkoutActivityType,
    duration: workoutDuration,
    date: workoutDate,
    calories: parseInt(params.calories as string),
    // Distance only for relevant activities
    distance: params.type === HKWorkoutActivityType.tennis.toString() ? undefined : 3.5,
    // Heart rate data will be loaded from HealthKit
    averageHeartRate: heartRateData?.averageHeartRate ?? undefined,
    maxHeartRate: heartRateData?.maxHeartRate ?? undefined,
    minHeartRate: heartRateData?.minHeartRate ?? undefined,
    heartRateSamples: heartRateData?.heartRateSamples || [],
    averagePace: 25.97, // 25:58 per km - TODO: calculate from HealthKit data
  };

  // Fetch heart rate data from HealthKit
  useEffect(() => {
    const loadHeartRateData = async () => {
      try {
        const hrData = await fetchWorkoutHeartRateData(workoutDate, workoutEndDate);
        setHeartRateData(hrData);
      } catch (error) {
        console.error("Failed to load heart rate data:", error);
      }
    };

    loadHeartRateData();
  }, [workoutDate, workoutEndDate]);

  const config = getWorkoutConfig(workout.type);

  // Format date and time range
  const startDate = formatFullDate(workout.date);
  const startTime = formatTime(workout.date);
  const endTime = formatTime(new Date(workout.date.getTime() + (workout.duration * 60 * 1000)));
  const dateTimeRange = `${startDate} ${startTime} - ${endTime}`;

  // Create navigation title with emoji and date
  const day = workout.date.getDate().toString();
  const month = workout.date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const navTitle = `${getWorkoutTypeIcon(workout.type)} ${day} ${month}`;

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({
      title: navTitle,
    });
  }, [navigation, navTitle]);

  return (
    <ThemedScrollView>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText type="title">
              {getWorkoutTypeIcon(workout.type)}&nbsp;
              {localizedWorkoutName(workout.type)}
            </ThemedText>
          </View>
          <ThemedText type="secondary">
            {dateTimeRange}
          </ThemedText>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {config.metrics.slice(0, 4).map((metric, index) => (
            <View key={metric.key} style={[
              styles.metricCard,
              index % 2 === 0 ? styles.leftMetric : styles.rightMetric,
              index < 2 ? styles.topMetric : styles.bottomMetric
            ]}>
              <ThemedText style={styles.metricValue}>
                {metric.getValue(workout)}
                {metric.unit && (
                  <ThemedText type="footnote" size="xs" style={styles.metricUnit}>
                    {metric.unit}
                  </ThemedText>
                )}
              </ThemedText>
              <ThemedText type="footnote" size="xs" style={styles.metricLabel}>
                {metric.label}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Heart Rate Chart */}
        <WorkoutDetailsChart workout={workout} />

        {/* Additional Metrics (if more than 4) */}
        {config.metrics.length > 4 && (
          <View style={styles.additionalMetrics}>
            {config.metrics.slice(4).map((metric) => (
              <View key={metric.key} style={styles.additionalMetricRow}>
                <ThemedText style={styles.additionalMetricLabel}>
                  {metric.label}
                </ThemedText>
                <ThemedText style={styles.additionalMetricValue}>
                  {metric.getValue(workout)}
                  {metric.unit && ` ${metric.unit}`}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </ThemedScrollView>
  );
}

const styles = StyleSheet.create({
  header: {},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  metricCard: {
    width: '50%',
    paddingHorizontal: 0,
    paddingVertical: 16,
  },
  leftMetric: {
    paddingRight: 12,
  },
  rightMetric: {
    paddingLeft: 12,
  },
  topMetric: {
    paddingBottom: 24,
  },
  bottomMetric: {
    paddingTop: 24,
  },
  metricValue: {
    fontSize: 48,
    fontWeight: '600',
    color: '#114',
    // lineHeight: 52,
    marginBottom: 4,
  },
  metricUnit: {
    color: '#333',
    fontWeight: '400',
  },
  metricLabel: {
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '400',
  },
  additionalMetrics: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  additionalMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  additionalMetricLabel: {
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  additionalMetricValue: {
    color: '#000000',
  },
});