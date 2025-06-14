import {
  HKCategorySample,
  HKCategoryTypeIdentifier,
  HKCategoryValueSleepAnalysis,
  queryCategorySamples,
} from "@kingstinct/react-native-healthkit";
import { SleepStats } from "./types";
import { getCurrentDateRanges, msToHours, roundTo } from "./utils";

// Constants from original code
export const SLEEP_PERFORMANCE_GOAL_HOURS = 8;
export const SLEEP_CONSISTENCY_MAX_STD_DEV_HOURS = 2.5;

export const ACTUAL_SLEEP_VALUES = [
  HKCategoryValueSleepAnalysis.asleepUnspecified,
  HKCategoryValueSleepAnalysis.asleepDeep,
  HKCategoryValueSleepAnalysis.asleepCore,
  HKCategoryValueSleepAnalysis.asleepREM,
];

/**
 * Fetch sleep statistics and calculations
 * - Sleep hours, performance, consistency, efficiency
 * - Daily sleep durations for charting
 * - Raw sleep samples
 */
export const fetchSleepStats = async (): Promise<SleepStats> => {
  const { oneWeekAgo, now } = getCurrentDateRanges();

  // Get sleep samples for the last week
  const sleepSamples = await queryCategorySamples(
    HKCategoryTypeIdentifier.sleepAnalysis,
    { from: oneWeekAgo, to: now }
  );

  // Process sleep data
  const { totalSleep, dailySleepDurations } = processSleepData(sleepSamples);
  const sleepEfficiency = calculateSleepEfficiency(sleepSamples);
  const sleepConsistency = calculateSleepConsistency(sleepSamples);

  return {
    sleepHours: roundTo(totalSleep, 1),
    sleepPerformance: Math.min(
      100,
      (totalSleep / SLEEP_PERFORMANCE_GOAL_HOURS) * 100
    ),
    sleepConsistency,
    sleepEfficiency,
    dailySleepDurations,
    sleep: sleepSamples,
  };
};

/**
 * Calculate sleep efficiency: Total time asleep / total time in bed
 */
export const calculateSleepEfficiency = (
  sleepSamples: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[]
): number => {
  const { totalInBedMs, totalAsleepMs } = sleepSamples.reduce(
    (acc, s) => {
      const durationMs =
        new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
      if (s.value === HKCategoryValueSleepAnalysis.inBed) {
        acc.totalInBedMs += durationMs;
      } else if (ACTUAL_SLEEP_VALUES.includes(s.value)) {
        acc.totalAsleepMs += durationMs;
      }
      return acc;
    },
    { totalInBedMs: 0, totalAsleepMs: 0 }
  );

  if (totalInBedMs === 0) return 0;
  const efficiency = (totalAsleepMs / totalInBedMs) * 100;
  return roundTo(efficiency, 1);
};

/**
 * Calculate sleep consistency: Standard deviation of bedtimes over the last week
 */
export const calculateSleepConsistency = (
  sleepSamples: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[]
): number => {
  const bedTimes = sleepSamples
    .filter((s) => s.value === HKCategoryValueSleepAnalysis.inBed)
    .map((s) => new Date(s.startDate));

  if (bedTimes.length < 2) return 100;

  const msSinceMidnight = bedTimes.map(
    (d) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
  );
  const mean =
    msSinceMidnight.reduce((a, b) => a + b, 0) / msSinceMidnight.length;
  const variance =
    msSinceMidnight.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) /
    msSinceMidnight.length;
  const sdSeconds = Math.sqrt(variance);

  // Normalize against a max standard deviation. A 2.5-hour deviation is poor.
  const maxSdSeconds = SLEEP_CONSISTENCY_MAX_STD_DEV_HOURS * 3600;
  const consistency = Math.max(0, 100 - (sdSeconds / maxSdSeconds) * 100);
  return roundTo(consistency, 1);
};

/**
 * Process sleep data to extract total sleep and daily durations
 */
export const processSleepData = (
  sleepSamples: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[]
) => {
  const sleepByDate: { [key: string]: number } = {};

  sleepSamples.forEach((sample) => {
    if (ACTUAL_SLEEP_VALUES.includes(sample.value)) {
      // Use the END date to attribute sleep to the day the user woke up.
      const day = new Date(sample.endDate).toISOString().split("T")[0];
      const durationMs =
        new Date(sample.endDate).getTime() -
        new Date(sample.startDate).getTime();

      sleepByDate[day] = (sleepByDate[day] || 0) + durationMs;
    }
  });

  const dailySleepDurations = Object.entries(sleepByDate).map(
    ([date, durationMs]) => ({
      date,
      duration: roundTo(msToHours(durationMs), 1),
    })
  );

  // Calculate total sleep for the most recent night.
  const lastSleepDay = dailySleepDurations.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  const totalSleep = lastSleepDay ? lastSleepDay.duration : 0;

  return { totalSleep, dailySleepDurations };
};
