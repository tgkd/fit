import { mean } from "@/utils/dates";
import {
  getMostRecentQuantitySample,
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  queryQuantitySamples,
  queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit";

import { HealthDataDefaults } from "./types";
import { getCurrentDateRanges, getExtendedDateRanges } from "./utils";

export interface RecoveryCalculationOptions {
  defaults?: HealthDataDefaults;
  sleepEfficiency?: number;
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
  const { now, startOfToday, oneWeekAgo } = getCurrentDateRanges();
  const { fourteenDaysAgo } = getExtendedDateRanges();

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
    // Today's respiratory rate (may not be available)
    queryStatisticsForQuantity(
      HKQuantityTypeIdentifier.respiratoryRate,
      [HKStatisticsOptions.discreteAverage],
      startOfToday,
      now
    ).catch((error) => {
      console.warn("Respiratory rate data not available:", error);
      return null;
    }),
    // Today's active energy burned
    queryStatisticsForQuantity(
      HKQuantityTypeIdentifier.activeEnergyBurned,
      [HKStatisticsOptions.cumulativeSum],
      startOfToday,
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
  // Warn if HRV data is sparse
  if (hrvValues.length < 7) {
    console.warn(
      `⚠️ Limited HRV data: only ${hrvValues.length} samples in the last week`
    );
  }
  const currentHrv = hrvValues.length > 0 ? mean(hrvValues) : 45; // Use 7-day average

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

  // Use defaults for nutritional data (not available in current HealthKit library)
  const waterIntake = options.defaults?.DAILY_WATER_INTAKE || 2000;
  const alcoholDrinks = options.defaults?.DAILY_ALCOHOL_DRINKS || 0;
  const caloriesConsumed = options.defaults?.DAILY_CALORIES_CONSUMED || 2000;

  // Extract configuration constants with fallbacks
  const normativeHrv = options.defaults?.NORMATIVE_HRV || 45;
  const waterTarget = options.defaults?.WATER_TARGET || 2500;
  const calorieTarget = options.defaults?.CALORIE_TARGET || 1800;
  const strainLow = options.defaults?.STRAIN_LOW_THRESHOLD || 500;
  const strainHigh = options.defaults?.STRAIN_HIGH_THRESHOLD || 1000;
  const respBase = options.defaults?.RESPIRATORY_BASELINE || 16;
  const alcoholPenalty = options.defaults?.ALCOHOL_PENALTY_PER_DRINK || 50;
  // 1. Normalize biometric metrics with baseline references or healthy defaults
  const baselines = {
    hrv: baselineHrv,
    restingHR: baselineRhr,
  };

  // HRV: higher is better. Use personal baseline if available.
  const hrvBaseline = baselines.hrv ?? 50; // default 50ms if no baseline
  let hrvScore = (currentHrv / hrvBaseline) * 100;

  if (baselineHrvValues.length < 14 && Math.abs(currentHrv - hrvBaseline) < 1) {
    hrvScore = (currentHrv / normativeHrv) * 100;
  }

  if (currentHrv >= hrvBaseline) hrvScore = 100; // cap at baseline or above
  hrvScore = clampPercent(hrvScore);

  // Resting Heart Rate (RHR): lower is better.
  const rhrBaseline = baselines.restingHR ?? 60; // default 60 BPM baseline
  let rhrScore = (rhrBaseline / restingHR) * 100;
  if (restingHR <= rhrBaseline) rhrScore = 100; // if current RHR is at or below baseline
  rhrScore = clampPercent(rhrScore);

  // Respiratory Rate: lower (within normal range) is better.
  let respiratoryScore = (respBase / respiratoryRate) * 100;
  if (respiratoryRate <= respBase) respiratoryScore = 100;

  if (!hasRespiratoryData) {
    respiratoryScore = Math.min(respiratoryScore, 75);
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

  // Alcohol – 0 drinks ideal. Deduct points per drink as a simple model.
  let alcoholScore = 100 - alcoholDrinks * alcoholPenalty;
  if (alcoholDrinks >= 2) alcoholScore = 0; // 2 or more drinks: 0%
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
