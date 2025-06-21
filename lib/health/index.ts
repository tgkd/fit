import { DEFAULT_USER_PROFILE } from "@/lib/storage/healthSettings";
import { fetchGeneralStats } from "./generalStats";
import {
  calculateStressMetrics,
  fetchHeartStressStats,
  fetchStressAverages,
  prepareStressChartDisplayData,
} from "./heartAndStress";
import { calculatePersonalizedRecovery, getRecoveryMetrics } from "./recovery";
import { fetchSleepAverages, fetchSleepStats } from "./sleep";
import {
  calculateDayStrain,
  calculatePersonalizedStrain,
  getStrainMetrics,
} from "./strain";
import {
  HealthData,
  StressChartDisplayData,
  SystemDefaults,
  UserProfile,
} from "./types";
import { fetchWorkoutStats } from "./workouts";

export const getAllHealthStats = async (
  date: Date,
  defaults: SystemDefaults,
  userParams?: UserProfile
): Promise<HealthData> => {
  console.log("Fetching health stats for date:", date);

  try {
    const generalStats = await fetchGeneralStats(date);

    const healthDataResults = await Promise.allSettled([
      fetchWorkoutStats(date),
      fetchSleepStats(date),
      fetchHeartStressStats(defaults, date),
      fetchSleepAverages(date),
      fetchStressAverages(defaults, date),
    ]);

    // Handle settled promises and provide fallbacks for failed ones
    const [
      workoutResult,
      sleepResult,
      heartStressResult,
      sleepAveragesResult,
      stressAveragesResult,
    ] = healthDataResults;

    if (workoutResult.status === "rejected") {
      console.error("❌ Workout stats failed:", workoutResult.reason);
    }
    if (sleepResult.status === "rejected") {
      console.error("❌ Sleep stats failed:", sleepResult.reason);
    }
    if (heartStressResult.status === "rejected") {
      console.error("❌ Heart stress stats failed:", heartStressResult.reason);
    }
    if (sleepAveragesResult.status === "rejected") {
      console.error("❌ Sleep averages failed:", sleepAveragesResult.reason);
    }
    if (stressAveragesResult.status === "rejected") {
      console.error("❌ Stress averages failed:", stressAveragesResult.reason);
    }

    const workoutStats =
      workoutResult.status === "fulfilled" ? workoutResult.value : null;
    const sleepStats =
      sleepResult.status === "fulfilled" ? sleepResult.value : null;
    const heartStressStats =
      heartStressResult.status === "fulfilled" ? heartStressResult.value : null;
    const sleepAverages =
      sleepAveragesResult.status === "fulfilled"
        ? sleepAveragesResult.value
        : null;
    const stressAverages =
      stressAveragesResult.status === "fulfilled"
        ? stressAveragesResult.value
        : null;

    // Only proceed with calculations if we have the required data
    if (!workoutStats) {
      console.error("❌ Cannot calculate health stats without workout data");
      throw new Error("Workout data is required for health calculations");
    }

    if (!sleepStats) {
      console.error("❌ Cannot calculate recovery without sleep data");
      throw new Error("Sleep data is required for health calculations");
    }

    if (!heartStressStats) {
      console.error("❌ Cannot prepare stress chart without heart/stress data");
      throw new Error("Heart/stress data is required for health calculations");
    }

    if (!sleepAverages) {
      console.error("❌ Sleep averages data is required");
      throw new Error("Sleep averages data is required for health calculations");
    }

    if (!stressAverages) {
      console.error("❌ Stress averages data is required");
      throw new Error("Stress averages data is required for health calculations");
    }

    const stressDetails = await calculateStressMetrics(defaults, date, true);

    const recoveryScore = userParams
      ? await calculatePersonalizedRecovery(
          userParams as UserProfile,
          defaults,
          date
        )
      : await calculatePersonalizedRecovery(
          DEFAULT_USER_PROFILE,
          defaults,
          date
        );

    const stressChartDisplayData: StressChartDisplayData =
      await prepareStressChartDisplayData(
        heartStressStats.hrvValues,
        heartStressStats.restingHeartRate,
        heartStressStats.stressLevel,
        stressDetails,
        defaults,
        date,
        true
      );

    const strainScore = userParams
      ? await calculatePersonalizedStrain(date, defaults, userParams)
      : await calculateDayStrain(date, defaults, DEFAULT_USER_PROFILE);

    return {
      ...generalStats,
      ...workoutStats,
      ...heartStressStats,
      recoveryScore: recoveryScore.totalScore,
      sleep: sleepStats,
      strainScore,
      stressDetails,
      stressChartDisplayData,
      sleepAverages,
      stressAverages,
    };
  } catch (error) {
    console.error("❌ Error fetching health stats:", error);
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
  userParams: UserProfile,
  defaults: SystemDefaults
): Promise<HealthData> => {
  return getAllHealthStats(date, defaults, userParams);
};

/**
 * Get comprehensive health metrics with detailed breakdown and recommendations
 * Returns both the standard health data plus personalized insights
 */
export const getHealthMetricsWithInsights = async (
  date: Date,
  defaults: SystemDefaults,
  userParams?: UserProfile
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
    const strainMetrics = await getStrainMetrics(date, defaults, userParams);
    result.strainInsights = {
      category: strainMetrics.category,
      recommendation: strainMetrics.recommendation,
    };

    // Get detailed recovery insights
    const recoveryMetrics = await getRecoveryMetrics(
      userParams,
      defaults,
      date
    );
    result.recoveryInsights = {
      category: recoveryMetrics.category,
      recommendation: recoveryMetrics.recommendation,
      insights: recoveryMetrics.insights,
    };
  }

  return result;
};
