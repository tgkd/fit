import { fetchGeneralStats } from "./generalStats";
import {
  calculateStressMetrics,
  fetchHeartStressStats,
  prepareStressChartDisplayData,
} from "./heartAndStress";
import { initializeHealthKit, isHealthKitAvailable } from "./permissions";
import { calculateRecoveryScore } from "./recovery";
import { fetchSleepStats } from "./sleep";
import { calculateDayStrain } from "./strain";
import {
  HealthData,
  HealthDataDefaults,
  StressChartDisplayData,
} from "./types";
import { fetchWorkoutStats } from "./workouts";

/**
 * Main health data aggregator function
 */
export const getAllHealthStats = async (
  defaults?: HealthDataDefaults // Use HealthDataDefaults type
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
      console.warn("Stress calculation failed, using fallback:", error);
    }

    // Calculate recovery score using the comprehensive recovery.ts function
    // This fetches all biometric and lifestyle data directly from HealthKit
    console.log("🔄 Starting recovery score calculation...");
    const recoveryScore = await calculateRecoveryScore({
      defaults,
      sleepEfficiency: sleepStats.sleepEfficiency,
    });

    console.log("✅ Recovery calculation completed successfully");
    console.log(
      "🔍 Recovery score breakdown",
      JSON.stringify(recoveryScore, null, 2)
    );

    const stressChartDisplayData: StressChartDisplayData =
      prepareStressChartDisplayData(
        heartStressStats.hrvValues,
        heartStressStats.restingHeartRate,
        heartStressStats.stressLevel,
        stressDetails,
        defaults
      );

    // Calculate strain score for today
    const strainScore = await calculateDayStrain(new Date(), defaults);

    return {
      ...generalStats,
      ...workoutStats,
      ...heartStressStats,
      // Use the recovery score calculated with the new method
      recoveryScore: recoveryScore.totalScore,
      sleep: sleepStats,
      strainScore,
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
export * from "./recovery";
export * from "./sleep";
export * from "./strain";
export * from "./utils";
export * from "./workouts";

