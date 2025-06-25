import { mean } from "@/utils/dates";
import type {
  QuantitySample,
  QueryStatisticsResponse,
} from "@kingstinct/react-native-healthkit";
import {
  getMostRecentQuantitySample,
  queryQuantitySamples,
  queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit";

import { RecoveryAverages, SystemDefaults, UserProfile } from "./types";
import {
  calculateAverage,
  getCurrentDateRanges,
  getDateRange,
  getDateRanges,
  getDatesArray,
  getExtendedDateRanges,
} from "./utils";

export interface RecoveryCalculationOptions {
  defaults: SystemDefaults;
  sleepEfficiency?: number;
  targetDate: Date;
  userParams: UserProfile;
}

export interface RecoveryScoreBreakdown {
  biometrics: {
    HRV: number;
    RHR: number;
    respiratoryRate: number;
    sleepEfficiency: number;
  };
  lifestyle: {
    hydration: number;
    alcohol: number;
    nutrition: number;
    strain: number;
  };
}

export interface RecoveryScoreResult {
  totalScore: number; // Final 0–100 recovery score
  biometricScore: number; // Aggregate biometric sub-score (0–100)
  lifestyleScore: number; // Aggregate lifestyle sub-score (0–100)
  breakdown: RecoveryScoreBreakdown;
}

// Helper: clamp a value to 0–100
const clampPercent = (num: number): number => Math.max(0, Math.min(100, num));

interface DateRanges {
  now: Date;
  startOfDay: Date;
  oneWeekAgo: Date;
  fourteenDaysAgo: Date;
}

/**
 * Calculate all required date ranges for recovery calculation
 */
const calculateDateRanges = (targetDate?: Date): DateRanges => {
  if (targetDate) {
    const ranges = getDateRanges(targetDate);
    const extendedRanges = getExtendedDateRanges(targetDate);
    return {
      now: ranges.endOfTargetDay,
      startOfDay: ranges.startOfTargetDay,
      oneWeekAgo: ranges.oneWeekAgo,
      fourteenDaysAgo: extendedRanges.fourteenDaysAgo,
    };
  } else {
    const ranges = getCurrentDateRanges();
    const extendedRanges = getExtendedDateRanges();
    return {
      now: ranges.now,
      startOfDay: ranges.startOfToday,
      oneWeekAgo: ranges.oneWeekAgo,
      fourteenDaysAgo: extendedRanges.fourteenDaysAgo,
    };
  }
};

interface HealthDataResult {
  restingHR: number;
  currentHrv: number;
  respiratoryRate: number;
  hasRespiratoryData: boolean;
  activeEnergyBurned: number;
  baselineHrv?: number;
  baselineRhr?: number;
  sleepEfficiency: number;
}

/**
 * Fetch all required health data from HealthKit
 */
const fetchHealthData = async (
  dateRanges: DateRanges,
  defaults: SystemDefaults,
  sleepEfficiency?: number
): Promise<HealthDataResult> => {
  const { now, startOfDay, oneWeekAgo, fourteenDaysAgo } = dateRanges;

  // Fetch all required health data in parallel
  const [
    restingHRSample,
    hrvSamples,
    respiratoryStats,
    activeEnergyStats,
    baselineHrvSamples,
    baselineRhrSamples,
  ]: [
    QuantitySample | undefined,
    readonly QuantitySample[],
    QueryStatisticsResponse,
    QueryStatisticsResponse,
    readonly QuantitySample[],
    readonly QuantitySample[]
  ] = await Promise.all([
    // Current resting heart rate
    getMostRecentQuantitySample("HKQuantityTypeIdentifierRestingHeartRate"),

    // HRV data for last week (for current value)
    queryQuantitySamples("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", {
      filter: { startDate: oneWeekAgo, endDate: now },
    }),

    // Respiratory rate for the target day (may not be available)
    queryStatisticsForQuantity(
      "HKQuantityTypeIdentifierRespiratoryRate",
      ["discreteAverage"],
      {
        filter: { startDate: startOfDay, endDate: now },
        unit: "count/min",
      }
    ),

    // Active energy burned for the target day
    queryStatisticsForQuantity(
      "HKQuantityTypeIdentifierActiveEnergyBurned",
      ["cumulativeSum"],
      {
        filter: { startDate: startOfDay, endDate: now },
        unit: "kcal",
      }
    ),

    // 14-day HRV baseline
    queryQuantitySamples("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", {
      filter: { startDate: fourteenDaysAgo, endDate: now },
      unit: "ms",
    }),

    // 14-day RHR baseline
    queryQuantitySamples("HKQuantityTypeIdentifierRestingHeartRate", {
      filter: { startDate: fourteenDaysAgo, endDate: now },
      unit: "count/min",
    }),
  ]);

  // Validate and process fetched data
  const restingHR = restingHRSample?.quantity ?? defaults.RESTING_HEART_RATE;

  const hrvValues = (hrvSamples as QuantitySample[]).map(
    (s: QuantitySample) => s.quantity
  );
  const currentHrv = hrvValues.length > 0 ? mean(hrvValues) : defaults.HRV_BASELINE;

  // Respiratory rate validation - handle null/empty response
  const hasRespiratoryData = !!respiratoryStats?.averageQuantity?.quantity;
  const respiratoryRate = hasRespiratoryData
    ? respiratoryStats.averageQuantity!.quantity
    : defaults.RESPIRATORY_RATE;

  const processedSleepEfficiency = sleepEfficiency ?? defaults.SLEEP_EFFICIENCY;
  const activeEnergyBurned = activeEnergyStats?.sumQuantity?.quantity || 0;

  // Calculate baselines for comparison
  const baselineHrvValues = (baselineHrvSamples as QuantitySample[]).map(
    (s: QuantitySample) => s.quantity
  );
  const baselineHrv = baselineHrvValues.length > 0 ? mean(baselineHrvValues) : undefined;

  const baselineRhrValues = (baselineRhrSamples as QuantitySample[]).map(
    (s: QuantitySample) => s.quantity
  );
  const baselineRhr = baselineRhrValues.length > 0 ? mean(baselineRhrValues) : undefined;

  return {
    restingHR,
    currentHrv,
    respiratoryRate,
    hasRespiratoryData,
    activeEnergyBurned,
    baselineHrv,
    baselineRhr,
    sleepEfficiency: processedSleepEfficiency,
  };
};

interface UserTargets {
  waterTarget: number;
  calorieTarget: number;
  strainLow: number;
  strainHigh: number;
}

interface MetricCalculation {
  value: number;
  baseline: number;
  isHigherBetter?: boolean;
  penalty?: number;
  isDataMissing?: boolean;
}

/**
 * Calculate a standardized metric score based on value vs baseline
 */
const calculateMetricScore = ({
  value,
  baseline,
  isHigherBetter = true,
  penalty = 0,
  isDataMissing = false
}: MetricCalculation): number => {
  if (isDataMissing && penalty > 0) {
    return Math.min(100, penalty);
  }

  let score: number;
  if (isHigherBetter) {
    score = (value / baseline) * 100;
    if (value >= baseline) score = 100;
  } else {
    score = (baseline / value) * 100;
    if (value <= baseline) score = 100;
  }

  return clampPercent(score - penalty);
};

/**
 * Calculate strain score based on thresholds
 */
const calculateStrainScore = (
  activeEnergy: number,
  lowThreshold: number,
  highThreshold: number
): number => {
  if (activeEnergy <= lowThreshold) return 100;
  if (activeEnergy >= highThreshold) return 0;

  const excess = activeEnergy - lowThreshold;
  return clampPercent(100 - (excess / (highThreshold - lowThreshold)) * 100);
};

/**
 * Calculate HRV baseline with age adjustment
 */
const calculateHrvBaseline = (
  userParams: UserProfile,
  healthData: HealthDataResult
): number => {
  if (userParams.baselineHRV) return userParams.baselineHRV;
  if (healthData.baselineHrv) return healthData.baselineHrv;

  if (userParams.age) {
    const declineRate = userParams.hrvAgeDeclineRate;
    return Math.max(25, 60 - (userParams.age - 25) * declineRate);
  }

  return 50;
};

/**
 * Calculate RHR baseline with age and fitness adjustments
 */
const calculateRhrBaseline = (
  userParams: UserProfile,
  healthData: HealthDataResult
): number => {
  if (userParams.baselineRHR) return userParams.baselineRHR;
  if (healthData.baselineRhr) return healthData.baselineRhr;

  if (userParams.age) {
    const baseRHR = userParams.hrBaselineValue;
    const referenceAge = userParams.hrBaselineAgeReference;
    const ageAdjustment = (userParams.age - referenceAge) * userParams.rhrAgeIncreaseRate;
    const fitnessAdjustment = userParams.fitnessRhrAdjustments[userParams.fitnessLevel];

    return Math.max(40, baseRHR + ageAdjustment + fitnessAdjustment);
  }

  return 60;
};

/**
 * Calculate user-specific targets for water intake, calories, and strain thresholds
 */
const calculateUserTargets = (userParams: UserProfile, defaults: SystemDefaults): UserTargets => {
  // Calculate personalized water target based on weight and activity
  let waterTarget = defaults.WATER_TARGET;
  if (userParams.weight) {
    const waterPerKg = userParams.waterIntakePerKg;
    waterTarget = Math.round(userParams.weight * waterPerKg);
  }
  if (userParams.dailyWaterTarget) {
    waterTarget = userParams.dailyWaterTarget;
  }

  // Calculate personalized calorie target based on user stats
  let calorieTarget = defaults.CALORIE_TARGET;
  if (userParams.weight && userParams.height && userParams.age) {
    const genderAdjustment = userParams.bmrGenderAdjustment;
    const bmr =
      10 * userParams.weight +
      6.25 * userParams.height -
      5 * userParams.age +
      genderAdjustment;

    const activityMultipliers = userParams.bmrActivityMultipliers;
    const activityMultiplier = activityMultipliers[userParams.fitnessLevel];

    const deficitPercentage = userParams.caloricDeficitPercentage;
    calorieTarget = Math.round(
      bmr * activityMultiplier * deficitPercentage
    );
  }
  if (userParams.dailyCalorieTarget) {
    calorieTarget = userParams.dailyCalorieTarget;
  }

  const configuredThresholds = userParams.strainThresholds;
  const strainThresholds = configuredThresholds[userParams.fitnessLevel];

  return {
    waterTarget,
    calorieTarget,
    strainLow: strainThresholds.low,
    strainHigh: strainThresholds.high,
  };
};

/**
 * Fetch recovery data directly from HealthKit and calculate comprehensive recovery score
 * Includes biometric data (HRV, RHR, respiratory rate, sleep efficiency)
 * and lifestyle factors (hydration, alcohol, nutrition, strain)
 */

export async function calculateRecoveryScore(
  options: RecoveryCalculationOptions
): Promise<RecoveryScoreResult> {
  try {
    const dateRanges = calculateDateRanges(options.targetDate);
    const healthData = await fetchHealthData(dateRanges, options.defaults, options.sleepEfficiency);

    // Calculate user-specific targets
    const targets = calculateUserTargets(options.userParams, options.defaults);

    const waterIntakeAssumption = options.userParams.waterIntakeAssumption;
    const waterIntake =
      options.defaults.DAILY_WATER_INTAKE ||
      targets.waterTarget * waterIntakeAssumption;
    const alcoholDrinks = options.defaults.DAILY_ALCOHOL_DRINKS;
    const caloriesConsumed =
      options.defaults.DAILY_CALORIES_CONSUMED || targets.calorieTarget;

    // Extract configuration constants with user-specific fallbacks
    const normativeHrv =
      options.userParams.baselineHRV || options.defaults.NORMATIVE_HRV;
    const waterTarget = targets.waterTarget;
    const calorieTarget = targets.calorieTarget;
    const strainLow = targets.strainLow;
    const strainHigh = targets.strainHigh;
    const respBase = options.defaults.RESPIRATORY_BASELINE;

    // Use configurable alcohol penalty based on user weight
    let alcoholPenalty =
      options.userParams.alcoholPenaltyPerDrink ||
      options.defaults.ALCOHOL_PENALTY_PER_DRINK;
    if (options.userParams.weight) {
      const sensitivity = options.userParams.alcoholWeightSensitivity;

      const weightFactor = Math.max(
        sensitivity.minMultiplier,
        Math.min(
          sensitivity.maxMultiplier,
          sensitivity.baseWeight / options.userParams.weight
        )
      );
      alcoholPenalty = Math.round(alcoholPenalty * weightFactor);
    }
    // 1. Calculate baseline values and normalized scores
    const hrvBaseline = calculateHrvBaseline(options.userParams, healthData);
    const rhrBaseline = calculateRhrBaseline(options.userParams, healthData);

    // Calculate biometric scores
    let hrvScore = calculateMetricScore({
      value: healthData.currentHrv,
      baseline: hrvBaseline,
      isHigherBetter: true
    });

    // Use configurable baseline comparison threshold
    const baselineMinSamples = options.userParams.hrvDataMinimumSamples;
    if (
      (healthData.baselineHrv ? 14 : 0) < baselineMinSamples &&
      Math.abs(healthData.currentHrv - hrvBaseline) < 1
    ) {
      hrvScore = calculateMetricScore({
        value: healthData.currentHrv,
        baseline: normativeHrv,
        isHigherBetter: true
      });
    }

    const rhrScore = calculateMetricScore({
      value: healthData.restingHR,
      baseline: rhrBaseline,
      isHigherBetter: false
    });

    // Respiratory Rate: lower (within normal range) is better
    let respiratoryScore = calculateMetricScore({
      value: healthData.respiratoryRate,
      baseline: respBase,
      isHigherBetter: false,
      penalty: 0,
      isDataMissing: !healthData.hasRespiratoryData
    });

    if (!healthData.hasRespiratoryData) {
      const penaltyPercent = options.userParams.respiratoryPenaltyForMissing;
      respiratoryScore = Math.min(respiratoryScore, penaltyPercent);
    }

    // Sleep Efficiency: already a percentage. Compare to baseline or use directly.
    const sleepEffScore = calculateMetricScore({
      value: healthData.sleepEfficiency,
      baseline: 100, // ideal 100%
      isHigherBetter: true
    });

    // 2. Normalize lifestyle metrics against healthy thresholds
    // Hydration (daily water) – compare to target
    let hydrationScore = (waterIntake / waterTarget) * 100;
    hydrationScore = clampPercent(hydrationScore);

    // Alcohol – 0 drinks ideal. Use configurable threshold for zero score.
    let alcoholScore = 100 - alcoholDrinks * alcoholPenalty;
    const maxAlcoholDrinks = options.userParams.maxAlcoholForZeroScore;
    if (alcoholDrinks >= maxAlcoholDrinks) alcoholScore = 0;
    alcoholScore = clampPercent(alcoholScore);

    // Nutrition (calories) – compare to minimum target
    let nutritionScore = (caloriesConsumed / calorieTarget) * 100;
    nutritionScore = clampPercent(nutritionScore);

    // Strain (active energy) – full score if <=low threshold, zero if >=high threshold, linear in between
    const strainScore = calculateStrainScore(
      healthData.activeEnergyBurned,
      strainLow,
      strainHigh
    );

    // 3. Apply weighting to combine metrics
    // Weights: 50% biometrics, 50% lifestyle (each metric equally weighted within its category here)
    const biometricMetrics = [
      hrvScore,
      rhrScore,
      respiratoryScore,
      sleepEffScore,
    ];
    const lifestyleMetrics = [
      hydrationScore,
      alcoholScore,
      nutritionScore,
      strainScore,
    ];
    const biometricScore =
      biometricMetrics.reduce((sum, val) => sum + val, 0) /
      biometricMetrics.length;
    const lifestyleScore =
      lifestyleMetrics.reduce((sum, val) => sum + val, 0) /
      lifestyleMetrics.length;
    // Combine category scores (equal weight)
    const totalScore = biometricScore * 0.5 + lifestyleScore * 0.5;

    // 4. Prepare detailed breakdown with validation info
    const breakdown: RecoveryScoreBreakdown = {
      biometrics: {
        HRV: Math.round(hrvScore),
        RHR: Math.round(rhrScore),
        respiratoryRate: Math.round(respiratoryScore),
        sleepEfficiency: Math.round(sleepEffScore),
      },
      lifestyle: {
        hydration: Math.round(hydrationScore),
        alcohol: Math.round(alcoholScore),
        nutrition: Math.round(nutritionScore),
        strain: Math.round(strainScore),
      },
    };

    return {
      totalScore: Math.round(totalScore),
      biometricScore: Math.round(biometricScore),
      lifestyleScore: Math.round(lifestyleScore),
      breakdown,
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate recovery: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

/**
 * Calculate recovery average for a specific date range
 */
const calculateRecoveryAverage = async (
  dateRange: { from: Date; to: Date },
  defaults: SystemDefaults,
  userParams: UserProfile
): Promise<RecoveryAverages> => {
  const dates = getDatesArray(dateRange.from, dateRange.to);
  const recoveryScores: number[] = [];

  for (const date of dates) {
    try {
      const recoveryResult = await calculateRecoveryScore({
        defaults,
        userParams,
        targetDate: date,
      });
      recoveryScores.push(recoveryResult.totalScore);
    } catch {
      // Skip failed calculations
    }
  }

  const avgScore = calculateAverage(recoveryScores);
  return { score: Math.round(avgScore) };
};

/**
 * Fetch recovery averages for 14 and 30 day periods relative to a target date
 */
export const fetchRecoveryAverages = async (
  defaults: SystemDefaults,
  userParams: UserProfile,
  targetDate: Date
): Promise<{
  last14Days: RecoveryAverages;
  last30Days: RecoveryAverages;
}> => {
  const [last14Days, last30Days] = await Promise.all([
    calculateRecoveryAverage(getDateRange(14, targetDate), defaults, userParams),
    calculateRecoveryAverage(getDateRange(30, targetDate), defaults, userParams)
  ]);

  return { last14Days, last30Days };
};

/**
 * Calculate recovery score with personalized user parameters
 * This function provides a convenient way to calculate recovery with user-specific defaults
 */
export async function calculatePersonalizedRecovery(
  userParams: UserProfile,
  defaults: SystemDefaults,
  targetDate: Date
): Promise<RecoveryScoreResult> {
  return calculateRecoveryScore({
    defaults,
    userParams,
    targetDate,
    sleepEfficiency: userParams.sleepEfficiency,
  });
}

/**
 * Get recovery metrics with enhanced breakdown and recommendations
 */
export async function getRecoveryMetrics(
  userParams: UserProfile,
  defaults: SystemDefaults,
  targetDate: Date
): Promise<{
  recovery: RecoveryScoreResult;
  category: string;
  recommendation: string;
  insights: string[];
}> {
  const recovery = await calculatePersonalizedRecovery(
    userParams,
    defaults,
    targetDate
  );

  // Categorize recovery level
  let category: string;
  let recommendation: string;
  const insights: string[] = [];

  if (recovery.totalScore >= 75) {
    category = "High";
    recommendation = "Excellent recovery. Ready for intense training.";
  } else if (recovery.totalScore >= 50) {
    category = "Moderate";
    recommendation = "Good recovery. Moderate training intensity recommended.";
  } else if (recovery.totalScore >= 25) {
    category = "Low";
    recommendation = "Limited recovery. Focus on light activity and rest.";
  } else {
    category = "Very Low";
    recommendation =
      "Poor recovery. Prioritize sleep, hydration, and complete rest.";
  }

  // Generate specific insights based on breakdown
  const { breakdown } = recovery;

  if (breakdown.biometrics.HRV < 70) {
    insights.push(
      "HRV below optimal - consider stress management and better sleep"
    );
  }
  if (breakdown.biometrics.RHR < 70) {
    insights.push(
      "Elevated resting heart rate - may indicate incomplete recovery"
    );
  }
  if (breakdown.biometrics.sleepEfficiency < 80) {
    insights.push(
      "Sleep efficiency could be improved - focus on sleep hygiene"
    );
  }
  if (breakdown.lifestyle.hydration < 80) {
    insights.push("Increase water intake for better recovery");
  }
  if (breakdown.lifestyle.strain < 50) {
    insights.push("High strain yesterday - extra recovery time needed");
  }
  if (breakdown.lifestyle.alcohol < 90) {
    insights.push(
      "Alcohol consumption affecting recovery - consider reducing intake"
    );
  }

  return {
    recovery,
    category,
    recommendation,
    insights,
  };
};
