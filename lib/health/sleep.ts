import {
  HKCategorySample,
  HKCategoryTypeIdentifier,
  HKCategoryValueSleepAnalysis,
  queryCategorySamples,
} from "@kingstinct/react-native-healthkit";

import { Colors } from "@/constants/Colors";
import { LastNightSleep, SleepMetrics, SleepStats } from "./types";
import { getCurrentDateRanges, msToHours, roundTo } from "./utils";
export const SLEEP_PERFORMANCE_GOAL_HOURS = 8;
export const SLEEP_CONSISTENCY_MAX_STD_DEV_HOURS = 2.5;

export const ACTUAL_SLEEP_VALUES = [
  HKCategoryValueSleepAnalysis.asleepUnspecified,
  HKCategoryValueSleepAnalysis.asleepDeep,
  HKCategoryValueSleepAnalysis.asleepCore,
  HKCategoryValueSleepAnalysis.asleepREM,
];

/**
 * Fetch comprehensive sleep statistics
 */
export const fetchSleepStats = async (): Promise<SleepStats> => {
  const { oneWeekAgo, now } = getCurrentDateRanges();

  const sleepSamples = await queryCategorySamples(
    HKCategoryTypeIdentifier.sleepAnalysis,
    { from: oneWeekAgo, to: now }
  );

  const { totalSleep, dailySleepDurations } = processSleepData(sleepSamples);
  const sleepEfficiency = calculateSleepEfficiency(sleepSamples);
  const sleepConsistency = calculateSleepConsistency(sleepSamples);

  const metrics = calculateSleepMetrics(sleepSamples, totalSleep);
  const lastNight = calculateLastNightSleep(sleepSamples);

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
    metrics,
    lastNight,
  };
};

/**
 * Calculate sleep efficiency ratio
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
 * Calculate sleep consistency based on bedtime variance
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

  const maxSdSeconds = SLEEP_CONSISTENCY_MAX_STD_DEV_HOURS * 3600;
  const consistency = Math.max(0, 100 - (sdSeconds / maxSdSeconds) * 100);
  return roundTo(consistency, 1);
};

/**
 * Process sleep data for analysis
 */
export const processSleepData = (
  sleepSamples: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[]
) => {
  const sleepByDate: { [key: string]: number } = {};

  sleepSamples.forEach((sample) => {
    if (ACTUAL_SLEEP_VALUES.includes(sample.value)) {
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

  const lastSleepDay = dailySleepDurations.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  const totalSleep = lastSleepDay ? lastSleepDay.duration : 0;

  return { totalSleep, dailySleepDurations };
};

/**
 * Format duration in HH:MM format
 */
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}:${mins.toString().padStart(2, "0")}`;
};

/**
 * Calculate comprehensive sleep metrics
 */
export const calculateSleepMetrics = (
  sleepSamples: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[],
  totalSleep: number
): SleepMetrics => {
  const hoursVsNeeded = Math.min(
    100,
    (totalSleep / SLEEP_PERFORMANCE_GOAL_HOURS) * 100
  );

  const sleepConsistency = calculateSleepConsistency(sleepSamples);

  const sleepEfficiency = calculateSleepEfficiency(sleepSamples);

  const lastNightSamples = getLastNightSamples(sleepSamples);
  const totalAwakeTime = lastNightSamples
    .filter((s) => s.value === HKCategoryValueSleepAnalysis.awake)
    .reduce((acc, s) => {
      const duration =
        new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
      return acc + duration;
    }, 0);

  const totalSleepTime = lastNightSamples
    .filter((s) => ACTUAL_SLEEP_VALUES.includes(s.value))
    .reduce((acc, s) => {
      const duration =
        new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
      return acc + duration;
    }, 0);

  const awakePercentage =
    totalSleepTime > 0
      ? (totalAwakeTime / (totalSleepTime + totalAwakeTime)) * 100
      : 0;
  const highSleepStress = awakePercentage > 10 ? awakePercentage - 10 : 0;

  return {
    hoursVsNeeded: roundTo(hoursVsNeeded, 0),
    sleepConsistency: roundTo(sleepConsistency, 0),
    sleepEfficiency: roundTo(sleepEfficiency, 0),
    highSleepStress: roundTo(highSleepStress, 0),
  };
};

/**
 * Get sleep samples from last night
 */
const getLastNightSamples = (
  sleepSamples: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[]
): HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[] => {
  const yesterdayNoon = new Date();
  yesterdayNoon.setHours(12, 0, 0, 0);
  yesterdayNoon.setDate(yesterdayNoon.getDate() - 1);

  const todayNoon = new Date();
  todayNoon.setHours(12, 0, 0, 0);

  return sleepSamples.filter((sample) => {
    const startDate = new Date(sample.startDate);
    return startDate >= yesterdayNoon && startDate < todayNoon;
  });
};

/**
 * Calculate detailed sleep stage analysis
 */
export const calculateLastNightSleep = (
  sleepSamples: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[]
): LastNightSleep => {
  const lastNightSamples = getLastNightSamples(sleepSamples);

  const stageDurations = {
    awake: 0,
    light: 0,
    deep: 0,
    rem: 0,
  };

  let totalSleepTime = 0;
  let totalTimeInBed = 0;

  lastNightSamples.forEach((sample) => {
    const duration =
      (new Date(sample.endDate).getTime() -
        new Date(sample.startDate).getTime()) /
      (1000 * 60);

    switch (sample.value) {
      case HKCategoryValueSleepAnalysis.awake:
        stageDurations.awake += duration;
        break;
      case HKCategoryValueSleepAnalysis.asleepCore:
      case HKCategoryValueSleepAnalysis.asleepUnspecified:
        stageDurations.light += duration;
        totalSleepTime += duration;
        break;
      case HKCategoryValueSleepAnalysis.asleepDeep:
        stageDurations.deep += duration;
        totalSleepTime += duration;
        break;
      case HKCategoryValueSleepAnalysis.asleepREM:
        stageDurations.rem += duration;
        totalSleepTime += duration;
        break;
      case HKCategoryValueSleepAnalysis.inBed:
        totalTimeInBed += duration;
        break;
    }
  });

  const totalTime = totalSleepTime + stageDurations.awake;

  const stages = {
    awake: {
      name: "Awake",
      duration: stageDurations.awake,
      percentage:
        totalTime > 0
          ? roundTo((stageDurations.awake / totalTime) * 100, 0)
          : 0,
      color: Colors.sleep.awake,
    },
    light: {
      name: "Light",
      duration: stageDurations.light,
      percentage:
        totalTime > 0
          ? roundTo((stageDurations.light / totalTime) * 100, 0)
          : 0,
      color: Colors.sleep.light,
    },
    deep: {
      name: "SWS (Deep)",
      duration: stageDurations.deep,
      percentage:
        totalTime > 0 ? roundTo((stageDurations.deep / totalTime) * 100, 0) : 0,
      color: Colors.sleep.deep,
    },
    rem: {
      name: "REM",
      duration: stageDurations.rem,
      percentage:
        totalTime > 0 ? roundTo((stageDurations.rem / totalTime) * 100, 0) : 0,
      color: Colors.sleep.rem,
    },
  };

  const restorativeSleepMinutes = stageDurations.deep + stageDurations.rem;

  return {
    totalSleepTime: formatDuration(totalSleepTime),
    averageSleepTime: formatDuration(totalSleepTime),
    timeInBed: formatDuration(totalTimeInBed > 0 ? totalTimeInBed : totalTime),
    stages,
    restorativeSleep: {
      duration: formatDuration(restorativeSleepMinutes),
      averageDuration: formatDuration(restorativeSleepMinutes),
    },
  };
};

export const getPerformanceColor = (perf: number) => {
  if (perf >= 80) return Colors.sleep.performance.excellent;
  if (perf >= 60) return Colors.sleep.performance.good;
  return Colors.sleep.performance.poor;
};
