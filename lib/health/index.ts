import { fetchGeneralStats } from "./generalStats";
import {
  calculateRecoveryScore,
  calculateStressMetrics,
  fetchHeartStressStats,
  prepareStressChartDisplayData, // Added
} from "./heartAndStress";
import { initializeHealthKit, isHealthKitAvailable } from "./permissions";
import { fetchSleepStats } from "./sleep";
import { HealthData, StressChartDisplayData } from "./types"; // Added StressChartDisplayData
import { fetchWorkoutStats } from "./workouts";

/**
 * Main health data aggregator function
 */
export const getAllHealthStats = async (): Promise<HealthData> => {
  await initializeHealthKit();

  if (!isHealthKitAvailable) {
    throw new Error("HealthKit is not available on this platform.");
  }

  try {
    const generalStats = await fetchGeneralStats();

    const [workoutStats, sleepStats, heartStressStats] = await Promise.all([
      fetchWorkoutStats(),
      fetchSleepStats(),
      fetchHeartStressStats(generalStats.age),
    ]);

    let stressDetails: HealthData["stressDetails"] = null;
    try {
      stressDetails = await calculateStressMetrics();
    } catch (error) {
      console.warn(
        "Enhanced stress calculation failed, using fallback:",
        error
      );
    }

    const improvedRecoveryScore = calculateRecoveryScore(
      heartStressStats.hrvValues,
      heartStressStats.restingHeartRate || 60,
      15, // Assuming default respiratory rate, consider fetching if available
      sleepStats.sleepEfficiency,
      50 // Assuming default prior strain, consider persisting or calculating
    );

    // Prepare display data for the StressMonitorCard
    const stressChartDisplayData: StressChartDisplayData =
      prepareStressChartDisplayData(
        heartStressStats.hrvValues,
        heartStressStats.restingHeartRate,
        heartStressStats.stressLevel, // This is the 0-100 overall stress
        stressDetails
      );

    return {
      ...generalStats,
      ...workoutStats,
      ...sleepStats,
      ...heartStressStats,
      recoveryScore: improvedRecoveryScore,
      stressDetails,
      stressChartDisplayData, // Added
    };
  } catch (error) {
    console.error("Error fetching health stats:", error);
    throw new Error(
      "Failed to fetch health data. Please check permissions and try again."
    );
  }
};

/**
 * Legacy compatibility function
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

// Re-export all types and functions
export * from "./generalStats";
export * from "./heartAndStress";
export * from "./permissions";
export * from "./sleep";
export * from "./types";
export * from "./utils";
export * from "./workouts";

