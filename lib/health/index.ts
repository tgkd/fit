import { fetchGeneralStats } from "./generalStats";
import {
  calculateStressMetrics,
  fetchHeartStressStats,
  fetchStressAverages,
  prepareStressChartDisplayData,
} from "./heartAndStress";
import {
  calculatePersonalizedRecovery,
  calculateRecoveryScore,
  fetchRecoveryAverages,
  getRecoveryMetrics,
} from "./recovery";
import { fetchSleepAverages, fetchSleepStats } from "./sleep";
import {
  calculateDayStrain,
  calculatePersonalizedStrain,
  getStrainMetrics,
} from "./strain";
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
  console.log("Fetching health stats for date:", date);

  try {
    const generalStats = await fetchGeneralStats(date);

    const healthDataResults = await Promise.allSettled([
      fetchWorkoutStats(date),
      fetchSleepStats(date),
      fetchHeartStressStats(generalStats.age, defaults, date),
      fetchSleepAverages(date),
      fetchStressAverages(defaults, date),
      fetchRecoveryAverages(defaults, date),
    ]);

    // Handle settled promises and provide fallbacks for failed ones
    const [
      workoutResult,
      sleepResult,
      heartStressResult,
      sleepAveragesResult,
      stressAveragesResult,
      recoveryAveragesResult,
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
    if (recoveryAveragesResult.status === "rejected") {
      console.error(
        "❌ Recovery averages failed:",
        recoveryAveragesResult.reason
      );
    }

    const workoutStats = workoutResult.status === "fulfilled" ? workoutResult.value : null;
    const sleepStats = sleepResult.status === "fulfilled" ? sleepResult.value : null;
    const heartStressStats = heartStressResult.status === "fulfilled" ? heartStressResult.value : null;
    const sleepAverages = sleepAveragesResult.status === "fulfilled" ? sleepAveragesResult.value : null;
    const stressAverages = stressAveragesResult.status === "fulfilled" ? stressAveragesResult.value : null;
    const recoveryAverages = recoveryAveragesResult.status === "fulfilled" ? recoveryAveragesResult.value : null;

    let stressDetails: HealthData["stressDetails"] = null;
    try {
      // Use last 24 hours for more current stress data
      stressDetails = await calculateStressMetrics(defaults, date, true);
    } catch (error) {
      console.warn("⚠️ Stress calculation failed, using fallback:", error);
    }

    // Only proceed with calculations if we have the required data
    if (!sleepStats) {
      console.error("❌ Cannot calculate recovery without sleep data");
      throw new Error("Sleep data is required for health calculations");
    }

    if (!heartStressStats) {
      console.error("❌ Cannot prepare stress chart without heart/stress data");
      throw new Error("Heart/stress data is required for health calculations");
    }

    const recoveryScore = userParams
      ? await calculatePersonalizedRecovery(
          {
            ...userParams,
            sleepEfficiency: sleepStats.sleepEfficiency,
          },
          date
        ).catch((error) => {
          console.error("❌ Personalized recovery calculation failed:", error);
          throw error;
        })
      : await calculateRecoveryScore({
          defaults,
          sleepEfficiency: sleepStats.sleepEfficiency,
          targetDate: date,
        }).catch((error) => {
          console.error("❌ Standard recovery calculation failed:", error);
          throw error;
        });

    const stressChartDisplayData: StressChartDisplayData =
      await prepareStressChartDisplayData(
        heartStressStats.hrvValues,
        heartStressStats.restingHeartRate,
        heartStressStats.stressLevel,
        stressDetails,
        defaults,
        date,
        true // Use last 24 hours for chart display
      ).catch((error) => {
        console.error(
          "❌ Stress chart display data preparation failed:",
          error
        );
        throw error;
      });

    const strainScore = userParams
      ? await calculatePersonalizedStrain(date, userParams).catch((error) => {
          console.error("❌ Personalized strain calculation failed:", error);
          throw error;
        })
      : await calculateDayStrain(date, defaults, undefined).catch((error) => {
          console.error("❌ Standard strain calculation failed:", error);
          throw error;
        });

    return {
      ...generalStats,
      ...(workoutStats || { exerciseMins: 0, standHours: 0, moveKcal: 0, rawCalories: [], workouts: [] }),
      ...heartStressStats,
      // Extract the total score from recovery result
      recoveryScore: recoveryScore.totalScore,
      sleep: sleepStats,
      strainScore,
      stressDetails,
      stressChartDisplayData,
      sleepAverages: sleepAverages || {
        last14Days: { duration: 0, efficiency: 0, performance: 0, consistency: 0 },
        last30Days: { duration: 0, efficiency: 0, performance: 0, consistency: 0 }
      },
      stressAverages: stressAverages || {
        last14Days: { level: 0, hrvAverage: 0, restingHeartRate: 0 },
        last30Days: { level: 0, hrvAverage: 0, restingHeartRate: 0 }
      },
      recoveryAverages: recoveryAverages || {
        last14Days: { score: 0 },
        last30Days: { score: 0 }
      },
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
    const strainMetrics = await getStrainMetrics(date, userParams);
    result.strainInsights = {
      category: strainMetrics.category,
      recommendation: strainMetrics.recommendation,
    };

    // Get detailed recovery insights
    const recoveryMetrics = await getRecoveryMetrics(userParams, date);
    result.recoveryInsights = {
      category: recoveryMetrics.category,
      recommendation: recoveryMetrics.recommendation,
      insights: recoveryMetrics.insights,
    };
  }

  return result;
};
