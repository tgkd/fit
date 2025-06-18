import { fetchGeneralStats } from "./generalStats";
import {
  calculateStressMetrics,
  fetchHeartStressStats,
  fetchStressAverages,
  prepareStressChartDisplayData,
} from "./heartAndStress";
import { initializeHealthKit, isHealthKitAvailable } from "./permissions";
import {
  calculatePersonalizedRecovery,
  calculateRecoveryScore,
  fetchRecoveryAverages
} from "./recovery";
import { fetchSleepAverages, fetchSleepStats } from "./sleep";
import { calculateDayStrain, calculatePersonalizedStrain } from "./strain";
import {
  HealthData,
  HealthDataDefaults,
  StressChartDisplayData,
  UserParams,
} from "./types";
import { fetchWorkoutStats } from "./workouts";

export const getAllHealthStats = async (
  date: Date,
  defaults?: HealthDataDefaults,
  userParams?: UserParams
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

    const recoveryScore = userParams
      ? await calculatePersonalizedRecovery({
          ...userParams,
          sleepEfficiency: sleepStats.sleepEfficiency,
        }, date)
      : await calculateRecoveryScore({
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

    // Calculate strain score using personalized calculation if user params available
    const strainScore = userParams
      ? await calculatePersonalizedStrain(date, userParams)
      : await calculateDayStrain(date, defaults, undefined);

    return {
      ...generalStats,
      ...workoutStats,
      ...heartStressStats,
      // Extract the total score from recovery result
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

/**
 * Enhanced version of getAllHealthStats with user-specific personalization
 * Automatically uses personalized calculations when user parameters are provided
 */
export const getPersonalizedHealthStats = async (
  date: Date,
  userParams: UserParams,
  defaults?: HealthDataDefaults
): Promise<HealthData> => {
  return getAllHealthStats(date, defaults, userParams);
};

/**
 * Get comprehensive health metrics with detailed breakdown and recommendations
 * Returns both the standard health data plus personalized insights
 */
export const getHealthMetricsWithInsights = async (
  date: Date,
  userParams?: UserParams,
  defaults?: HealthDataDefaults
): Promise<{
  healthData: HealthData;
  strainInsights?: {
    category: string;
    recommendation: string;
  };
  recoveryInsights?: {
    category: string;
    recommendation: string;
    insights: string[];
  };
}> => {
  const healthData = await getAllHealthStats(date, defaults, userParams);

  const result: any = { healthData };

  if (userParams) {
    // Get detailed strain insights
    const { getStrainMetrics } = await import("./strain");
    const strainMetrics = await getStrainMetrics(date, userParams);
    result.strainInsights = {
      category: strainMetrics.category,
      recommendation: strainMetrics.recommendation,
    };

    // Get detailed recovery insights
    const { getRecoveryMetrics } = await import("./recovery");
    const recoveryMetrics = await getRecoveryMetrics(userParams, date);
    result.recoveryInsights = {
      category: recoveryMetrics.category,
      recommendation: recoveryMetrics.recommendation,
      insights: recoveryMetrics.insights,
    };
  }

  return result;
};

// Re-export specific types and functions as needed
export type {
  HealthData,
  HealthDataDefaults,
  StressChartDisplayData,
  UserParams
} from "./types";

export {
  calculatePersonalizedStrain,
  getStrainMetrics
} from "./strain";

export {
  calculatePersonalizedRecovery,
  getRecoveryMetrics
} from "./recovery";

