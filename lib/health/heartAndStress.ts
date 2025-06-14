import {
  getMostRecentQuantitySample,
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  HKUnits,
  queryQuantitySamples,
  queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit";
import { HeartRateSample, HeartStressStats } from "./types";
import {
  calculateHRMax,
  getCurrentDateRanges,
  normalize,
  roundTo,
} from "./utils";

// Constants for normalization ranges
const HRV_RANGE = { min: 20, max: 85 }; // Population-based HRV range in ms
const RHR_RANGE = { min: 40, max: 100 }; // Resting heart rate range
const RESP_RATE_RANGE = { min: 8, max: 20 }; // Respiratory rate range

// Recovery score weights
const RECOVERY_WEIGHTS = {
  HRV: 0.4,
  RHR: 0.2,
  RESP: 0.1,
  SLEEP: 0.2,
  STRAIN: 0.1,
};

// Stress level calculation constants
const STRESS_RATIO_BOUNDS = {
  low: 0.5, // RHR/HRV ratio indicating low stress
  high: 3.0, // RHR/HRV ratio indicating high stress
};

/**
 * Fetch heart rate, HRV, and stress-related statistics
 * - Resting heart rate, HRV data
 * - Recovery and strain scores
 * - Stress level calculation
 * - Blood oxygen saturation
 */
export const fetchHeartStressStats = async (
  age?: number | null
): Promise<HeartStressStats> => {
  const { now, startOfToday, oneDayAgo, oneWeekAgo } = getCurrentDateRanges();

  // Get resting heart rate (most recent)
  const restingHRSample = await getMostRecentQuantitySample(
    HKQuantityTypeIdentifier.restingHeartRate,
    "count/min"
  );
  const restingHeartRate = restingHRSample?.quantity ?? null;

  // Get HRV data for last week
  const hrvSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
    { from: oneWeekAgo, to: now }
  );
  const hrvValues = hrvSamples.map((s) => s.quantity);
  const { hrv7DayAvg, hrvMostRecent } = processHrv(hrvValues);

  // Get respiratory rate for recovery calculation
  const respStats = await queryStatisticsForQuantity(
    HKQuantityTypeIdentifier.respiratoryRate,
    [HKStatisticsOptions.discreteAverage],
    startOfToday,
    now
  );
  const respRate = respStats?.averageQuantity?.quantity ?? 15; // Default respiratory rate

  // Get heart rate samples for strain calculation
  const hrSamplesRaw = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRate,
    { from: oneDayAgo, to: now }
  );
  const hrSamples: HeartRateSample[] = hrSamplesRaw.map((h) => ({
    timestamp: new Date(h.startDate),
    value: h.quantity,
  }));

  // Get blood oxygen saturation
  const spo2Sample = await getMostRecentQuantitySample(
    HKQuantityTypeIdentifier.oxygenSaturation,
    HKUnits.Percent
  );
  const bloodOxygen = spo2Sample
    ? { value: spo2Sample.quantity, date: new Date(spo2Sample.endDate) }
    : null;

  // Calculate metrics with improved algorithms
  const recoveryScore = calculateRecoveryScore(
    hrvValues,
    restingHeartRate || 60, // Default RHR if null
    respRate,
    85, // Default sleep efficiency - will be overridden by sleep module
    50 // Default prior strain - TODO: persist from previous day
  );

  // Use dynamic HRmax calculation
  const hrMax = calculateHRMax(age ?? null);
  const strainScore = calculateStrainScore(
    hrSamples,
    hrMax,
    restingHeartRate || 60
  );

  const stressLevel = calculateStressLevel(restingHeartRate, hrv7DayAvg);

  return {
    restingHeartRate,
    hrv7DayAvg,
    hrvMostRecent,
    hrvValues,
    recoveryScore,
    strainScore,
    stressLevel,
    bloodOxygen,
  };
};

/**
 * Calculate recovery score
 * Weighted average of HRV, Resting HR (inverse), Resp Rate (inverse),
 * Sleep Efficiency, Prior Strain (inverse)
 */
export const calculateRecoveryScore = (
  hrv: number[], // ms SDNN over last night
  restingHR: number, // bpm
  respRate: number, // breaths/min
  sleepEff: number, // %
  priorStrain: number // 0–100
): number => {
  if (hrv.length === 0) return 0;

  const latestHRV = hrv[hrv.length - 1] || hrv[0] || 0;

  // Use absolute population-based normalization for HRV
  const normHRV = normalize(latestHRV, HRV_RANGE.min, HRV_RANGE.max);
  const normRHR = 100 - normalize(restingHR, RHR_RANGE.min, RHR_RANGE.max); // lower HR better
  const normResp =
    100 - normalize(respRate, RESP_RATE_RANGE.min, RESP_RATE_RANGE.max); // lower RR better
  const normSleep = Math.max(0, Math.min(100, sleepEff)); // ensure 0-100 range
  const normStrainInv = 100 - Math.max(0, Math.min(100, priorStrain)); // high strain reduces readiness

  // weights: HRV 40%, RHR 20%, Resp 10%, Sleep 20%, Strain 10%
  const score =
    normHRV * RECOVERY_WEIGHTS.HRV +
    normRHR * RECOVERY_WEIGHTS.RHR +
    normResp * RECOVERY_WEIGHTS.RESP +
    normSleep * RECOVERY_WEIGHTS.SLEEP +
    normStrainInv * RECOVERY_WEIGHTS.STRAIN;

  return roundTo(score, 1);
};

/**
 * Calculate strain score using heart rate zones with HRR (Karvonen method)
 * Sum of (minutes_in_zone × zone_index) ÷ 60
 * Zones based on Heart Rate Reserve for more accuracy
 */
export const calculateStrainScore = (
  hrSamples: HeartRateSample[],
  hrMax: number,
  restingHR: number = 60
): number => {
  if (hrSamples.length < 2) return 0;

  const hrReserve = hrMax - restingHR;
  let weightedMinSum = 0;

  for (let i = 1; i < hrSamples.length; i++) {
    const prev = hrSamples[i - 1];
    const curr = hrSamples[i];
    const minutes =
      (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000 / 60;

    // Use Heart Rate Reserve (Karvonen method) for more accurate zones
    const hrr = (prev.value - restingHR) / hrReserve;
    const pct = Math.max(0, Math.min(1, hrr)); // Clamp to [0, 1]

    let zone = 0;
    if (pct < 0.5) zone = 1; // Easy (50-60% HRR)
    else if (pct < 0.6) zone = 2; // Moderate (60-70% HRR)
    else if (pct < 0.7) zone = 3; // Vigorous (70-80% HRR)
    else if (pct < 0.8) zone = 4; // Hard (80-90% HRR)
    else zone = 5; // Maximum (90%+ HRR)

    weightedMinSum += zone * minutes;
  }

  return roundTo(weightedMinSum / 60, 1);
};

/**
 * Calculate stress level using RHR to HRV ratio
 * Higher RHR and lower HRV indicate higher physiological stress
 */
export const calculateStressLevel = (
  restingHeartRate: number | null,
  hrv: number | null
): number => {
  if (!restingHeartRate || !hrv || hrv === 0) return 0;

  // A higher ratio suggests more stress. Normalize this to a 0-100 scale.
  // A typical RHR/HRV ratio for healthy adults might be 1.0-2.0. A ratio > 2.5 could indicate high stress.
  const ratio = restingHeartRate / hrv;

  // Let's map a ratio of 0.5 to 0 (very low stress) and 3.0 to 100 (high stress).
  const stressScore =
    ((ratio - STRESS_RATIO_BOUNDS.low) /
      (STRESS_RATIO_BOUNDS.high - STRESS_RATIO_BOUNDS.low)) *
    100;

  return Math.max(0, Math.min(100, roundTo(stressScore, 1)));
};

/**
 * Process HRV values to get 7-day average and most recent
 */
export const processHrv = (hrvValues: number[]) => {
  if (hrvValues.length === 0) {
    return { hrv7DayAvg: 0, hrvMostRecent: 0 };
  }
  const hrv7DayAvg =
    hrvValues.reduce((sum, val) => sum + val, 0) / hrvValues.length;
  const hrvMostRecent = hrvValues[hrvValues.length - 1];
  return { hrv7DayAvg, hrvMostRecent };
};
