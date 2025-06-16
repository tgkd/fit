import { Colors } from "@/constants/Colors";
import { bucketBy, mean } from "@/utils/dates";
import {
  getMostRecentQuantitySample,
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  HKUnits,
  queryQuantitySamples,
  queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit";
import {
  HeartStressStats,
  HourlyHeartData, // Added
  StressChartDataPoint,
  StressChartDisplayData,
  StressMetrics,
  TimeInterval,
} from "./types";
import {
  createHourStart,
  formatDateDisplay,
  formatHourDisplay,
  formatTimeDisplay,
  getCurrentDateRanges,
  getExtendedDateRanges,
  normalize,
  roundTo,
} from "./utils";

// Constants for normalization ranges
const HRV_RANGE = { min: 20, max: 85 }; // Population-based HRV range in ms
const RHR_RANGE = { min: 40, max: 100 }; // Resting heart rate range
const RESP_RATE_RANGE = { min: 8, max: 20 }; // Respiratory rate range

// Recovery score weights
const RECOVERY_WEIGHTS = {
  HRV: 0.5,
  RHR: 0.25,
  RESP: 0.125,
  SLEEP: 0.125,
};

// Stress level calculation constants
const STRESS_RATIO_BOUNDS = {
  low: 0.5, // RHR/HRV ratio indicating low stress
  high: 3.0, // RHR/HRV ratio indicating high stress
};

/**
 * Fetch heart rate, HRV, and stress-related statistics
 * - Resting heart rate, HRV data
 * - Recovery score
 * - Stress level calculation
 * - Blood oxygen saturation
 */
export const fetchHeartStressStats = async (
  age?: number | null,
  defaults?: any
): Promise<HeartStressStats> => {
  const { now, startOfToday, oneWeekAgo } = getCurrentDateRanges();

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
  const respRate =
    respStats?.averageQuantity?.quantity ?? defaults?.RESPIRATORY_RATE ?? 15;

  // Get blood oxygen saturation
  const spo2Sample = await getMostRecentQuantitySample(
    HKQuantityTypeIdentifier.oxygenSaturation,
    HKUnits.Percent
  );
  const bloodOxygen = spo2Sample
    ? { value: spo2Sample.quantity, date: new Date(spo2Sample.endDate) }
    : null;

  const recoveryScore = calculateRecoveryScore(
    hrvValues,
    restingHeartRate || (defaults?.RESTING_HEART_RATE ?? 60),
    respRate,
    defaults?.SLEEP_EFFICIENCY ?? 85,
    hrv7DayAvg > 0 ? hrv7DayAvg : undefined,
    restingHeartRate || undefined
  );

  const stressLevel = calculateStressLevel(restingHeartRate, hrv7DayAvg);

  const result = {
    restingHeartRate,
    hrv7DayAvg,
    hrvMostRecent,
    hrvValues,
    recoveryScore,
    stressLevel,
    bloodOxygen,
  };

  return result;
};

/*
OUTPUT:
     {
  "restingHeartRate": 59,
  "hrv7DayAvg": 41.666666666666664,
  "hrvMostRecent": 43,
  "hrvValues": [
    41,
    41,
    43
  ],
  "recoveryScore": 52.9,
  "stressLevel": 36.6,
  "bloodOxygen": {
    "value": 0.93,
    "date": "2025-06-15T03:36:07.000Z"
  }
}

*/

// Helper functions for dynamic range calculations
const calculateDynamicHrvRange = (baselineHrv: number) => ({
  min: Math.max(15, baselineHrv * 0.5), // At least 15ms, or 50% of baseline
  max: baselineHrv * 1.5, // 150% of baseline
});

const calculateDynamicRhrRange = (baselineRhr: number) => ({
  min: Math.max(30, baselineRhr * 0.7), // At least 30bpm, or 70% of baseline
  max: baselineRhr * 1.3, // 130% of baseline
});

/**
 * Calculate recovery score with optional dynamic ranges
 * Weighted average of HRV, Resting HR (inverse), Resp Rate (inverse), and Sleep Efficiency
 */
export const calculateRecoveryScore = (
  hrv: number[], // ms SDNN over last night
  restingHR: number, // bpm
  respRate: number, // breaths/min
  sleepEff: number, // %
  baselineHrv?: number,
  baselineRhr?: number
): number => {
  if (hrv.length === 0) {
    return 0;
  }

  // Use 7-day HRV average instead of single value for more stable metric
  const avgHRV = hrv.length > 0 ? mean(hrv) : 0;

  // Always use personalized ranges when available
  const hrvRange = baselineHrv
    ? calculateDynamicHrvRange(baselineHrv)
    : HRV_RANGE;

  const rhrRange = baselineRhr
    ? calculateDynamicRhrRange(baselineRhr)
    : RHR_RANGE;

  // Normalize values using appropriate ranges
  const normHRV = normalize(avgHRV, hrvRange.min, hrvRange.max);
  const normRHR = 100 - normalize(restingHR, rhrRange.min, rhrRange.max); // lower HR better
  const normResp =
    100 - normalize(respRate, RESP_RATE_RANGE.min, RESP_RATE_RANGE.max); // lower RR better
  const normSleep = Math.max(0, Math.min(100, sleepEff)); // ensure 0-100 range

  // Calculate weighted recovery score
  const score =
    normHRV * RECOVERY_WEIGHTS.HRV +
    normRHR * RECOVERY_WEIGHTS.RHR +
    normResp * RECOVERY_WEIGHTS.RESP +
    normSleep * RECOVERY_WEIGHTS.SLEEP;

  const finalScore = roundTo(score, 1);

  return finalScore;
};

/**
 * Calculate stress level using RHR to HRV ratio
 * Higher RHR and lower HRV indicate higher physiological stress
 */
export const calculateStressLevel = (
  restingHeartRate: number | null,
  hrv: number | null
): number => {
  if (!restingHeartRate || !hrv || hrv === 0) {
    return 0;
  }

  // A higher ratio suggests more stress. Normalize this to a 0-100 scale.
  // A typical RHR/HRV ratio for healthy adults might be 1.0-2.0. A ratio > 2.5 could indicate high stress.
  const ratio = restingHeartRate / hrv;

  // Let's map a ratio of 0.5 to 0 (very low stress) and 3.0 to 100 (high stress).
  const stressScore =
    ((ratio - STRESS_RATIO_BOUNDS.low) /
      (STRESS_RATIO_BOUNDS.high - STRESS_RATIO_BOUNDS.low)) *
    100;

  const finalStressLevel = Math.max(0, Math.min(100, roundTo(stressScore, 1)));

  return finalStressLevel;
};

/**
 * Process HRV values to get 7-day average and most recent
 * Updated to use mean utility function for consistency
 */
export const processHrv = (hrvValues: number[]) => {
  if (hrvValues.length === 0) {
    return { hrv7DayAvg: 0, hrvMostRecent: 0 };
  }

  const hrv7DayAvg = mean(hrvValues);
  const hrvMostRecent = hrvValues[hrvValues.length - 1];

  return { hrv7DayAvg, hrvMostRecent };
};

/**
 * Build 14-day average HRV baseline using daily samples
 * Optimized to use bucketBy for efficient grouping
 */
export const getBaselineHRV = async (): Promise<number> => {
  const { now, fourteenDaysAgo } = getExtendedDateRanges();

  // Get HRV samples for the last 14 days
  const hrvSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
    { from: fourteenDaysAgo, to: now }
  );

  if (hrvSamples.length === 0) {
    return 0;
  }

  // Group by day using bucketBy for efficient processing
  const dailyGroups = bucketBy(hrvSamples, "day");

  // Calculate daily averages
  const dailyAverages = Object.values(dailyGroups).map((daySamples) =>
    mean(daySamples.map((s) => s.quantity))
  );

  // Return average of daily averages
  const baselineHRV = dailyAverages.length > 0 ? mean(dailyAverages) : 0;
  return baselineHRV;
};

/**
 * Build 14-day average resting heart rate baseline
 * Optimized to use bulk querying and bucketBy
 */
export const getBaselineRHR = async (defaultRHR?: number): Promise<number> => {
  const { now, fourteenDaysAgo } = getExtendedDateRanges();

  // Fetch all resting HR samples at once instead of day by day
  const rhrSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.restingHeartRate,
    {
      from: fourteenDaysAgo,
      to: now,
      unit: "count/min",
    }
  );

  if (rhrSamples.length === 0) {
    return defaultRHR ?? 60;
  }

  // Group by day using bucketBy
  const dailyGroups = bucketBy(rhrSamples, "day");

  // Calculate daily averages
  const dailyAverages = Object.values(dailyGroups).map((daySamples) =>
    mean(daySamples.map((s) => s.quantity))
  );

  // Return average of daily averages
  const baselineRHR = dailyAverages.length > 0 ? mean(dailyAverages) : defaultRHR ?? 60;
  return baselineRHR;
};

/**
 * Sample hourly average HR & HRV for the current day
 * Updated to use bucketBy for more efficient data processing
 */
export const getHourlyHRandHRV = async (): Promise<HourlyHeartData[]> => {
  const { now, startOfToday } = getCurrentDateRanges();

  // Query all heart rate samples for today at once
  const hrSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRate,
    {
      from: startOfToday,
      to: now,
      unit: "count/min",
    }
  );

  // Query all HRV samples for today at once
  const hrvSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
    {
      from: startOfToday,
      to: now,
    }
  );

  // Group samples by hour
  const hrByHour = bucketBy(hrSamples, "hour");
  const hrvByHour = bucketBy(hrvSamples, "hour");

  // Create hourly data points by merging HR and HRV data
  const hourlyData: HourlyHeartData[] = [];

  // Process all hours with heart rate data
  Object.entries(hrByHour).forEach(([hourKey, hrArr]) => {
    if (hrArr.length === 0) return;

    // Calculate average HR for this hour
    const hrValues = hrArr.map((s) => s.quantity);
    const avgHR = mean(hrValues);

    // Find matching HRV data for this hour
    const hrvArr = hrvByHour[hourKey] || [];
    const hrvValues = hrvArr.map((s) => s.quantity);
    const avgHRV = hrvValues.length > 0 ? mean(hrvValues) : 0;

    // Create hour start date from the hour key (format is "HH:00")
    const hour = parseInt(hourKey.split(":")[0], 10);
    const hourStart = createHourStart(startOfToday, hour);

    const hourlyDataPoint = {
      hourStart,
      hr: roundTo(avgHR, 1),
      hrv: roundTo(avgHRV, 1),
    };

    hourlyData.push(hourlyDataPoint);
  });

  // Sort by hour
  const sortedData = hourlyData.sort(
    (a, b) => a.hourStart.getTime() - b.hourStart.getTime()
  );

  return sortedData;
};

/**
 * Compute stress level for a single moment using baseline comparison
 * Returns a value between 0-3 where:
 * 0 = no stress, 1 = low stress, 2 = moderate stress, 3 = high stress
 * Includes time-of-day adjustments for more accurate stress assessment
 */
export const computeStressMoment = (
  currentHR: number,
  currentHRV: number,
  baselineRHR: number,
  baselineHRV: number,
  hourOfDay?: number
): number => {
  // HR stress: how far above resting HR (improved scaling for better variation)
  const hrDelta = currentHR - baselineRHR;
  const hrStress =
    baselineRHR > 0
      ? Math.max(0, Math.min(1.0, hrDelta / (baselineRHR * 0.6))) // Back to 1.0 max but use 0.6 for sensitivity
      : 0;

  // Handle missing HRV data more gracefully with better HR-based estimation
  let hrvStress: number;
  if (currentHRV === 0 || baselineHRV <= 0) {
    // When HRV is missing, estimate stress more dynamically based on HR elevation
    const hrElevationRatio = hrDelta / baselineRHR;

    if (hrElevationRatio > 1.0) {
      // HR elevated by >100% suggests high stress (more moderate)
      hrvStress = 0.6 + Math.min(0.3, (hrElevationRatio - 1.0) * 0.3);
    } else if (hrElevationRatio > 0.6) {
      // HR elevated by 60-100% suggests moderate-high stress
      hrvStress = 0.4 + (hrElevationRatio - 0.6) * 0.5;
    } else if (hrElevationRatio > 0.3) {
      // HR elevated by 30-60% suggests moderate stress
      hrvStress = 0.2 + (hrElevationRatio - 0.3) * 0.67;
    } else if (hrElevationRatio > 0.1) {
      // HR elevated by 10-30% suggests mild stress
      hrvStress = 0.05 + (hrElevationRatio - 0.1) * 0.75;
    } else if (hrElevationRatio < -0.1) {
      // HR significantly below baseline suggests very low stress
      hrvStress = 0.02;
    } else {
      // HR close to baseline suggests low stress
      hrvStress = 0.05;
    }
  } else {
    // Normal HRV-based calculation when HRV data is available
    hrvStress = Math.max(0, Math.min(1, 1 - currentHRV / baselineHRV));
  }

  // Combine HR and HRV stress with weighted average (HR gets more weight when HRV is missing)
  let combinedStress: number;
  if (currentHRV === 0) {
    // When HRV is missing, rely more heavily on HR patterns
    combinedStress = hrStress * 0.7 + hrvStress * 0.3;
  } else {
    // When HRV is available, use balanced weighting
    combinedStress = hrStress * 0.5 + hrvStress * 0.5;
  }

  // Scale to 0–3 range with improved sensitivity
  let raw = combinedStress * 3;

  // Apply time-of-day adjustments if hour is provided
  if (hourOfDay !== undefined) {
    const adjusted = adjustForTimeOfDay(raw, hourOfDay);
    raw = adjusted;
  }

  const finalStress = parseFloat(Math.max(0, Math.min(3, raw)).toFixed(2));

  return finalStress;
};

/**
 * Adjust stress values based on time of day context
 */
const adjustForTimeOfDay = (stressValue: number, hourOfDay: number): number => {
  // Apply more significant time-based adjustments for better variation
  if (hourOfDay >= 22 || hourOfDay < 6) {
    // Late night/early morning: elevated HR is more significant (high stress indicator)
    return stressValue * 1.4;
  } else if (hourOfDay >= 14 && hourOfDay < 16) {
    // Post-lunch dip: elevated HR is less concerning (natural afternoon pattern)
    return stressValue * 0.7;
  } else if (hourOfDay >= 6 && hourOfDay < 9) {
    // Morning: HR naturally higher due to cortisol awakening response
    return stressValue * 0.8;
  } else if (hourOfDay >= 16 && hourOfDay < 18) {
    // Late afternoon: stress often peaks due to daily accumulation
    return stressValue * 1.2;
  } else if (hourOfDay >= 18 && hourOfDay < 22) {
    // Evening: should be winding down, elevated HR more concerning
    return stressValue * 1.1;
  }
  return stressValue;
};

/**
 * Helper: detect if a timestamp falls in any interval
 */
export const isInIntervals = (t: Date, intervals: TimeInterval[]): boolean => {
  return intervals.some((iv) => t >= iv.start && t < iv.end);
};

export const calculateStressMetrics = async (
  defaults?: any
): Promise<StressMetrics> => {
  // Calculate 14-day baselines
  const [baselineHRV, baselineRHR] = await Promise.all([
    getBaselineHRV(),
    getBaselineRHR(defaults?.RESTING_HEART_RATE),
  ]);

  // Get hourly HR & HRV data for today
  const hourlyData = await getHourlyHRandHRV();

  // TODO: Add sleep and workout interval detection
  // For now, we'll use empty arrays and implement these later
  const sleepIntervals: TimeInterval[] = [];
  const workoutIntervals: TimeInterval[] = [];

  // Calculate hourly stress levels with time-of-day context
  const hourlyStress = hourlyData.map((h) => {
    const stressMoment = computeStressMoment(
      h.hr,
      h.hrv,
      baselineRHR,
      baselineHRV,
      h.hourStart.getHours()
    );
    return {
      hourStart: h.hourStart,
      stress: stressMoment,
    };
  });

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

  const result = {
    baselineHRV: roundTo(baselineHRV, 1),
    baselineRHR: roundTo(baselineRHR, 1),
    totalDayStress: parseFloat(totalDayStress.toFixed(2)),
    sleepStress: parseFloat(sleepStress.toFixed(2)),
    nonActivityStress: parseFloat(nonActivityStress.toFixed(2)),
    hourlyStress,
  };

  return result;
};

// --- Functions for StressMonitorCard --- START ---

// Legacy function, keep for fallback
function calculatePointStressFromHRV(
  hrv: number,
  restingHR: number,
  defaultStressLevel = 2
): number {
  if (hrv === 0 || restingHR === 0) return defaultStressLevel;
  const ratio = restingHR / hrv;
  // Scale ratio (0.5-3.0) to stress (0-4)
  const stress = ((ratio - 0.5) / (3.0 - 0.5)) * 4;
  return Math.max(0, Math.min(4, stress)); // Clamp between 0 and 4
}

// Legacy function, keep for fallback
function generateStressChartDataFromHRV(
  hrvValues: number[],
  restingHeartRate: number | null,
  defaultRHR = 60,
  defaultStressLevel = 2
): StressChartDataPoint[] {
  const rhr = restingHeartRate || defaultRHR;
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
      stress: calculatePointStressFromHRV(hrv, rhr, defaultStressLevel),
      timestamp: formatDateDisplay(date), // Use date-fns utility
    };
  });
}

/*
heartStressStats
{
  "restingHeartRate": 59,
  "hrv7DayAvg": 41.666666666666664,
  "hrvMostRecent": 43,
  "hrvValues": [
    41,
    41,
    43
  ],
  "recoveryScore": 52.9,
  "strainScore": 22.2,
  "stressLevel": 36.6,
  "bloodOxygen": {
    "value": 0.93,
    "date": "2025-06-15T03:36:07.000Z"
  }
}

stressDetails
{
  "baselineHRV": 41.7,
  "baselineRHR": 60,
  "totalDayStress": 2.33,
  "sleepStress": 0,
  "nonActivityStress": 2.33,
  "hourlyStress": [
    {
      "hourStart": "2025-06-15T04:00:00.000Z",
      "stress": 2.85
    },
    {
      "hourStart": "2025-06-15T05:00:00.000Z",
      "stress": 1.45
    },
    {
      "hourStart": "2025-06-15T06:00:00.000Z",
      "stress": 2.85
    },
    {
      "hourStart": "2025-06-15T08:00:00.000Z",
      "stress": 1.52
    },
    {
      "hourStart": "2025-06-15T09:00:00.000Z",
      "stress": 3
    }
  ]
}

defaults
{
  "RESPIRATORY_RATE": 15,
  "RESTING_HEART_RATE": 60,
  "SLEEP_EFFICIENCY": 85,
  "DEFAULT_STRESS_LEVEL": 2,
  "HRV_BASELINE": 45
}
*/

export const prepareStressChartDisplayData = (
  hrvValues: number[] | undefined,
  restingHeartRate: number | null | undefined,
  overallStressLevelFromContext: number | undefined, // 0-100 scale
  stressDetails: StressMetrics | null | undefined,
  defaults?: any
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
      timestamp: formatHourDisplay(new Date(item.hourStart)), // Use date-fns utility
    }));
    currentStressForVisualization = stressDetails.totalDayStress; // Also 0-3 scale

    // Use a fixed Y domain that shows the full 0-3 stress scale
    // This provides consistent context and proper Y-axis labels
    yDomainForVisualization = [0, 3];

    xAxisDataType = "hourly";
  }
  // 2. Fallback to HRV-based data
  else if (hrvValues && hrvValues.length > 0) {
    chartPlotData = generateStressChartDataFromHRV(
      hrvValues,
      restingHeartRate ?? null,
      defaults?.RESTING_HEART_RATE,
      defaults?.DEFAULT_STRESS_LEVEL
    );
    // overallStressLevelFromContext is 0-100, scale to 0-4 for this chart
    currentStressForVisualization = (overallStressLevelFromContext ?? 0) / 25;
    yDomainForVisualization = [0, 4]; // Max is 4
    xAxisDataType = "daily";
  }

  const lastUpdatedDisplay = formatTimeDisplay(new Date());

  const result = {
    chartPlotData,
    currentStressForVisualization,
    yDomainForVisualization,
    xAxisDataType,
    lastUpdatedDisplay,
  };

  return result;
};

// --- Functions for StressMonitorCard --- END ---

export function getStressColor(stressLevel: number): string {
  if (stressLevel < 1) return Colors.hrv.excellent;
  if (stressLevel < 2) return Colors.hrv.good;
  return Colors.hrv.poor;
}
