import {
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
} from "@kingstinct/react-native-healthkit";
import { ActivitySample, WorkoutStats } from "./types";
import { getCurrentDateRanges, getDurationHours, getDurationMinutes } from "./utils";

// Constants from original healthStats.ts
export const ACTIVITY_MULTIPLIERS = {
  LOW_INTENSITY: 0.9, // < 4 METs
  MODERATE_INTENSITY: 1.1, // 4-7 METs
  HIGH_INTENSITY: 1.4, // > 7 METs
};

/**
 * Fetch workout and exercise statistics
 * - Exercise minutes (≥3 METs)
 * - Stand hours (estimated from steps)
 * - Move calories (active energy burned)
 * - Raw calorie samples
 * - Raw workout samples (last 30 days for workouts screen)
 */
export const fetchWorkoutStats = async (): Promise<WorkoutStats> => {
  const { now, startOfToday, oneDayAgo } = getCurrentDateRanges();

  // Get workouts from last 30 days for the workouts screen
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get active calories for today
  const caloriesSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.activeEnergyBurned,
    { from: startOfToday, to: now }
  );

  const moveKcal = caloriesSamples.reduce(
    (sum: number, record) => sum + record.quantity,
    0
  );

  // Get workouts for exercise minutes calculation (last 24h)
  const recentWorkouts = await queryWorkoutSamples({ from: oneDayAgo, to: now });
  const exerciseMins = calculateExerciseMins(
    recentWorkouts.map((w) => ({
      start: new Date(w.startDate),
      end: new Date(w.endDate),
      // Simplified METs estimation - most workouts are at least moderate intensity
      mets:
        w.totalEnergyBurned && typeof w.totalEnergyBurned.quantity === "number"
          ? Math.max(
              3,
              w.totalEnergyBurned.quantity /
                getDurationHours(new Date(w.startDate), new Date(w.endDate)) /
                70
            )
          : 4, // Default to moderate intensity
    }))
  );

  // Get all workouts from last 30 days for the workouts screen
  const allWorkouts = await queryWorkoutSamples({ from: thirtyDaysAgo, to: now });

  // Estimate stand hours from steps (simplified approach)
  const stepsStat = await queryStatisticsForQuantity(
    HKQuantityTypeIdentifier.stepCount,
    [HKStatisticsOptions.cumulativeSum],
    startOfToday,
    now
  );
  const totalSteps = stepsStat?.sumQuantity?.quantity || 0;
  const standHours = Math.min(12, Math.floor(totalSteps / 250)); // Rough estimate: 250 steps per standing hour

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
