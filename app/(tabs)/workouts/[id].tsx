import { HKWorkoutActivityType } from "@kingstinct/react-native-healthkit";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { getWorkoutTypeIcon } from "@/components/workouts";
import { formatFullDate, formatTime } from "@/lib/formatters";
import { WorkoutData, getWorkoutConfig, localizedWorkoutName } from "@/lib/workouts/config";

export default function WorkoutDetailsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  // Parse workout data from params with mock additional data
  const workout: WorkoutData = {
    id: params.id as string,
    type: parseInt(params.type as string) as HKWorkoutActivityType,
    duration: parseInt(params.duration as string),
    date: new Date(params.date as string),
    calories: parseInt(params.calories as string),
    // Mock additional data - in real app, this would come from HealthKit
    distance: params.type === HKWorkoutActivityType.tennis.toString() ? undefined : 3.5,
    averageHeartRate: 142,
    maxHeartRate: 199,
    minHeartRate: 139,
    averagePace: 25.97, // 25:58 per km
  };

  const config = getWorkoutConfig(workout.type);
  const workoutTypeName = HKWorkoutActivityType[workout.type];

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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 40,
  },
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