import { fetchGeneralStats } from "./generalStats";
import {
  calculateStressMetrics,
  fetchHeartStressStats,
  fetchStressAverages,
  prepareStressChartDisplayData,
} from "./heartAndStress";
import { initializeHealthKit, isHealthKitAvailable } from "./permissions";
import { calculateRecoveryScore, fetchRecoveryAverages } from "./recovery";
import { fetchSleepAverages, fetchSleepStats } from "./sleep";
import { calculateDayStrain } from "./strain";
import {
  HealthData,
  HealthDataDefaults,
  StressChartDisplayData,
} from "./types";
import { fetchWorkoutStats } from "./workouts";

export const getAllHealthStats = async (
  defaults?: HealthDataDefaults
): Promise<HealthData> => {
  await initializeHealthKit();

  if (!isHealthKitAvailable) {
    throw new Error("HealthKit is not available on this platform.");
  }

  try {
    const generalStats = await fetchGeneralStats();

    const [workoutStats, sleepStats, heartStressStats, sleepAverages, stressAverages, recoveryAverages] = await Promise.all([
      fetchWorkoutStats(),
      fetchSleepStats(),
      fetchHeartStressStats(generalStats.age, defaults),
      fetchSleepAverages(),
      fetchStressAverages(defaults),
      fetchRecoveryAverages(defaults),
    ]);

    let stressDetails: HealthData["stressDetails"] = null;
    try {
      stressDetails = await calculateStressMetrics(defaults);
    } catch (error) {
      console.warn("Stress calculation failed, using fallback:", error);
    }

    const recoveryScore = await calculateRecoveryScore({
      defaults,
      sleepEfficiency: sleepStats.sleepEfficiency,
    });

    const stressChartDisplayData: StressChartDisplayData =
      await prepareStressChartDisplayData(
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
      sleepAverages,
      stressAverages,
      recoveryAverages,
    };
  } catch (error) {
    console.error("Error fetching health stats:", error);
    throw new Error(
      "Failed to fetch health data. Please check permissions and try again."
    );
  }
};

// Re-export specific types and functions as needed
export type { HealthData, HealthDataDefaults, StressChartDisplayData } from "./types";

