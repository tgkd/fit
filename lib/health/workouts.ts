import { WorkoutSample } from "@kingstinct/react-native-healthkit";
import {
  queryQuantitySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples
} from "@kingstinct/react-native-healthkit/lib/commonjs/index.ios.js";

import { WorkoutData } from "../workouts/config";
import { ActivitySample, WorkoutStats } from "./types";
import {
  getCurrentDateRanges,
  getDateRanges,
  getDurationMinutes,
} from "./utils";

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

// New interfaces for workout processing
export interface WorkoutPeriodStats {
  totalWorkouts: number;
  totalDurationMinutes: number;
  totalCalories: number;
}

export interface ProcessedWorkoutData {
  allWorkouts: WorkoutData[];
  last7DaysWorkouts: WorkoutData[];
  monthStats: WorkoutPeriodStats;
}

/**
 * Fetch workout and exercise statistics using Apple's native ring calculations for a specific date
 * - Exercise minutes from HealthKit's appleExerciseTime
 * - Stand hours from HealthKit's appleStandTime
 * - Move calories (active energy burned)
 * - Raw calorie samples
 * - Raw workout samples (last 30 days for workouts screen)
 */
export const fetchWorkoutStats = async (
  targetDate?: Date
): Promise<WorkoutStats> => {
  // Get date ranges for the target date
  let startDate: Date, endDate: Date;
  if (targetDate) {
    const ranges = getDateRanges(targetDate);
    startDate = ranges.startOfTargetDay;
    endDate = ranges.endOfTargetDay;
  } else {
    const ranges = getCurrentDateRanges();
    startDate = ranges.startOfToday;
    endDate = ranges.now;
  }

  // Get active calories for the target date (Move ring)
  const caloriesSamples = await queryQuantitySamples(
    "HKQuantityTypeIdentifierActiveEnergyBurned",
    { filter: { startDate, endDate } }
  );

  const moveKcal = caloriesSamples.reduce(
    (sum: number, record) => sum + record.quantity,
    0
  );

  // Use HealthKit's exercise time directly (Exercise ring)
  const exerciseTimeStat = await queryStatisticsForQuantity(
    "HKQuantityTypeIdentifierAppleExerciseTime",
    ["cumulativeSum"],
    {
      filter: { startDate, endDate },
    }
  );
  const exerciseMins = Math.floor(exerciseTimeStat?.sumQuantity?.quantity || 0);

  // Use HealthKit's stand hours directly (Stand ring)
  const standHoursStat = await queryStatisticsForQuantity(
    "HKQuantityTypeIdentifierAppleStandTime",
    ["cumulativeSum"],
    {
      filter: { startDate, endDate },
    }
  );
  const standHours = Math.min(
    12,
    Math.floor(standHoursStat?.sumQuantity?.quantity || 0)
  );

  // Get workout samples from last 30 days for workouts screen
  // Note: For workouts list, we always get the last 30 days relative to the current date
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const allWorkouts = await queryWorkoutSamples({
    filter: {
      startDate: thirtyDaysAgo,
      endDate: now,
    },
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
      "HKQuantityTypeIdentifierHeartRate",
      {
        filter: {
          startDate: startWithBuffer,
          endDate: endWithBuffer,
        },
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
    const hrValues = heartRateSamples.map((sample) => sample.quantity);

    // Calculate statistics
    const averageHeartRate = Math.round(
      hrValues.reduce((sum, hr) => sum + hr, 0) / hrValues.length
    );
    const maxHeartRate = Math.max(...hrValues);
    const minHeartRate = Math.min(...hrValues);

    // Format samples for chart display
    const formattedSamples = heartRateSamples.map((sample) => ({
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

/**
 * Convert HealthKit workout data to our WorkoutData format
 */
//HKWorkout<EnergyUnit, LengthUnit>[]
export const convertHealthKitWorkouts = (
  healthKitWorkouts: readonly WorkoutSample[]
): WorkoutData[] => {
  if (!healthKitWorkouts || healthKitWorkouts.length === 0) {
    return [];
  }

  return healthKitWorkouts.map((workout, index) => {
    const duration =
      (new Date(workout.endDate).getTime() -
        new Date(workout.startDate).getTime()) /
      (1000 * 60); // duration in minutes

    return {
      id: workout.uuid || `workout-${index}`,
      type: workout.workoutActivityType,
      duration: Math.round(duration),
      date: new Date(workout.startDate),
      calories: workout.totalEnergyBurned?.quantity || 0,
    };
  });
};

/**
 * Filter workouts by date range
 */
export const filterWorkoutsByDateRange = (
  workouts: WorkoutData[],
  startDate: Date,
  endDate?: Date
): WorkoutData[] => {
  const end = endDate || new Date();

  return workouts.filter(
    (workout) => workout.date >= startDate && workout.date <= end
  );
};

/**
 * Get workouts for the last N days, sorted by date (newest first)
 */
export const getWorkoutsForLastDays = (
  workouts: WorkoutData[],
  days: number
): WorkoutData[] => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return filterWorkoutsByDateRange(workouts, startDate).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
};

/**
 * Get workouts for the current month
 */
export const getWorkoutsForCurrentMonth = (
  workouts: WorkoutData[]
): WorkoutData[] => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return filterWorkoutsByDateRange(workouts, startOfMonth);
};

/**
 * Calculate aggregate statistics for a set of workouts
 */
export const calculateWorkoutStats = (
  workouts: WorkoutData[]
): WorkoutPeriodStats => {
  return {
    totalWorkouts: workouts.length,
    totalDurationMinutes: workouts.reduce(
      (sum, workout) => sum + workout.duration,
      0
    ),
    totalCalories: Math.round(
      workouts.reduce((sum, workout) => sum + workout.calories, 0)
    ),
  };
};

/**
 * Process workout data for the workouts screen
 * Returns all workouts, last 7 days workouts, and current month statistics
 */
export const processWorkoutData = (
  healthKitWorkouts: readonly WorkoutSample[]
): ProcessedWorkoutData => {
  const allWorkouts = convertHealthKitWorkouts(healthKitWorkouts);
  const last7DaysWorkouts = getWorkoutsForLastDays(allWorkouts, 7);
  const currentMonthWorkouts = getWorkoutsForCurrentMonth(allWorkouts);
  const monthStats = calculateWorkoutStats(currentMonthWorkouts);

  return {
    allWorkouts,
    last7DaysWorkouts,
    monthStats,
  };
};
