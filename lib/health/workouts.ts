import {
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  queryQuantitySamples,
  queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit";
import { ActivitySample, WorkoutStats } from "./types";
import { getCurrentDateRanges, getDurationMinutes } from "./utils";

// Constants from original healthStats.ts
export const ACTIVITY_MULTIPLIERS = {
  LOW_INTENSITY: 0.9, // < 4 METs
  MODERATE_INTENSITY: 1.1, // 4-7 METs
  HIGH_INTENSITY: 1.4, // > 7 METs
};

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
