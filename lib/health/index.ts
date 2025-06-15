import { fetchGeneralStats } from "./generalStats";
import {
  calculateRecoveryScore,
  calculateStressMetrics,
  fetchHeartStressStats,
  prepareStressChartDisplayData,
} from "./heartAndStress";
import { initializeHealthKit, isHealthKitAvailable } from "./permissions";
import { fetchSleepStats } from "./sleep";
import { HealthData, StressChartDisplayData } from "./types";
import { fetchWorkoutStats } from "./workouts";

/**
 * Main health data aggregator function
 */
export const getAllHealthStats = async (
  defaults?: any
): Promise<HealthData> => {
  await initializeHealthKit();

  if (!isHealthKitAvailable) {
    throw new Error("HealthKit is not available on this platform.");
  }

  try {
    const generalStats = await fetchGeneralStats();

    const [workoutStats, sleepStats, heartStressStats] = await Promise.all([
      fetchWorkoutStats(),
      fetchSleepStats(),
      fetchHeartStressStats(generalStats.age, defaults),
    ]);

    let stressDetails: HealthData["stressDetails"] = null;
    try {
      stressDetails = await calculateStressMetrics(defaults);
    } catch (error) {
      console.warn(
        "Enhanced stress calculation failed, using fallback:",
        error
      );
    }

    const improvedRecoveryScore = calculateRecoveryScore(
      heartStressStats.hrvValues,
      heartStressStats.restingHeartRate || (defaults?.RESTING_HEART_RATE ?? 60),
      defaults?.RESPIRATORY_RATE ?? 15,
      sleepStats.sleepEfficiency,
      defaults?.PRIOR_STRAIN ?? 50
    );

    const stressChartDisplayData: StressChartDisplayData =
      prepareStressChartDisplayData(
        heartStressStats.hrvValues,
        heartStressStats.restingHeartRate,
        heartStressStats.stressLevel,
        stressDetails,
        defaults
      );

    return {
      ...generalStats,
      ...workoutStats,
      ...sleepStats,
      ...heartStressStats,
      recoveryScore: improvedRecoveryScore,
      stressDetails,
      stressChartDisplayData,
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

