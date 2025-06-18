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
  date: Date,
  defaults?: HealthDataDefaults
): Promise<HealthData> => {
  await initializeHealthKit();

  console.log("Fetching health stats for date:", date);

  if (!isHealthKitAvailable) {
    throw new Error("HealthKit is not available on this platform.");
  }

  try {
    const generalStats = await fetchGeneralStats(date);

    const [
      workoutStats,
      sleepStats,
      heartStressStats,
      sleepAverages,
      stressAverages,
      recoveryAverages,
    ] = await Promise.all([
      fetchWorkoutStats(date),
      fetchSleepStats(date),
      fetchHeartStressStats(generalStats.age, defaults, date),
      fetchSleepAverages(date),
      fetchStressAverages(defaults, date),
      fetchRecoveryAverages(defaults, date),
    ]);

    let stressDetails: HealthData["stressDetails"] = null;
    try {
      stressDetails = await calculateStressMetrics(defaults, date);
    } catch (error) {
      console.warn("Stress calculation failed, using fallback:", error);
    }

    const recoveryScore = await calculateRecoveryScore({
      defaults,
      sleepEfficiency: sleepStats.sleepEfficiency,
      targetDate: date,
    });

    const stressChartDisplayData: StressChartDisplayData =
      await prepareStressChartDisplayData(
        heartStressStats.hrvValues,
        heartStressStats.restingHeartRate,
        heartStressStats.stressLevel,
        stressDetails,
        defaults,
        date
      );

    // Calculate strain score for the target date
    const strainScore = await calculateDayStrain(date, defaults);

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
export type {
  HealthData,
  HealthDataDefaults,
  StressChartDisplayData
} from "./types";

