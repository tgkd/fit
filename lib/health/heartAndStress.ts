import { Colors } from "@/constants/Colors";
import {
  getMostRecentQuantitySample,
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  HKUnits,
  queryQuantitySamples,
  queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit";
import {
  HeartRateSample,
  HeartStressStats,
  HourlyHeartData, // Added
  StressChartDataPoint,
  StressChartDisplayData,
  StressMetrics,
  TimeInterval,
} from "./types";
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

/**
 * Enhanced stress calculation using 14-day baselines and hourly analysis
 * Based on personal baselines rather than population averages
 */

/**
 * Build 14-day average HRV baseline using daily samples
 */
export const getBaselineHRV = async (): Promise<number> => {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);

  // Get HRV samples for the last 14 days
  const hrvSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
    { from: fourteenDaysAgo, to: now }
  );

  if (hrvSamples.length === 0) return 0;

  // Group by day and calculate daily averages
  const dailyAverages = new Map<string, number[]>();

  hrvSamples.forEach((sample) => {
    const dayKey = new Date(sample.startDate).toDateString();
    if (!dailyAverages.has(dayKey)) {
      dailyAverages.set(dayKey, []);
    }
    dailyAverages.get(dayKey)!.push(sample.quantity);
  });

  // Calculate average of daily averages
  const dayAverages = Array.from(dailyAverages.values()).map(
    (dayValues) =>
      dayValues.reduce((sum, val) => sum + val, 0) / dayValues.length
  );

  return dayAverages.length > 0
    ? dayAverages.reduce((sum, avg) => sum + avg, 0) / dayAverages.length
    : 0;
};

/**
 * Build 14-day average resting heart rate baseline
 */
export const getBaselineRHR = async (): Promise<number> => {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);

  // Get daily resting heart rate statistics
  const dailyRHR: number[] = [];

  // Since we don't have queryStatisticsCollectionForQuantity, we'll query day by day
  for (let i = 0; i < 14; i++) {
    const dayStart = new Date(fourteenDaysAgo.getTime() + i * 24 * 3600 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

    try {
      const stats = await queryStatisticsForQuantity(
        HKQuantityTypeIdentifier.restingHeartRate,
        [HKStatisticsOptions.discreteAverage],
        dayStart,
        dayEnd
      );

      if (stats?.averageQuantity?.quantity) {
        dailyRHR.push(stats.averageQuantity.quantity);
      }
    } catch {
      // Skip days with no data
      continue;
    }
  }

  return dailyRHR.length > 0
    ? dailyRHR.reduce((sum, rhr) => sum + rhr, 0) / dailyRHR.length
    : 60; // Default RHR if no data
};

/**
 * Sample hourly average HR & HRV for the current day
 */
export const getHourlyHRandHRV = async (): Promise<HourlyHeartData[]> => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const hourlyData: HourlyHeartData[] = [];
  const currentHour = now.getHours();

  // Query hour by hour since we don't have queryStatisticsCollectionForQuantity
  for (let hour = 0; hour <= currentHour; hour++) {
    const hourStart = new Date(startOfToday);
    hourStart.setHours(hour);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hour + 1);

    try {
      // Get heart rate stats for this hour
      const hrStats = await queryStatisticsForQuantity(
        HKQuantityTypeIdentifier.heartRate,
        [HKStatisticsOptions.discreteAverage],
        hourStart,
        hourEnd
      );

      // Get HRV stats for this hour
      const hrvStats = await queryStatisticsForQuantity(
        HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
        [HKStatisticsOptions.discreteAverage],
        hourStart,
        hourEnd
      );

      const hr = hrStats?.averageQuantity?.quantity ?? 0;
      const hrv = hrvStats?.averageQuantity?.quantity ?? 0;

      if (hr > 0) {
        // Only include hours with heart rate data
        hourlyData.push({
          hourStart,
          hr,
          hrv,
        });
      }
    } catch {
      // Skip hours with no data
      continue;
    }
  }

  return hourlyData;
};

/**
 * Compute stress level for a single moment using baseline comparison
 * Returns a value between 0-3 where:
 * 0 = no stress, 1 = low stress, 2 = moderate stress, 3 = high stress
 */
export const computeStressMoment = (
  currentHR: number,
  currentHRV: number,
  baselineRHR: number,
  baselineHRV: number
): number => {
  // HRV stress: how far below baseline (0 = no drop, 1 = 100% drop)
  const hrvStress =
    baselineHRV > 0 ? Math.max(0, 1 - currentHRV / baselineHRV) : 0;

  // HR stress: how far above resting HR (0 = at or below baseline, 1 = +50% above baseline)
  const hrDelta = currentHR - baselineRHR;
  const hrStress =
    baselineRHR > 0
      ? Math.max(0, Math.min(1, hrDelta / (baselineRHR * 0.5)))
      : 0;

  // Average and scale to 0–3
  const raw = ((hrvStress + hrStress) / 2) * 3;
  return parseFloat(Math.max(0, Math.min(3, raw)).toFixed(2));
};

/**
 * Helper: detect if a timestamp falls in any interval
 */
export const isInIntervals = (t: Date, intervals: TimeInterval[]): boolean => {
  return intervals.some((iv) => t >= iv.start && t < iv.end);
};

/**
 * Main enhanced stress calculation function
 * Returns comprehensive stress metrics based on personal baselines
 */
export const calculateStressMetrics = async (): Promise<StressMetrics> => {
  // Calculate 14-day baselines
  const [baselineHRV, baselineRHR] = await Promise.all([
    getBaselineHRV(),
    getBaselineRHR(),
  ]);

  // Get hourly HR & HRV data for today
  const hourlyData = await getHourlyHRandHRV();

  // TODO: Add sleep and workout interval detection
  // For now, we'll use empty arrays and implement these later
  const sleepIntervals: TimeInterval[] = [];
  const workoutIntervals: TimeInterval[] = [];

  // Calculate hourly stress levels
  const hourlyStress = hourlyData.map((h) => ({
    hourStart: h.hourStart,
    stress: computeStressMoment(h.hr, h.hrv, baselineRHR, baselineHRV),
  }));

  // Aggregate stress metrics
  const allStressValues = hourlyStress.map((h) => h.stress);
  const totalDayStress =
    allStressValues.length > 0
      ? allStressValues.reduce((sum, stress) => sum + stress, 0) /
        allStressValues.length
      : 0;

  // Sleep stress (hours during sleep intervals)
  const sleepStressValues = hourlyStress
    .filter((h) => isInIntervals(h.hourStart, sleepIntervals))
    .map((h) => h.stress);
  const sleepStress =
    sleepStressValues.length > 0
      ? sleepStressValues.reduce((sum, stress) => sum + stress, 0) /
        sleepStressValues.length
      : 0;

  // Non-activity stress (hours not during sleep or workouts)
  const nonActivityStressValues = hourlyStress
    .filter(
      (h) =>
        !isInIntervals(h.hourStart, sleepIntervals) &&
        !isInIntervals(h.hourStart, workoutIntervals)
    )
    .map((h) => h.stress);
  const nonActivityStress =
    nonActivityStressValues.length > 0
      ? nonActivityStressValues.reduce((sum, stress) => sum + stress, 0) /
        nonActivityStressValues.length
      : 0;

  return {
    baselineHRV: roundTo(baselineHRV, 1),
    baselineRHR: roundTo(baselineRHR, 1),
    totalDayStress: parseFloat(totalDayStress.toFixed(2)),
    sleepStress: parseFloat(sleepStress.toFixed(2)),
    nonActivityStress: parseFloat(nonActivityStress.toFixed(2)),
    hourlyStress,
  };
};

// --- Functions for StressMonitorCard --- START ---

// Legacy function, keep for fallback
function calculatePointStressFromHRV(hrv: number, restingHR: number): number {
  if (hrv === 0 || restingHR === 0) return 2; // Default to medium if data is missing
  const ratio = restingHR / hrv;
  // Scale ratio (0.5-3.0) to stress (0-4)
  const stress = ((ratio - 0.5) / (3.0 - 0.5)) * 4;
  return Math.max(0, Math.min(4, stress)); // Clamp between 0 and 4
}

// Legacy function, keep for fallback
function generateStressChartDataFromHRV(
  hrvValues: number[],
  restingHeartRate: number | null
): StressChartDataPoint[] {
  const rhr = restingHeartRate || 60; // Default RHR if null
  const today = new Date();

  if (!hrvValues || hrvValues.length === 0) {
    return [];
  }

  const recentHrvValues = hrvValues.slice(-7);

  return recentHrvValues.map((hrv, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (recentHrvValues.length - 1 - index));
    return {
      time: index, // Use index for x-axis in this legacy mode
      stress: calculatePointStressFromHRV(hrv, rhr),
      timestamp: date.toLocaleDateString("en-US", { // For display
        month: "short",
        day: "numeric",
      }),
    };
  });
}

export const prepareStressChartDisplayData = (
  hrvValues: number[] | undefined,
  restingHeartRate: number | null | undefined,
  overallStressLevelFromContext: number | undefined, // 0-100 scale
  stressDetails: StressMetrics | null | undefined
): StressChartDisplayData => {
  let chartPlotData: StressChartDataPoint[] = [];
  let currentStressForVisualization: number = 0;
  let yDomainForVisualization: [number, number] = [0, 4]; // Default for HRV based (0-4)
  let xAxisDataType: "hourly" | "daily" = "daily"; // Default for HRV based

  // 1. Prioritize stressDetails.hourlyStress
  if (
    stressDetails &&
    stressDetails.hourlyStress &&
    stressDetails.hourlyStress.length > 0
  ) {
    chartPlotData = stressDetails.hourlyStress.map((item) => ({
      time: new Date(item.hourStart).getTime(), // Use timestamp for x-axis
      stress: item.stress, // This is on a 0-3 scale
      timestamp: new Date(item.hourStart), // For display
    }));
    currentStressForVisualization = stressDetails.totalDayStress; // Also 0-3 scale
    yDomainForVisualization = [0, 3.5]; // Max is 3, add padding
    xAxisDataType = "hourly";
  }
  // 2. Fallback to HRV-based data
  else if (hrvValues && hrvValues.length > 0) {
    chartPlotData = generateStressChartDataFromHRV(
      hrvValues,
      restingHeartRate ?? null
    );
    // overallStressLevelFromContext is 0-100, scale to 0-4 for this chart
    currentStressForVisualization = (overallStressLevelFromContext ?? 0) / 25;
    yDomainForVisualization = [0, 4]; // Max is 4
    xAxisDataType = "daily";
  }
  // If neither, chartPlotData remains empty.

  const lastUpdatedDisplay = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    chartPlotData,
    currentStressForVisualization,
    yDomainForVisualization,
    xAxisDataType,
    lastUpdatedDisplay,
  };
};

// --- Functions for StressMonitorCard --- END ---

export function getStressColor(stressLevel: number): string {
  if (stressLevel < 1) return Colors.hrv.excellent;
  if (stressLevel < 2) return Colors.hrv.good;
  return Colors.hrv.poor;
}
