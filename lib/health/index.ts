// Main aggregator and re-exports for the health module
import { fetchGeneralStats } from "./generalStats";
import {
  calculateRecoveryScore,
  fetchHeartStressStats,
} from "./heartAndStress";
import { initializeHealthKit, isHealthKitAvailable } from "./permissions";
import { fetchSleepStats } from "./sleep";
import { HealthData } from "./types";
import { fetchWorkoutStats } from "./workouts";

/**
 * Main aggregator function - replaces getUserStats from healthStats.ts
 * Fetches all health data in parallel and combines into HealthData interface
 */
export const getAllHealthStats = async (): Promise<HealthData> => {
  // Initialize HealthKit if needed
  await initializeHealthKit();

  if (!isHealthKitAvailable) {
    throw new Error("HealthKit is not available on this platform.");
  }

  try {
    // Fetch all data in parallel for better performance
    const [generalStats, workoutStats, sleepStats, heartStressStats] =
      await Promise.all([
        fetchGeneralStats(),
        fetchWorkoutStats(),
        fetchSleepStats(),
        fetchHeartStressStats(),
      ]);

    // Override recovery score with actual sleep efficiency
    const improvedRecoveryScore = calculateRecoveryScore(
      heartStressStats.hrvValues,
      heartStressStats.restingHeartRate || 60,
      15, // respiratory rate - could be fetched separately
      sleepStats.sleepEfficiency,
      50 // prior strain - could be stored/calculated
    );

    // Combine all stats into single HealthData object
    return {
      ...generalStats,
      ...workoutStats,
      ...sleepStats,
      ...heartStressStats,
      recoveryScore: improvedRecoveryScore, // Use improved score with actual sleep data
    };
  } catch (error) {
    console.error("Error fetching health stats:", error);
    throw new Error(
      "Failed to fetch health data. Please check permissions and try again."
    );
  }
};

/**
 * Legacy function for backwards compatibility
 * @deprecated Use getAllHealthStats instead
 */
export const getUserStats = async () => {
  const healthData = await getAllHealthStats();
  return {
    moveKcal: healthData.moveKcal,
    exerciseMins: healthData.exerciseMins,
    standHours: healthData.standHours,
    recoveryScore: healthData.recoveryScore,
    strainScore: healthData.strainScore,
  };
};

// Re-export all types and functions for easy importing
export * from "./generalStats";
export * from "./heartAndStress";
export * from "./permissions";
export * from "./sleep";
export * from "./types";
export * from "./utils";
export * from "./workouts";

