import {
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
} from "@kingstinct/react-native-healthkit";
import { ActivitySample, WorkoutStats } from "./types";
import { getCurrentDateRanges, getDurationMinutes } from "./utils";

// Constants from original healthStats.ts
export const ACTIVITY_MULTIPLIERS = {
  LOW_INTENSITY: 0.9, // < 4 METs
  MODERATE_INTENSITY: 1.1, // 4-7 METs
  HIGH_INTENSITY: 1.4, // > 7 METs
};

// Interface for raw workout data from HealthKit
export interface HealthKitWorkout {
  uuid: string;
  workoutActivityType: number;
  startDate: string;
  endDate: string;
  totalEnergyBurned?: {
    quantity: number;
  };
}

// Interface for heart rate data during a workout
export interface WorkoutHeartRateData {
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  minHeartRate: number | null;
  heartRateSamples: {
    timestamp: Date;
    value: number;
  }[];
}

/**
 * Fetch workout and exercise statistics using Apple's native ring calculations
 * - Exercise minutes from HealthKit's appleExerciseTime
 * - Stand hours from HealthKit's appleStandTime
 * - Move calories (active energy burned)
 * - Raw calorie samples
 * - Raw workout samples (last 30 days for workouts screen)
 */
export const fetchWorkoutStats = async (): Promise<WorkoutStats> => {
  const { now, startOfToday } = getCurrentDateRanges();

  // Get active calories for today (Move ring)
  const caloriesSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.activeEnergyBurned,
    { from: startOfToday, to: now }
  );

  const moveKcal = caloriesSamples.reduce(
    (sum: number, record) => sum + record.quantity,
    0
  );

  // Use HealthKit's exercise time directly (Exercise ring)
  const exerciseTimeStat = await queryStatisticsForQuantity(
    HKQuantityTypeIdentifier.appleExerciseTime,
    [HKStatisticsOptions.cumulativeSum],
    startOfToday,
    now
  );
  const exerciseMins = Math.floor(exerciseTimeStat?.sumQuantity?.quantity || 0);

  // Use HealthKit's stand hours directly (Stand ring)
  const standHoursStat = await queryStatisticsForQuantity(
    HKQuantityTypeIdentifier.appleStandTime,
    [HKStatisticsOptions.cumulativeSum],
    startOfToday,
    now
  );
  const standHours = Math.min(12, Math.floor(standHoursStat?.sumQuantity?.quantity || 0));

  // Get workout samples from last 30 days for workouts screen
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const allWorkouts = await queryWorkoutSamples({
    from: thirtyDaysAgo,
    to: now,
  });

  return {
    exerciseMins,
    standHours,
    moveKcal,
    rawCalories: caloriesSamples,
    workouts: allWorkouts,
  };
};

/**
 * Calculate exercise minutes (≥3 METs) - Apple Ring calculation
 */
export const calculateExerciseMins = (activities: ActivitySample[]): number => {
  let mins = 0;
  activities.forEach((a) => {
    const durationMin = getDurationMinutes(a.start, a.end);
    if (a.mets >= 3) mins += durationMin;
  });
  return parseFloat(mins.toFixed(0));
};

/**
 * Calculate stand hours - Apple Ring calculation
 */
export const calculateStandHours = (hourlyStepCounts: number[]): number => {
  return hourlyStepCounts.filter((count) => count >= 1).length;
};

/**
 * Fetch heart rate data for a specific workout session
 * @param startDate - Workout start date
 * @param endDate - Workout end date
 * @returns Heart rate statistics and samples for the workout period
 */
export const fetchWorkoutHeartRateData = async (
  startDate: Date,
  endDate: Date
): Promise<WorkoutHeartRateData> => {
  try {
    // Add 5 minutes buffer before and after workout to catch related heart rate data
    const startWithBuffer = new Date(startDate.getTime() - 5 * 60 * 1000);
    const endWithBuffer = new Date(endDate.getTime() + 5 * 60 * 1000);

    // Query heart rate samples during the workout period
    const heartRateSamples = await queryQuantitySamples(
      HKQuantityTypeIdentifier.heartRate,
      {
        from: startWithBuffer,
        to: endWithBuffer,
        unit: "count/min",
        limit: 1000, // Limit to avoid performance issues
      }
    );

    if (heartRateSamples.length === 0) {
      return {
        averageHeartRate: null,
        maxHeartRate: null,
        minHeartRate: null,
        heartRateSamples: [],
      };
    }

    // Extract heart rate values
    const hrValues = heartRateSamples.map(sample => sample.quantity);

    // Calculate statistics
    const averageHeartRate = Math.round(
      hrValues.reduce((sum, hr) => sum + hr, 0) / hrValues.length
    );
    const maxHeartRate = Math.max(...hrValues);
    const minHeartRate = Math.min(...hrValues);

    // Format samples for chart display
    const formattedSamples = heartRateSamples.map(sample => ({
      timestamp: new Date(sample.startDate),
      value: sample.quantity,
    }));

    return {
      averageHeartRate,
      maxHeartRate,
      minHeartRate,
      heartRateSamples: formattedSamples,
    };
  } catch (error) {
    console.error("Failed to fetch workout heart rate data:", error);
    return {
      averageHeartRate: null,
      maxHeartRate: null,
      minHeartRate: null,
      heartRateSamples: [],
    };
  }
};
