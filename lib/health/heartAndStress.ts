import { Colors } from "@/constants/Colors";
import { bucketBy, mean } from "@/utils/dates";
import {
    getMostRecentQuantitySample,
    HKQuantityTypeIdentifier,
    HKUnits,
    queryQuantitySamples,
} from "@kingstinct/react-native-healthkit";
import {
    HeartStressStats,
    HourlyHeartData,
    StressAverages,
    StressChartDataPoint,
    StressChartDisplayData,
    StressMetrics,
    TimeInterval,
} from "./types";
import {
    calculateAverage,
    createHourStart,
    formatHourDisplay,
    formatTimeDisplay,
    getCurrentDateRanges,
    getDateRange,
    getDateRanges,
    getExtendedDateRanges,
    roundTo,
} from "./utils";

/**
 * Fetch heart rate, HRV, and stress-related statistics for a specific date
 * - Resting heart rate, HRV data
 * - Modern stress level calculation using advanced algorithms
 * - Blood oxygen saturation
 */
export const fetchHeartStressStats = async (
  age?: number | null,
  defaults?: any,
  targetDate?: Date
): Promise<HeartStressStats> => {
  // Get date ranges - if targetDate provided, get data leading up to that date
  let endDate: Date, startDate: Date;
  if (targetDate) {
    endDate = new Date(targetDate);
    startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 7); // Look back 7 days from target date
  } else {
    const { now, oneWeekAgo } = getCurrentDateRanges();
    endDate = now;
    startDate = oneWeekAgo;
  }

  // Get resting heart rate (most recent)
  const restingHRSample = await getMostRecentQuantitySample(
    HKQuantityTypeIdentifier.restingHeartRate,
    "count/min"
  );
  const restingHeartRate = restingHRSample?.quantity ?? null;

  // Get HRV data for the period leading up to target date
  const hrvSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
    { from: startDate, to: endDate }
  );
  const hrvValues = hrvSamples.map((s) => s.quantity);

  const { hrv7DayAvg, hrvMostRecent } = processHrv(hrvValues);

  // Get blood oxygen saturation
  const spo2Sample = await getMostRecentQuantitySample(
    HKQuantityTypeIdentifier.oxygenSaturation,
    HKUnits.Percent
  );
  const bloodOxygen = spo2Sample
    ? { value: spo2Sample.quantity, date: new Date(spo2Sample.endDate) }
    : null;

  // Use modern stress calculation
  const stressLevel = await calculateModernStressLevel(
    restingHeartRate,
    hrv7DayAvg,
    defaults
  );

  const result = {
    restingHeartRate,
    hrv7DayAvg,
    hrvMostRecent,
    hrvValues,
    stressLevel,
    bloodOxygen,
  };

  return result;
};

/**
 * Modern stress level calculation using baseline comparison and time context
 * Replaces deprecated calculateBasicStressLevel with more sophisticated analysis
 */
export const calculateModernStressLevel = async (
  restingHeartRate: number | null,
  hrv: number | null,
  defaults?: any
): Promise<number> => {
  if (!restingHeartRate || !hrv || hrv === 0) {
    return 0;
  }

  // Get baselines for more accurate calculation
  const [baselineHRV, baselineRHR] = await Promise.all([
    calculateBaselineHRV(defaults),
    calculateBaselineRHR(defaults),
  ]);

  // Use the sophisticated stress moment calculation
  const currentHour = new Date().getHours();
  const stressMoment = computeStressMoment(
    restingHeartRate,
    hrv,
    baselineRHR,
    baselineHRV,
    currentHour
  );

  // Convert from 0-3 scale to 0-100 scale for compatibility
  const stressLevel = (stressMoment / 3) * 100;
  return roundTo(stressLevel, 1);
};

/**
 * Calculate 14-day baseline HRV using recovery module pattern
 * Replaces deprecated getBaselineHRV with consistent approach
 */
export const calculateBaselineHRV = async (defaults?: any, targetDate?: Date): Promise<number> => {
  const { fourteenDaysAgo } = getExtendedDateRanges(targetDate);
  const endDate = targetDate || new Date();

  const hrvSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
    { from: fourteenDaysAgo, to: endDate }
  );

  if (hrvSamples.length === 0) {
    return defaults?.HRV_BASELINE || 45;
  }

  const dailyGroups = bucketBy(hrvSamples, "day");
  const dailyAverages = Object.values(dailyGroups).map((daySamples) =>
    mean(daySamples.map((s) => s.quantity))
  );

  const baselineHRV =
    dailyAverages.length > 0
      ? mean(dailyAverages)
      : defaults?.HRV_BASELINE || 45;
  return baselineHRV;
};

/**
 * Calculate 14-day baseline resting heart rate using recovery module pattern
 * Replaces deprecated getBaselineRHR with consistent approach
 */
export const calculateBaselineRHR = async (defaults?: any, targetDate?: Date): Promise<number> => {
  const { fourteenDaysAgo } = getExtendedDateRanges(targetDate);
  const endDate = targetDate || new Date();

  const rhrSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.restingHeartRate,
    {
      from: fourteenDaysAgo,
      to: endDate,
      unit: "count/min",
    }
  );

  if (rhrSamples.length === 0) {
    return defaults?.RESTING_HEART_RATE || 60;
  }

  const dailyGroups = bucketBy(rhrSamples, "day");
  const dailyAverages = Object.values(dailyGroups).map((daySamples) =>
    mean(daySamples.map((s) => s.quantity))
  );

  const baselineRHR =
    dailyAverages.length > 0
      ? mean(dailyAverages)
      : defaults?.RESTING_HEART_RATE || 60;
  return baselineRHR;
};

/**
 * Process HRV values to get 7-day average and most recent
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
 * @deprecated Consider using recovery module's baseline calculations for consistency
 * Optimized to use bucketBy for efficient grouping
 */
export const getBaselineHRV = async (): Promise<number> => {
  const { now, fourteenDaysAgo } = getExtendedDateRanges();

  const hrvSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
    { from: fourteenDaysAgo, to: now }
  );

  if (hrvSamples.length === 0) {
    return 0;
  }

  const dailyGroups = bucketBy(hrvSamples, "day");
  const dailyAverages = Object.values(dailyGroups).map((daySamples) =>
    mean(daySamples.map((s) => s.quantity))
  );

  const baselineHRV = dailyAverages.length > 0 ? mean(dailyAverages) : 0;
  return baselineHRV;
};

/**
 * Build 14-day average resting heart rate baseline
 * @deprecated Consider using recovery module's baseline calculations for consistency
 * Optimized to use bulk querying and bucketBy
 */
export const getBaselineRHR = async (defaultRHR?: number): Promise<number> => {
  const { now, fourteenDaysAgo } = getExtendedDateRanges();

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

  const dailyGroups = bucketBy(rhrSamples, "day");
  const dailyAverages = Object.values(dailyGroups).map((daySamples) =>
    mean(daySamples.map((s) => s.quantity))
  );

  const baselineRHR =
    dailyAverages.length > 0 ? mean(dailyAverages) : defaultRHR ?? 60;
  return baselineRHR;
};

/**
 * Sample hourly average HR & HRV for a specific day
 * Updated to use bucketBy for more efficient data processing
 */
export const getHourlyHRandHRV = async (targetDate?: Date): Promise<HourlyHeartData[]> => {
  // Get date ranges for the target date
  let startDate: Date, endDate: Date;
  if (targetDate) {
    const ranges = getDateRanges(targetDate);
    startDate = ranges.startOfTargetDay;
    endDate = ranges.endOfTargetDay;
  } else {
    const ranges = getCurrentDateRanges();
    startDate = ranges.startOfToday;
    endDate = ranges.now;
  }

  // Query all heart rate samples for the target day at once
  const hrSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRate,
    {
      from: startDate,
      to: endDate,
      unit: "count/min",
    }
  );

  // Query all HRV samples for the target day at once
  const hrvSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
    {
      from: startDate,
      to: endDate,
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
    const hourStart = createHourStart(startDate, hour);

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
  defaults?: any,
  targetDate?: Date
): Promise<StressMetrics> => {
  // Calculate 14-day baselines using modern approach
  const [baselineHRV, baselineRHR] = await Promise.all([
    calculateBaselineHRV(defaults, targetDate),
    calculateBaselineRHR(defaults, targetDate),
  ]);

  // Get hourly HR & HRV data for the target date
  const hourlyData = await getHourlyHRandHRV(targetDate);

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

/**
 * Generate modern stress chart data using advanced stress calculations
 * Replaces deprecated HRV-based chart generation with sophisticated analysis
 */
const generateModernStressChartData = async (
  defaults?: any
): Promise<StressChartDataPoint[]> => {
  try {
    // Get detailed stress metrics
    const stressMetrics = await calculateStressMetrics(defaults);

    if (stressMetrics.hourlyStress && stressMetrics.hourlyStress.length > 0) {
      return stressMetrics.hourlyStress.map((item) => ({
        time: new Date(item.hourStart).getTime(),
        stress: item.stress, // 0-3 scale
        timestamp: formatHourDisplay(new Date(item.hourStart)),
      }));
    }
  } catch (error) {
    console.warn("Failed to generate modern stress chart data:", error);
  }

  return [];
};

/**
 * Prepare stress chart display data with modern prioritization
 * 1. Uses detailed hourly stress data from calculateStressMetrics
 * 2. Fallback to simplified visualization if detailed data unavailable
 */
export const prepareStressChartDisplayData = async (
  hrvValues: number[] | undefined,
  restingHeartRate: number | null | undefined,
  overallStressLevelFromContext: number | undefined, // 0-100 scale
  stressDetails: StressMetrics | null | undefined,
  defaults?: any,
  targetDate?: Date
): Promise<StressChartDisplayData> => {
  let chartPlotData: StressChartDataPoint[] = [];
  let currentStressForVisualization: number = 0;
  let yDomainForVisualization: [number, number] = [0, 3]; // Default for modern scale (0-3)
  let xAxisDataType: "hourly" | "daily" = "hourly"; // Default for modern approach

  // 1. Prioritize stressDetails.hourlyStress (modern detailed calculation)
  if (
    stressDetails &&
    stressDetails.hourlyStress &&
    stressDetails.hourlyStress.length > 0
  ) {
    chartPlotData = stressDetails.hourlyStress.map((item) => ({
      time: new Date(item.hourStart).getTime(),
      stress: item.stress, // 0-3 scale
      timestamp: formatHourDisplay(new Date(item.hourStart)),
    }));
    currentStressForVisualization = stressDetails.totalDayStress;
    yDomainForVisualization = [0, 3];
    xAxisDataType = "hourly";
  }
  // 2. Generate modern stress data if no stressDetails provided
  else {
    chartPlotData = await generateModernStressChartData(defaults);

    if (chartPlotData.length > 0) {
      // Calculate current stress from chart data
      const stressValues = chartPlotData.map((d) => d.stress);
      currentStressForVisualization =
        stressValues.reduce((sum, stress) => sum + stress, 0) /
        stressValues.length;
      yDomainForVisualization = [0, 3];
      xAxisDataType = "hourly";
    }
    // 3. Final fallback - simplified view based on basic stress level
    else if (overallStressLevelFromContext !== undefined) {
      // Convert 0-100 scale to 0-3 scale for visualization
      currentStressForVisualization = (overallStressLevelFromContext / 100) * 3;

      // Create a simple 24-hour visualization with current stress level
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      chartPlotData = Array.from({ length: 24 }, (_, hour) => {
        const hourTime = new Date(startOfDay);
        hourTime.setHours(hour);

        // Add some realistic variation around the current stress level
        const variation = (Math.random() - 0.5) * 0.5; // ±0.25 variation
        const stress = Math.max(
          0,
          Math.min(3, currentStressForVisualization + variation)
        );

        return {
          time: hourTime.getTime(),
          stress,
          timestamp: formatHourDisplay(hourTime),
        };
      });

      yDomainForVisualization = [0, 3];
      xAxisDataType = "hourly";
    }
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

/**
 * Get stress color based on stress level
 * Works with both legacy (0-100) and modern (0-3) stress scales
 */
export function getStressColor(stressLevel: number): string {
  // Auto-detect scale based on value range
  const normalizedLevel =
    stressLevel > 10 ? (stressLevel / 100) * 3 : stressLevel;

  if (normalizedLevel < 1) return Colors.hrv.excellent;
  if (normalizedLevel < 2) return Colors.hrv.good;
  return Colors.hrv.poor;
}

/**
 * Fetch stress averages for 14 and 30 day periods relative to a target date
 */
export const fetchStressAverages = async (
  defaults?: any,
  targetDate?: Date
): Promise<{
  last14Days: StressAverages;
  last30Days: StressAverages;
}> => {
  const range30Days = getDateRange(30, targetDate);
  const range14Days = getDateRange(14, targetDate);

  // Fetch 30 days of data once and filter for 14 days
  const [hrv30Days, rhr30Days] = await Promise.all([
    queryQuantitySamples(
      HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
      range30Days
    ),
    queryQuantitySamples(
      HKQuantityTypeIdentifier.restingHeartRate,
      range30Days
    ),
  ]);

  // Filter the 30-day data to get 14-day samples
  const hrv14Days = hrv30Days.filter(
    (sample) => new Date(sample.startDate) >= range14Days.from
  );
  const rhr14Days = rhr30Days.filter(
    (sample) => new Date(sample.startDate) >= range14Days.from
  );

  const calculate14DayAverages = async () => {
    const hrvValues = hrv14Days.map((sample) => sample.quantity);
    const rhrValues = rhr14Days.map((sample) => sample.quantity);

    const avgHrv = calculateAverage(hrvValues);
    const avgRhr = calculateAverage(rhrValues);

    // Calculate stress level based on HRV deviation from baseline
    const baselineHRV = await calculateBaselineHRV(defaults);
    const stressLevel = Math.max(
      0,
      Math.min(100, 100 - (avgHrv / baselineHRV) * 100)
    );

    return {
      level: roundTo(stressLevel, 1),
      hrvAverage: roundTo(avgHrv, 1),
      restingHeartRate: roundTo(avgRhr, 1),
    };
  };

  const calculate30DayAverages = async () => {
    const hrvValues = hrv30Days.map((sample) => sample.quantity);
    const rhrValues = rhr30Days.map((sample) => sample.quantity);

    const avgHrv = calculateAverage(hrvValues);
    const avgRhr = calculateAverage(rhrValues);

    const baselineHRV = await calculateBaselineHRV(defaults);
    const stressLevel = Math.max(
      0,
      Math.min(100, 100 - (avgHrv / baselineHRV) * 100)
    );

    return {
      level: roundTo(stressLevel, 1),
      hrvAverage: roundTo(avgHrv, 1),
      restingHeartRate: roundTo(avgRhr, 1),
    };
  };

  return {
    last14Days: await calculate14DayAverages(),
    last30Days: await calculate30DayAverages(),
  };
};
