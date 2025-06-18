import { mean } from "@/utils/dates";
import {
  getMostRecentQuantitySample,
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  queryQuantitySamples,
  queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit";

import { HealthDataDefaults, RecoveryAverages, UserParams } from "./types";
import {
  calculateAverage,
  getCurrentDateRanges,
  getDateRange,
  getDateRanges,
  getDatesArray,
  getExtendedDateRanges,
} from "./utils";

export interface RecoveryCalculationOptions {
  defaults?: HealthDataDefaults;
  sleepEfficiency?: number;
  targetDate?: Date;
  userParams?: UserParams;
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

/**
 * Fetch recovery data directly from HealthKit and calculate comprehensive recovery score
 * Includes biometric data (HRV, RHR, respiratory rate, sleep efficiency)
 * and lifestyle factors (hydration, alcohol, nutrition, strain)
 */

export async function calculateRecoveryScore(
  options: RecoveryCalculationOptions = {}
): Promise<RecoveryScoreResult> {
  const targetDate = options.targetDate;
  let now: Date, startOfDay: Date, oneWeekAgo: Date, fourteenDaysAgo: Date;

  if (targetDate) {
    const ranges = getDateRanges(targetDate);
    const extendedRanges = getExtendedDateRanges(targetDate);
    now = ranges.endOfTargetDay;
    startOfDay = ranges.startOfTargetDay;
    oneWeekAgo = ranges.oneWeekAgo;
    fourteenDaysAgo = extendedRanges.fourteenDaysAgo;
  } else {
    const ranges = getCurrentDateRanges();
    const extendedRanges = getExtendedDateRanges();
    now = ranges.now;
    startOfDay = ranges.startOfToday;
    oneWeekAgo = ranges.oneWeekAgo;
    fourteenDaysAgo = extendedRanges.fourteenDaysAgo;
  }

  // Fetch all required health data in parallel
  const [
    restingHRSample,
    hrvSamples,
    respiratoryStats,
    activeEnergyStats,
    baselineHrvSamples,
    baselineRhrSamples,
  ] = await Promise.all([
    // Current resting heart rate
    getMostRecentQuantitySample(
      HKQuantityTypeIdentifier.restingHeartRate,
      "count/min"
    ),
    // HRV data for last week (for current value)
    queryQuantitySamples(HKQuantityTypeIdentifier.heartRateVariabilitySDNN, {
      from: oneWeekAgo,
      to: now,
    }),
    // Respiratory rate for the target day (may not be available)
    queryStatisticsForQuantity(
      HKQuantityTypeIdentifier.respiratoryRate,
      [HKStatisticsOptions.discreteAverage],
      startOfDay,
      now
    ).catch((error) => {
      console.warn("Respiratory rate data not available:", error);
      return null;
    }),
    // Active energy burned for the target day
    queryStatisticsForQuantity(
      HKQuantityTypeIdentifier.activeEnergyBurned,
      [HKStatisticsOptions.cumulativeSum],
      startOfDay,
      now
    ),
    // 14-day HRV baseline
    queryQuantitySamples(HKQuantityTypeIdentifier.heartRateVariabilitySDNN, {
      from: fourteenDaysAgo,
      to: now,
    }),
    // 14-day RHR baseline
    queryQuantitySamples(HKQuantityTypeIdentifier.restingHeartRate, {
      from: fourteenDaysAgo,
      to: now,
    }),
  ]);
  // Validate and process fetched data
  const restingHR =
    restingHRSample?.quantity || options.defaults?.RESTING_HEART_RATE || 60;

  const hrvValues = hrvSamples.map((s) => s.quantity);
  // Use configurable minimum samples threshold
  const minSamples = options.userParams?.hrvDataMinimumSamples || 7;
  if (hrvValues.length < minSamples) {
    console.warn(
      `⚠️ Limited HRV data: only ${hrvValues.length} samples in the last week`
    );
  }
  const currentHrv = hrvValues.length > 0 ? mean(hrvValues) : (options.defaults?.HRV_BASELINE || 45); // Use configurable default

  // Respiratory rate validation - handle null/empty response
  const hasRespiratoryData = respiratoryStats?.averageQuantity?.quantity;
  const respiratoryRate =
    hasRespiratoryData || options.defaults?.RESPIRATORY_RATE || 15;

  const sleepEfficiency =
    options.sleepEfficiency || options.defaults?.SLEEP_EFFICIENCY || 85;

  const activeEnergyBurned = activeEnergyStats?.sumQuantity?.quantity || 0;

  // Calculate baselines for comparison
  const baselineHrvValues = baselineHrvSamples.map((s) => s.quantity);
  const baselineHrv =
    baselineHrvValues.length > 0 ? mean(baselineHrvValues) : undefined;

  const baselineRhrValues = baselineRhrSamples.map((s) => s.quantity);
  const baselineRhr =
    baselineRhrValues.length > 0 ? mean(baselineRhrValues) : undefined;

  // Calculate user-specific targets and baselines
  const getUserSpecificTargets = () => {
    const userParams = options.userParams;

    // Calculate personalized water target based on weight and activity
    let waterTarget = options.defaults?.WATER_TARGET || 2500;
    if (userParams?.weight) {
      // Configurable formula: ml per kg body weight
      const waterPerKg = userParams?.waterIntakePerKg || 35;
      waterTarget = Math.round(userParams.weight * waterPerKg);
    }
    if (userParams?.dailyWaterTarget) {
      waterTarget = userParams.dailyWaterTarget;
    }

    // Calculate personalized calorie target based on user stats
    let calorieTarget = options.defaults?.CALORIE_TARGET || 1800;
    if (userParams?.weight && userParams?.height && userParams?.age) {
      // Configurable BMR calculation (Mifflin-St Jeor equation)
      const genderAdjustment = userParams?.bmrGenderAdjustment || 5; // +5 for males, -161 for females
      const bmr = 10 * userParams.weight + 6.25 * userParams.height - 5 * userParams.age + genderAdjustment;

      // Use configurable activity multipliers
      const defaultMultipliers = {
        'beginner': 1.2,
        'intermediate': 1.375,
        'advanced': 1.55,
        'elite': 1.725,
      };
      const activityMultipliers = userParams?.bmrActivityMultipliers || defaultMultipliers;
      const activityMultiplier = activityMultipliers[userParams.fitnessLevel || 'intermediate'];

      // Use configurable caloric deficit percentage
      const deficitPercentage = userParams?.caloricDeficitPercentage || 0.85;
      calorieTarget = Math.round(bmr * activityMultiplier * deficitPercentage);
    }
    if (userParams?.dailyCalorieTarget) {
      calorieTarget = userParams.dailyCalorieTarget;
    }

    // Use configurable strain thresholds based on fitness level
    const getStrainThresholds = (level: string) => {
      const defaultThresholds = {
        'elite': { low: 700, high: 1400 },
        'advanced': { low: 600, high: 1200 },
        'intermediate': { low: 500, high: 1000 },
        'beginner': { low: 400, high: 800 },
      };

      const configuredThresholds = userParams?.strainThresholds || defaultThresholds;
      return configuredThresholds[level as keyof typeof configuredThresholds] || defaultThresholds.intermediate;
    };

    const strainThresholds = getStrainThresholds(userParams?.fitnessLevel || 'intermediate');

    return {
      waterTarget,
      calorieTarget,
      strainLow: strainThresholds.low,
      strainHigh: strainThresholds.high,
    };
  };

  const targets = getUserSpecificTargets();

  // Use configurable water intake assumption when no data available
  const waterIntakeAssumption = options.userParams?.waterIntakeAssumption || 0.8;
  const waterIntake = options.defaults?.DAILY_WATER_INTAKE || targets.waterTarget * waterIntakeAssumption;
  const alcoholDrinks = options.defaults?.DAILY_ALCOHOL_DRINKS || 0;
  const caloriesConsumed = options.defaults?.DAILY_CALORIES_CONSUMED || targets.calorieTarget;

  // Extract configuration constants with user-specific fallbacks
  const normativeHrv = options.userParams?.baselineHRV || options.defaults?.NORMATIVE_HRV || 45;
  const waterTarget = targets.waterTarget;
  const calorieTarget = targets.calorieTarget;
  const strainLow = targets.strainLow;
  const strainHigh = targets.strainHigh;
  const respBase = options.defaults?.RESPIRATORY_BASELINE || 16;

  // Use configurable alcohol penalty based on user weight
  let alcoholPenalty = options.userParams?.alcoholPenaltyPerDrink || options.defaults?.ALCOHOL_PENALTY_PER_DRINK || 50;
  if (options.userParams?.weight) {
    // Use configurable weight sensitivity for alcohol
    const sensitivity = options.userParams?.alcoholWeightSensitivity || {
      baseWeight: 70, // kg
      minMultiplier: 0.5,
      maxMultiplier: 1.5,
    };

    const weightFactor = Math.max(
      sensitivity.minMultiplier,
      Math.min(sensitivity.maxMultiplier, sensitivity.baseWeight / options.userParams.weight)
    );
    alcoholPenalty = Math.round(alcoholPenalty * weightFactor);
  }
  // 1. Normalize biometric metrics with user-specific baselines
  const baselines = {
    hrv: options.userParams?.baselineHRV || baselineHrv,
    restingHR: options.userParams?.baselineRHR || baselineRhr,
  };

  // HRV: higher is better. Use personal baseline if available, with age adjustment
  let hrvBaseline = baselines.hrv ?? 50;

  // Age-adjusted HRV baseline if user age is provided but no personal baseline
  if (!baselines.hrv && options.userParams?.age) {
    // Use configurable HRV age decline rate
    const declineRate = options.userParams?.hrvAgeDeclineRate || 0.5; // per year above 25
    const ageAdjustedHRV = Math.max(25, 60 - (options.userParams.age - 25) * declineRate);
    hrvBaseline = ageAdjustedHRV;
  }

  let hrvScore = (currentHrv / hrvBaseline) * 100;

  // Use configurable baseline comparison threshold
  const baselineMinSamples = options.userParams?.hrvDataMinimumSamples || 14;
  if (baselineHrvValues.length < baselineMinSamples && Math.abs(currentHrv - hrvBaseline) < 1) {
    hrvScore = (currentHrv / normativeHrv) * 100;
  }

  if (currentHrv >= hrvBaseline) hrvScore = 100;
  hrvScore = clampPercent(hrvScore);

  // Resting Heart Rate (RHR): lower is better, with age and fitness adjustments
  let rhrBaseline = baselines.restingHR ?? 60;

  // Age and fitness-adjusted RHR baseline if no personal baseline
  if (!baselines.restingHR && options.userParams?.age) {
    const baseRHR = options.userParams?.hrBaselineValue || 60; // configurable baseline for reference age
    const referenceAge = options.userParams?.hrBaselineAgeReference || 30;
    const ageAdjustment = (options.userParams.age - referenceAge) * (options.userParams?.rhrAgeIncreaseRate || 0.2);

    // Use configurable fitness level adjustments
    const defaultFitnessAdjustments = {
      'elite': -15,
      'advanced': -10,
      'intermediate': -5,
      'beginner': 0,
    };
    const fitnessAdjustments = options.userParams?.fitnessRhrAdjustments || defaultFitnessAdjustments;
    const fitnessAdjustment = fitnessAdjustments[options.userParams?.fitnessLevel || 'intermediate'];

    rhrBaseline = Math.max(40, baseRHR + ageAdjustment + fitnessAdjustment);
  }

  let rhrScore = (rhrBaseline / restingHR) * 100;
  if (restingHR <= rhrBaseline) rhrScore = 100;
  rhrScore = clampPercent(rhrScore);

  // Respiratory Rate: lower (within normal range) is better
  let respiratoryScore = (respBase / respiratoryRate) * 100;
  if (respiratoryRate <= respBase) respiratoryScore = 100;

  if (!hasRespiratoryData) {
    const penaltyPercent = options.userParams?.respiratoryPenaltyForMissing || 75;
    respiratoryScore = Math.min(respiratoryScore, penaltyPercent);
  }

  respiratoryScore = clampPercent(respiratoryScore);

  // Sleep Efficiency: already a percentage. Compare to baseline or use directly.
  const sleepEffBase = 100; // ideal 100%
  let sleepEffScore = (sleepEfficiency / sleepEffBase) * 100;
  if (sleepEfficiency >= sleepEffBase) sleepEffScore = 100;
  sleepEffScore = clampPercent(sleepEffScore);

  // 2. Normalize lifestyle metrics against healthy thresholds
  // Hydration (daily water) – compare to target
  let hydrationScore = (waterIntake / waterTarget) * 100;
  hydrationScore = clampPercent(hydrationScore);

  // Alcohol – 0 drinks ideal. Use configurable threshold for zero score.
  let alcoholScore = 100 - alcoholDrinks * alcoholPenalty;
  const maxAlcoholDrinks = options.userParams?.maxAlcoholForZeroScore || 2;
  if (alcoholDrinks >= maxAlcoholDrinks) alcoholScore = 0;
  alcoholScore = clampPercent(alcoholScore);

  // Nutrition (calories) – compare to minimum target
  let nutritionScore = (caloriesConsumed / calorieTarget) * 100;
  nutritionScore = clampPercent(nutritionScore);

  // Strain (active energy) – full score if <=low threshold, zero if >=high threshold, linear in between
  let strainScore: number;
  if (activeEnergyBurned <= strainLow) {
    strainScore = 100;
  } else if (activeEnergyBurned >= strainHigh) {
    strainScore = 0;
  } else {
    // interpolate between low and high thresholds
    const excess = activeEnergyBurned - strainLow;
    strainScore = 100 - (excess / (strainHigh - strainLow)) * 100;
  }
  strainScore = clampPercent(strainScore);

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
}

/*

LOG  🔄 Starting recovery score calculation...
 LOG  📅 Date ranges for recovery calculation: {"fourteenDaysAgo": "2025-06-03T08:54:34.287Z", "now": "2025-06-17T08:54:34.287Z", "oneWeekAgo": "2025-06-10T08:54:34.287Z", "startOfToday": "2025-06-16T22:00:00.000Z"}
 WARN  ⚠️ Limited HRV data: only 4 samples in the last week
 LOG  🩺 Processed recovery data: {"activeEnergyBurned": "509.7 Cal", "currentHrv": "42.3 ms (from 4 samples)", "hrvSamplesCount": 4, "respiratoryDataAvailable": false, "respiratoryRate": "15 breaths/min (using default)", "restingHR": "58 bpm", "sleepEfficiency": "88% "}
 LOG  📊 Baseline calculations: {"baselineHrv": "42.3 ms (from 4 samples)", "baselineRhr": "59.9 bpm (from 13 samples)", "hrvBaseline14Day": [41, 41, 43, 44], "rhrBaseline14Day": [61, 59, 60, 60, 63, 61, 61, 59, 59, 60, 59, 59, 58]}
 LOG  🎯 Recovery score calculations: {"biometrics": {"HRV": "100% (42.3ms vs baseline 42.3ms)", "RHR": "100% (58bpm vs baseline 59.9bpm)", "respiratory": "100% (15 vs baseline 16)", "sleep": "88% (88%)"}, "lifestyle": {"alcohol": "100% (0 drinks)", "hydration": "80% (2000ml vs target 2500ml)", "nutrition": "100% (2000 vs target 1800 kcal)", "strain": "98% (509.7 vs low 500 kcal)"}, "totals": {"biometricScore": 97, "lifestyleScore": 95, "totalScore": 96}}
 LOG  ✅ Recovery calculation completed successfully
 LOG  🔍 Recovery score breakdown {
  "totalScore": 96,
  "biometricScore": 97,
  "lifestyleScore": 95,
  "breakdown": {
    "biometrics": {
      "HRV": 100,
      "RHR": 100,
      "respiratoryRate": 100,
      "sleepEfficiency": 88
    },
    "lifestyle": {
      "hydration": 80,
      "alcohol": 100,
      "nutrition": 100,
      "strain": 98
    }
  }
}
*/

/**
 * Fetch recovery averages for 14 and 30 day periods relative to a target date
 */
export const fetchRecoveryAverages = async (
  defaults?: HealthDataDefaults,
  targetDate?: Date
): Promise<{
  last14Days: RecoveryAverages;
  last30Days: RecoveryAverages;
}> => {
  const range14Days = getDateRange(14, targetDate);
  const range30Days = getDateRange(30, targetDate);

  const calculate14DayAverage = async () => {
    const dates = getDatesArray(range14Days.from, range14Days.to);
    const recoveryScores: number[] = [];

    for (const date of dates) {
      try {
        // Calculate daily recovery score for each specific date
        const recoveryResult = await calculateRecoveryScore({
          defaults,
          targetDate: date
        });
        recoveryScores.push(recoveryResult.totalScore);
      } catch (error) {
        console.warn(`Failed to calculate recovery for ${date}:`, error);
      }
    }

    const avgScore = calculateAverage(recoveryScores);
    return { score: Math.round(avgScore) };
  };

  const calculate30DayAverage = async () => {
    const dates = getDatesArray(range30Days.from, range30Days.to);
    const recoveryScores: number[] = [];

    for (const date of dates) {
      try {
        const recoveryResult = await calculateRecoveryScore({
          defaults,
          targetDate: date
        });
        recoveryScores.push(recoveryResult.totalScore);
      } catch (error) {
        console.warn(`Failed to calculate recovery for ${date}:`, error);
      }
    }

    const avgScore = calculateAverage(recoveryScores);
    return { score: Math.round(avgScore) };
  };

  return {
    last14Days: await calculate14DayAverage(),
    last30Days: await calculate30DayAverage(),
  };
};

/**
 * Calculate recovery score with personalized user parameters
 * This function provides a convenient way to calculate recovery with user-specific defaults
 */
export async function calculatePersonalizedRecovery(
  userParams?: UserParams,
  targetDate?: Date
): Promise<RecoveryScoreResult> {
  return calculateRecoveryScore({
    userParams,
    targetDate,
    sleepEfficiency: userParams?.sleepEfficiency,
  });
}

/**
 * Get recovery metrics with enhanced breakdown and recommendations
 */
export async function getRecoveryMetrics(
  userParams?: UserParams,
  targetDate?: Date
): Promise<{
  recovery: RecoveryScoreResult;
  category: string;
  recommendation: string;
  insights: string[];
}> {
  const recovery = await calculatePersonalizedRecovery(userParams, targetDate);

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
    recommendation = "Poor recovery. Prioritize sleep, hydration, and complete rest.";
  }

  // Generate specific insights based on breakdown
  const { breakdown } = recovery;

  if (breakdown.biometrics.HRV < 70) {
    insights.push("HRV below optimal - consider stress management and better sleep");
  }
  if (breakdown.biometrics.RHR < 70) {
    insights.push("Elevated resting heart rate - may indicate incomplete recovery");
  }
  if (breakdown.biometrics.sleepEfficiency < 80) {
    insights.push("Sleep efficiency could be improved - focus on sleep hygiene");
  }
  if (breakdown.lifestyle.hydration < 80) {
    insights.push("Increase water intake for better recovery");
  }
  if (breakdown.lifestyle.strain < 50) {
    insights.push("High strain yesterday - extra recovery time needed");
  }
  if (breakdown.lifestyle.alcohol < 90) {
    insights.push("Alcohol consumption affecting recovery - consider reducing intake");
  }

  return {
    recovery,
    category,
    recommendation,
    insights,
  };
}
