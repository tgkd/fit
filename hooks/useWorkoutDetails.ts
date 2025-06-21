import { WorkoutActivityType } from "@kingstinct/react-native-healthkit";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { getWorkoutTypeIcon } from "@/components/workouts";
import { formatFullDate, formatTime } from "@/lib/formatters";
import { fetchWorkoutHeartRateData, WorkoutHeartRateData } from "@/lib/health/workouts";
import { getWorkoutConfig, WorkoutData } from "@/lib/workouts/config";

export interface WorkoutDetailsHookResult {
  workout: WorkoutData;
  config: ReturnType<typeof getWorkoutConfig>;
  dateTimeRange: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for managing workout details screen data and side effects
 * Handles parameter parsing, heart rate data fetching, and navigation setup
 */
export const useWorkoutDetails = (): WorkoutDetailsHookResult => {
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const [heartRateData, setHeartRateData] = useState<WorkoutHeartRateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse and validate URL parameters
  const { workoutDate, workoutEndDate, workoutDuration, workoutType, workoutId, workoutCalories } = useMemo(() => {
    try {
      const date = new Date(params.date as string);
      const duration = parseInt(params.duration as string, 10);
      const type = parseInt(params.type as string, 10) as WorkoutActivityType;
      const id = params.id as string;
      const calories = parseInt(params.calories as string, 10);

      if (isNaN(date.getTime()) || isNaN(duration) || isNaN(type) || isNaN(calories)) {
        throw new Error("Invalid workout parameters");
      }

      const endDate = new Date(date.getTime() + (duration * 60 * 1000));

      return {
        workoutDate: date,
        workoutEndDate: endDate,
        workoutDuration: duration,
        workoutType: type,
        workoutId: id,
        workoutCalories: calories,
      };
    } catch (err) {
      console.error("Failed to parse workout parameters:", err);
      return {
        workoutDate: new Date(),
        workoutEndDate: new Date(),
        workoutDuration: 0,
        workoutType: WorkoutActivityType.other,
        workoutId: "",
        workoutCalories: 0,
      };
    }
  }, [params.date, params.duration, params.type, params.id, params.calories]);

  // Construct workout data object
  const workout: WorkoutData = useMemo(() => ({
    id: workoutId,
    type: workoutType,
    duration: workoutDuration,
    date: workoutDate,
    calories: workoutCalories,
    // TODO: Calculate distance from HealthKit data based on workout type
    distance: workoutType === WorkoutActivityType.tennis ? undefined : 3.5,
    // Heart rate data from HealthKit
    averageHeartRate: heartRateData?.averageHeartRate ?? undefined,
    maxHeartRate: heartRateData?.maxHeartRate ?? undefined,
    minHeartRate: heartRateData?.minHeartRate ?? undefined,
    heartRateSamples: heartRateData?.heartRateSamples || [],
    // TODO: Calculate pace from HealthKit data
    averagePace: 25.97,
  }), [
    workoutId,
    workoutType,
    workoutDuration,
    workoutDate,
    workoutCalories,
    heartRateData
  ]);

  // Get workout configuration for metrics display
  const config = useMemo(() => getWorkoutConfig(workout.type), [workout.type]);

  // Format date and time range for display
  const dateTimeRange = useMemo(() => {
    const startDate = formatFullDate(workout.date);
    const startTime = formatTime(workout.date);
    const endTime = formatTime(workoutEndDate);
    return `${startDate} ${startTime} - ${endTime}`;
  }, [workout.date, workoutEndDate]);

  // Fetch heart rate data from HealthKit
  useEffect(() => {
    const loadHeartRateData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const hrData = await fetchWorkoutHeartRateData(workoutDate, workoutEndDate);
        setHeartRateData(hrData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load heart rate data";
        console.error("Failed to load heart rate data:", err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadHeartRateData();
  }, [workoutDate, workoutEndDate]);

  // Set navigation title with workout icon and date
  useEffect(() => {
    const day = workout.date.getDate().toString();
    const month = workout.date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const navTitle = `${getWorkoutTypeIcon(workout.type)} ${day} ${month}`;

    navigation.setOptions({
      title: navTitle,
    });
  }, [navigation, workout.date, workout.type]);

  return {
    workout,
    config,
    dateTimeRange,
    isLoading,
    error,
  };
};
