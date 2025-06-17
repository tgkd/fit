import { mean } from "@/utils/dates";
import {
  getMostRecentQuantitySample,
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  queryQuantitySamples,
  queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit";

import { getCurrentDateRanges, getExtendedDateRanges } from "./utils";

// Updated interface to include defaults for fallback values
interface RecoveryCalculationOptions {
  defaults?: {
    RESTING_HEART_RATE?: number;
    RESPIRATORY_RATE?: number;
    SLEEP_EFFICIENCY?: number;
    DAILY_WATER_INTAKE?: number; // ml
    DAILY_ALCOHOL_DRINKS?: number; // number of drinks
    DAILY_CALORIES_CONSUMED?: number; // kcal
  };
  sleepEfficiency?: number; // Can be passed in if already calculated
}

interface RecoveryScoreBreakdown {
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

interface RecoveryScoreResult {
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

  console.log("📅 Date ranges for recovery calculation:", {
    now: now.toISOString(),
    startOfToday: startOfToday.toISOString(),
    oneWeekAgo: oneWeekAgo.toISOString(),
    fourteenDaysAgo: fourteenDaysAgo.toISOString(),
  });

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
    console.warn(`⚠️ Limited HRV data: only ${hrvValues.length} samples in the last week`);
  }
  const currentHrv = hrvValues.length > 0 ? mean(hrvValues) : 45; // Use 7-day average

  // Respiratory rate validation - handle null/empty response
  const hasRespiratoryData = respiratoryStats?.averageQuantity?.quantity;
  const respiratoryRate = hasRespiratoryData || options.defaults?.RESPIRATORY_RATE || 15;

  const sleepEfficiency =
    options.sleepEfficiency || options.defaults?.SLEEP_EFFICIENCY || 85;

  const activeEnergyBurned = activeEnergyStats?.sumQuantity?.quantity || 0;

  console.log("🩺 Processed recovery data:", {
    restingHR: `${restingHR} bpm`,
    currentHrv: `${currentHrv.toFixed(1)} ms (from ${hrvValues.length} samples)`,
    respiratoryRate: `${respiratoryRate} breaths/min ${!hasRespiratoryData ? '(using default)' : ''}`,
    sleepEfficiency: `${sleepEfficiency}% ${!options.sleepEfficiency ? '(using default)' : ''}`,
    activeEnergyBurned: `${activeEnergyBurned.toFixed(1)} Cal`,
    hrvSamplesCount: hrvValues.length,
    respiratoryDataAvailable: !!hasRespiratoryData,
  });

  // Calculate baselines for comparison
  const baselineHrvValues = baselineHrvSamples.map((s) => s.quantity);
  const baselineHrv =
    baselineHrvValues.length > 0 ? mean(baselineHrvValues) : undefined;

  const baselineRhrValues = baselineRhrSamples.map((s) => s.quantity);
  const baselineRhr =
    baselineRhrValues.length > 0 ? mean(baselineRhrValues) : undefined;

  console.log("📊 Baseline calculations:", {
    baselineHrv: baselineHrv ? `${baselineHrv.toFixed(1)} ms (from ${baselineHrvValues.length} samples)` : 'No baseline data',
    baselineRhr: baselineRhr ? `${baselineRhr.toFixed(1)} bpm (from ${baselineRhrValues.length} samples)` : 'No baseline data',
    hrvBaseline14Day: baselineHrvValues.length > 0 ? baselineHrvValues : [],
    rhrBaseline14Day: baselineRhrValues.length > 0 ? baselineRhrValues : [],
  });

  // Use defaults for nutritional data (not available in current HealthKit library)
  const waterIntake = options.defaults?.DAILY_WATER_INTAKE || 2000; // 2L default
  const alcoholDrinks = options.defaults?.DAILY_ALCOHOL_DRINKS || 0; // No alcohol default
  const caloriesConsumed = options.defaults?.DAILY_CALORIES_CONSUMED || 2000; // 2000 kcal default
  // 1. Normalize biometric metrics with baseline references or healthy defaults
  const baselines = {
    hrv: baselineHrv,
    restingHR: baselineRhr,
  };

  // HRV: higher is better. Use personal baseline if available.
  const hrvBaseline = baselines.hrv ?? 50; // default 50ms if no baseline
  let hrvScore = (currentHrv / hrvBaseline) * 100;

  // If baseline is from insufficient data (same as current), use a more conservative approach
  if (baselineHrvValues.length < 14 && Math.abs(currentHrv - hrvBaseline) < 1) {
    // Use age-based normative data instead of personal baseline
    const normativeHrv = 45; // Conservative normative value for adults
    hrvScore = (currentHrv / normativeHrv) * 100;
    console.log(`ℹ️ Using normative HRV baseline (${normativeHrv}ms) due to insufficient personal data`);
  }

  if (currentHrv >= hrvBaseline) hrvScore = 100; // cap at baseline or above
  hrvScore = clampPercent(hrvScore);

  // Resting Heart Rate (RHR): lower is better.
  const rhrBaseline = baselines.restingHR ?? 60; // default 60 BPM baseline
  let rhrScore = (rhrBaseline / restingHR) * 100;
  if (restingHR <= rhrBaseline) rhrScore = 100; // if current RHR is at or below baseline
  rhrScore = clampPercent(rhrScore);

  // Respiratory Rate: lower (within normal range) is better.
  const respBase = 16; // default 16 breaths/min
  let respiratoryScore = (respBase / respiratoryRate) * 100;
  if (respiratoryRate <= respBase) respiratoryScore = 100;

  // Penalize if using default respiratory data (not actual measurement)
  if (!hasRespiratoryData) {
    respiratoryScore = Math.min(respiratoryScore, 75); // Cap at 75% for default data
    console.log("ℹ️ Respiratory score capped at 75% due to missing data");
  }

  respiratoryScore = clampPercent(respiratoryScore);

  // Sleep Efficiency: already a percentage. Compare to baseline or use directly.
  const sleepEffBase = 100; // ideal 100%
  let sleepEffScore = (sleepEfficiency / sleepEffBase) * 100;
  if (sleepEfficiency >= sleepEffBase) sleepEffScore = 100;
  sleepEffScore = clampPercent(sleepEffScore);

  // 2. Normalize lifestyle metrics against healthy thresholds
  // Hydration (daily water) – compare to 2500ml target
  const waterTarget = 2500; // 2.5 L
  let hydrationScore = (waterIntake / waterTarget) * 100;
  hydrationScore = clampPercent(hydrationScore);

  // Alcohol – 0 drinks ideal. Deduct ~50 points per drink as a simple model.
  let alcoholScore = 100 - alcoholDrinks * 50;
  if (alcoholDrinks >= 2) alcoholScore = 0; // 2 or more drinks: 0%
  alcoholScore = clampPercent(alcoholScore);

  // Nutrition (calories) – compare to minimum 1800 kcal
  const calorieTarget = 1800;
  let nutritionScore = (caloriesConsumed / calorieTarget) * 100;
  nutritionScore = clampPercent(nutritionScore);

  // Strain (active energy) – full score if <=500 kcal, zero if >=1000 kcal, linear in between
  const strainLow = 500,
    strainHigh = 1000;
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

  console.log("🎯 Recovery score calculations:", {
    biometrics: {
      HRV: `${Math.round(hrvScore)}% (${currentHrv.toFixed(1)}ms vs baseline ${hrvBaseline.toFixed(1)}ms)`,
      RHR: `${Math.round(rhrScore)}% (${restingHR}bpm vs baseline ${rhrBaseline.toFixed(1)}bpm)`,
      respiratory: `${Math.round(respiratoryScore)}% (${respiratoryRate} vs baseline 16)`,
      sleep: `${Math.round(sleepEffScore)}% (${sleepEfficiency}%)`,
    },
    lifestyle: {
      hydration: `${Math.round(hydrationScore)}% (${waterIntake}ml vs target 2500ml)`,
      alcohol: `${Math.round(alcoholScore)}% (${alcoholDrinks} drinks)`,
      nutrition: `${Math.round(nutritionScore)}% (${caloriesConsumed} vs target 1800 kcal)`,
      strain: `${Math.round(strainScore)}% (${activeEnergyBurned.toFixed(1)} vs low 500 kcal)`,
    },
    totals: {
      biometricScore: Math.round(biometricScore),
      lifestyleScore: Math.round(lifestyleScore),
      totalScore: Math.round(totalScore),
    },
  });

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
