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

    if (workoutResult.status === 'rejected') {
      console.error("❌ Workout stats failed:", workoutResult.reason);
    }
    if (sleepResult.status === 'rejected') {
      console.error("❌ Sleep stats failed:", sleepResult.reason);
    }
    if (heartStressResult.status === 'rejected') {
      console.error("❌ Heart stress stats failed:", heartStressResult.reason);
    }
    if (sleepAveragesResult.status === 'rejected') {
      console.error("❌ Sleep averages failed:", sleepAveragesResult.reason);
    }
    if (stressAveragesResult.status === 'rejected') {
      console.error("❌ Stress averages failed:", stressAveragesResult.reason);
    }
    if (recoveryAveragesResult.status === 'rejected') {
      console.error("❌ Recovery averages failed:", recoveryAveragesResult.reason);
    }

    const workoutStats = workoutResult.status === 'fulfilled' ? workoutResult.value : {
      exerciseMins: 0,
      standHours: 0,
      moveKcal: 0,
      rawCalories: [],
      workouts: [],
    };

    const sleepStats = sleepResult.status === 'fulfilled' ? sleepResult.value : {
      sleepHours: 0,
      sleepPerformance: 75,
      sleepConsistency: 75,
      sleepEfficiency: 85,
      dailySleepDurations: [],
      metrics: {
        hoursVsNeeded: 100,
        sleepConsistency: 75,
        sleepEfficiency: 85,
        sleepStress: 25,
      },
      lastNight: {
        totalSleepTime: "0:00",
        averageSleepTime: "0:00",
        timeInBed: "0:00",
        stages: {
          awake: { percentage: 5, duration: 0, color: "#FF6B6B" },
          light: { percentage: 50, duration: 0, color: "#4ECDC4" },
          deep: { percentage: 25, duration: 0, color: "#45B7D1" },
          rem: { percentage: 20, duration: 0, color: "#96CEB4" },
        },
        restorativeSleep: {
          duration: "0:00",
          averageDuration: "0:00",
        },
      },
    };

    const heartStressStats = heartStressResult.status === 'fulfilled' ? heartStressResult.value : {
      restingHeartRate: 60,
      hrv7DayAvg: 45,
      hrvMostRecent: 45,
      hrvValues: [],
      stressLevel: 25,
      bloodOxygen: null,
    };

    const sleepAverages = sleepAveragesResult.status === 'fulfilled' ? sleepAveragesResult.value : {
      last14Days: {
        duration: 7.5,
        efficiency: 85,
        performance: 75,
        consistency: 75,
      },
      last30Days: {
        duration: 7.5,
        efficiency: 85,
        performance: 75,
        consistency: 75,
      },
    };

    const stressAverages = stressAveragesResult.status === 'fulfilled' ? stressAveragesResult.value : {
      last14Days: {
        level: 25,
        hrvAverage: 45,
        restingHeartRate: 60,
      },
      last30Days: {
        level: 25,
        hrvAverage: 45,
        restingHeartRate: 60,
      },
    };

    const recoveryAverages = recoveryAveragesResult.status === 'fulfilled' ? recoveryAveragesResult.value : {
      last14Days: { score: 75 },
      last30Days: { score: 75 },
    };

    let stressDetails: HealthData["stressDetails"] = null;
    try {
      stressDetails = await calculateStressMetrics(defaults, date);
    } catch (error) {
      console.warn("⚠️ Stress calculation failed, using fallback:", error);
    }

    const recoveryScore = userParams
      ? await calculatePersonalizedRecovery(
          {
            ...userParams,
            sleepEfficiency: sleepStats.sleepEfficiency,
          },
          date
        ).catch(error => {
          console.error("❌ Personalized recovery calculation failed:", error);
          throw error;
        })
      : await calculateRecoveryScore({
          defaults,
          sleepEfficiency: sleepStats.sleepEfficiency,
          targetDate: date,
        }).catch(error => {
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
        date
      ).catch(error => {
        console.error("❌ Stress chart display data preparation failed:", error);
        throw error;
      });

    const strainScore = userParams
      ? await calculatePersonalizedStrain(date, userParams).catch(error => {
          console.error("❌ Personalized strain calculation failed:", error);
          throw error;
        })
      : await calculateDayStrain(date, defaults, undefined).catch(error => {
          console.error("❌ Standard strain calculation failed:", error);
          throw error;
        });

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
