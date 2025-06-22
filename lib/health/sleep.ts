import {
  CategorySampleTyped,
  CategoryValueSleepAnalysis,
  type QuantitySample,
} from "@kingstinct/react-native-healthkit";
import {
  queryCategorySamples,
  queryQuantitySamples,
} from "@kingstinct/react-native-healthkit/lib/commonjs/index.ios.js";

import { differenceInMilliseconds, format } from "date-fns";

import { Colors } from "@/constants/Colors";
import { formatDuration } from "@/lib/formatters";
import {
  SleepAnalysis,
  SleepAverages,
  SleepCluster,
  SleepNeed,
  SleepPerformanceMetrics,
  SleepStageData,
} from "./types";
import {
  calculateAverage,
  getDateRange,
  msToHours,
  msToMinutes,
  roundTo,
} from "./utils";

// Export types for external use
export type {
  SleepAnalysis,
  SleepCluster,
  SleepNeed,
  SleepPerformanceMetrics,
  SleepStageData
};

export const SLEEP_PERFORMANCE_GOAL_HOURS = 8;
export const SLEEP_CONSISTENCY_MAX_STD_DEV_HOURS = 2.5;
const QUERY_LIMIT = 100;

export const ACTUAL_SLEEP_VALUES = [
  CategoryValueSleepAnalysis.asleepUnspecified,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepREM,
];
/**
 * Fetch comprehensive sleep statistics for a specific date
 * Enhanced version that uses the new sleep performance calculation
 *
 * @param targetDate - The date to calculate sleep statistics for.
 *                     Sleep data will be retrieved for the night ending on this date.
 *                     For example, if targetDate is June 22, 2025, it will get
 *                     sleep data from the night of June 21-22, 2025.
 */
export const fetchSleepAnalysis = async (
  targetDate: Date
): Promise<SleepAnalysis> => {
  console.log("\n=== Debug fetchSleepAnalysis ===");
  console.log("Querying sleep samples from HealthKit...");

  try {
    const sleepSamples: CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[] =
      await queryCategorySamples("HKCategoryTypeIdentifierSleepAnalysis", {
        limit: QUERY_LIMIT,
      });

    console.log(`Raw query result: ${sleepSamples?.length || 0} samples`);

    if (sleepSamples && sleepSamples.length > 0) {
      console.log("First sample:", {
        startDate: sleepSamples[0].startDate,
        endDate: sleepSamples[0].endDate,
        value: sleepSamples[0].value,
      });
      console.log("Last sample:", {
        startDate: sleepSamples[sleepSamples.length - 1].startDate,
        endDate: sleepSamples[sleepSamples.length - 1].endDate,
        value: sleepSamples[sleepSamples.length - 1].value,
      });
    }
  } catch (error) {
    console.error("Error querying sleep samples:", error);
    throw error;
  }

  const sleepSamples: CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[] =
    await queryCategorySamples("HKCategoryTypeIdentifierSleepAnalysis", {
      limit: QUERY_LIMIT,
    });

  const { totalSleep, dailySleepDurations } = processSleepData(
    sleepSamples,
    targetDate
  );
  const sleepEfficiency = calculateSleepEfficiency(sleepSamples, targetDate);
  const sleepConsistency = calculateSleepConsistency(sleepSamples, targetDate);

  // Use enhanced calculation for performance metrics
  let performanceMetrics: SleepPerformanceMetrics;

  try {
    performanceMetrics = await calculateEnhancedSleepPerformance(targetDate);
  } catch {
    // Fallback to basic calculations
    const basicMetrics = calculateSleepMetrics(
      sleepSamples,
      totalSleep,
      targetDate
    );
    const sleepPerformance = calculateSleepPerformance(
      totalSleep,
      sleepEfficiency,
      sleepConsistency
    );

    // Create fallback performance metrics
    performanceMetrics = {
      hoursVsNeeded: basicMetrics.hoursVsNeeded,
      sleepConsistency: basicMetrics.sleepConsistency,
      sleepEfficiency: basicMetrics.sleepEfficiency,
      sleepStress: basicMetrics.sleepStress,
      overallScore: sleepPerformance,
      sleepNeed: calculateSleepNeed(),
      mainCluster: {
        start: new Date(),
        end: new Date(),
        asleepMs: totalSleep * 60 * 60 * 1000,
        timeInBedMs: totalSleep * 60 * 60 * 1000,
        isMainSleep: true,
      },
    };
  }

  // Get stage analysis
  const stageAnalysis = calculateSleepStageAnalysis(sleepSamples, targetDate);

  // Convert to unified SleepAnalysis format
  return {
    ...performanceMetrics,
    overallPerformance: performanceMetrics.overallScore,

    // Sleep duration data
    totalSleepTime: stageAnalysis.totalSleepTime,
    totalSleepHours: totalSleep,
    timeInBed: stageAnalysis.timeInBed,

    // Sleep stage breakdown
    stages: stageAnalysis.stages,

    // Restorative sleep
    restorativeSleep: {
      duration: stageAnalysis.restorativeSleep.duration,
      minutes:
        stageAnalysis.stages.deep.duration + stageAnalysis.stages.rem.duration,
    },

    // Historical data
    dailySleepDurations,
  };
};

/**
 * Calculate sleep efficiency ratio
 * Sleep efficiency = (Total Sleep Time / Time in Bed) × 100
 */
export const calculateSleepEfficiency = (
  sleepSamples: readonly CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[],
  targetDate: Date
): number => {
  const targetDateSamples = getSleepSamplesForDate(sleepSamples, targetDate);

  if (targetDateSamples.length === 0) {
    return 0;
  }

  let totalTimeInBedMs = 0;
  let totalAsleepMs = 0;

  // Calculate time in bed and total sleep time
  targetDateSamples.forEach((sample) => {
    const durationMs =
      new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime();

    if (sample.value === CategoryValueSleepAnalysis.inBed) {
      totalTimeInBedMs += durationMs;
    } else if (ACTUAL_SLEEP_VALUES.includes(sample.value)) {
      totalAsleepMs += durationMs;
    }
  });

  // If no explicit inBed samples, calculate from sleep + awake time
  if (totalTimeInBedMs === 0) {
    const totalAwakeMs = targetDateSamples
      .filter((s) => s.value === CategoryValueSleepAnalysis.awake)
      .reduce((acc, s) => {
        const duration =
          new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
        return acc + duration;
      }, 0);

    totalTimeInBedMs = totalAsleepMs + totalAwakeMs;
  }

  if (totalTimeInBedMs === 0) {
    return 0;
  }

  const efficiency = (totalAsleepMs / totalTimeInBedMs) * 100;
  return roundTo(efficiency, 1);
};

/**
 * Calculate sleep consistency based on bedtime variance and sleep quality
 */
export const calculateSleepConsistency = (
  sleepSamples: readonly CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[],
  targetDate: Date
): number => {
  const bedTimes = sleepSamples
    .filter((s) => s.value === CategoryValueSleepAnalysis.inBed)
    .map((s) => new Date(s.startDate));

  // If we don't have enough bedtime data, calculate based on sleep quality consistency
  if (bedTimes.length < 2) {
    // Use awake time percentage as a consistency indicator
    const targetDateSamples = getSleepSamplesForDate(sleepSamples, targetDate);

    if (targetDateSamples.length === 0) return 0;

    const totalAwakeTime = targetDateSamples
      .filter((s) => s.value === CategoryValueSleepAnalysis.awake)
      .reduce((acc, s) => {
        const duration =
          new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
        return acc + duration;
      }, 0);

    const totalSleepTime = targetDateSamples
      .filter((s) => ACTUAL_SLEEP_VALUES.includes(s.value))
      .reduce((acc, s) => {
        const duration =
          new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
        return acc + duration;
      }, 0);

    if (totalSleepTime === 0) return 0;

    const awakePercentage =
      (totalAwakeTime / (totalSleepTime + totalAwakeTime)) * 100;

    // Good sleep consistency means low awake percentage
    // 0% awake = 100% consistency, 20% awake = 80% consistency, etc.
    const consistencyScore = Math.max(0, 100 - awakePercentage);
    return roundTo(consistencyScore, 1);
  }

  // Original bedtime variance calculation for when we have multiple nights
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

export const processSleepData = (
  sleepSamples: readonly CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[],
  targetDate: Date
) => {
  console.log(
    `\n=== Debug processSleepData for ${targetDate.toDateString()} ===`
  );
  console.log(`Total sleep samples: ${sleepSamples.length}`);

  const sleepByDate: { [date: string]: number } = {};

  const allDates = Array.from(
    new Set(
      sleepSamples.map((sample) =>
        format(new Date(sample.endDate), "yyyy-MM-dd")
      )
    )
  );

  console.log(`Unique dates found: ${allDates.join(", ")}`);

  allDates.forEach((dateString) => {
    const date = new Date(dateString + "T12:00:00.000Z");
    const samplesForDate = getSleepSamplesForDate(sleepSamples, date);

    if (samplesForDate.length === 0) {
      sleepByDate[dateString] = 0;
      return;
    }

    // Simple calculation: sum all actual sleep time
    const totalSleepMs = samplesForDate
      .filter((sample) => ACTUAL_SLEEP_VALUES.includes(sample.value))
      .reduce((sum, sample) => {
        const durationMs = differenceInMilliseconds(
          new Date(sample.endDate),
          new Date(sample.startDate)
        );
        return sum + durationMs;
      }, 0);

    console.log(
      `Date ${dateString}: ${samplesForDate.length} samples, ${(
        totalSleepMs /
        (1000 * 60 * 60)
      ).toFixed(2)} hours sleep`
    );
    sleepByDate[dateString] = totalSleepMs;
  });

  const dailySleepDurations = Object.entries(sleepByDate).map(
    ([date, durationMs]) => ({
      date,
      duration: roundTo(msToHours(durationMs), 1),
    })
  );

  const targetDateString = format(targetDate, "yyyy-MM-dd");
  const targetSleep = dailySleepDurations.find(
    (d) => d.date === targetDateString
  );
  const totalSleep = targetSleep ? targetSleep.duration : 0;

  console.log(`Target date ${targetDateString}: ${totalSleep} hours`);
  return { totalSleep, dailySleepDurations };
};

/**
 * Groups samples into sleep sessions, handling cross-midnight sessions
 */
/**
 * Calculate basic sleep performance metrics for fallback
 */
export const calculateSleepMetrics = (
  sleepSamples: readonly CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[],
  totalSleep: number,
  targetDate: Date
): {
  hoursVsNeeded: number;
  sleepConsistency: number;
  sleepEfficiency: number;
  sleepStress: number;
} => {
  const hoursVsNeeded = Math.min(
    100,
    (totalSleep / SLEEP_PERFORMANCE_GOAL_HOURS) * 100
  );

  const sleepConsistency = calculateSleepConsistency(sleepSamples, targetDate);
  const sleepEfficiency = calculateSleepEfficiency(sleepSamples, targetDate);

  const targetDateSamples = getSleepSamplesForDate(sleepSamples, targetDate);

  const totalAwakeTime = targetDateSamples
    .filter((s) => s.value === CategoryValueSleepAnalysis.awake)
    .reduce((acc, s) => {
      const duration =
        new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
      return acc + duration;
    }, 0);

  const totalSleepTime = targetDateSamples
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

  let sleepStressScore: number;

  if (totalSleepTime === 0 && totalAwakeTime === 0) {
    sleepStressScore = 0;
  } else if (awakePercentage === 0) {
    sleepStressScore = 95;
  } else {
    sleepStressScore = Math.max(0, 100 - awakePercentage);
  }

  return {
    hoursVsNeeded: roundTo(hoursVsNeeded, 0),
    sleepConsistency: roundTo(sleepConsistency, 0),
    sleepEfficiency: roundTo(sleepEfficiency, 0),
    sleepStress: roundTo(sleepStressScore, 0),
  };
};

/**
 * Get sleep samples for a specific target date
 * Uses noon-to-noon window to capture overnight sleep ending on the target date
 */
const getSleepSamplesForDate = (
  sleepSamples: readonly CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[],
  targetDate: Date
): CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[] => {
  // Create window from noon of previous day to noon of target date
  // This captures the night that ends on the target date
  const startOfWindow = new Date(targetDate);
  startOfWindow.setDate(startOfWindow.getDate() - 1);
  startOfWindow.setHours(12, 0, 0, 0); // Previous day at noon

  const endOfWindow = new Date(targetDate);
  endOfWindow.setHours(12, 0, 0, 0); // Target date at noon

  console.log(
    `\n=== Debug getSleepSamplesForDate for ${targetDate.toDateString()} ===`
  );
  console.log(
    `Window: ${startOfWindow.toLocaleString()} to ${endOfWindow.toLocaleString()}`
  );
  console.log(`Total samples available: ${sleepSamples.length}`);

  const filtered = sleepSamples.filter((sample) => {
    const startDate = new Date(sample.startDate);
    const endDate = new Date(sample.endDate);

    // Include samples that start within the window OR end within the window
    // This ensures we capture all sleep data for the night
    return (
      (startDate >= startOfWindow && startDate < endOfWindow) ||
      (endDate > startOfWindow && endDate <= endOfWindow) ||
      (startDate < startOfWindow && endDate > endOfWindow)
    );
  });

  console.log(`Filtered samples: ${filtered.length}`);
  if (filtered.length > 0) {
    console.log(
      `First sample: ${new Date(filtered[0].startDate).toLocaleString()}`
    );
    console.log(
      `Last sample: ${new Date(
        filtered[filtered.length - 1].endDate
      ).toLocaleString()}`
    );
  }

  return filtered;
};

/**
 * Calculate detailed sleep stage analysis for a specific date
 */
export const calculateSleepStageAnalysis = (
  sleepSamples: readonly CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[],
  targetDate: Date
): {
  totalSleepTime: string;
  timeInBed: string;
  stages: {
    awake: {
      name: string;
      percentage: number;
      duration: number;
      color: string;
    };
    light: {
      name: string;
      percentage: number;
      duration: number;
      color: string;
    };
    deep: { name: string; percentage: number; duration: number; color: string };
    rem: { name: string; percentage: number; duration: number; color: string };
  };
  restorativeSleep: {
    duration: string;
  };
} => {
  const targetDateSamples = getSleepSamplesForDate(sleepSamples, targetDate);

  const stageDurations = {
    awake: 0,
    light: 0,
    deep: 0,
    rem: 0,
  };

  let totalSleepTime = 0;
  let totalTimeInBedFromInBedSamples = 0;

  targetDateSamples.forEach((sample) => {
    const durationMinutes =
      (new Date(sample.endDate).getTime() -
        new Date(sample.startDate).getTime()) /
      (1000 * 60);

    switch (sample.value) {
      case CategoryValueSleepAnalysis.inBed:
        totalTimeInBedFromInBedSamples += durationMinutes;
        break;
      case CategoryValueSleepAnalysis.awake:
        stageDurations.awake += durationMinutes;
        break;
      case CategoryValueSleepAnalysis.asleepCore:
      case CategoryValueSleepAnalysis.asleepUnspecified:
        stageDurations.light += durationMinutes;
        totalSleepTime += durationMinutes;
        break;
      case CategoryValueSleepAnalysis.asleepDeep:
        stageDurations.deep += durationMinutes;
        totalSleepTime += durationMinutes;
        break;
      case CategoryValueSleepAnalysis.asleepREM:
        stageDurations.rem += durationMinutes;
        totalSleepTime += durationMinutes;
        break;
    }
  });

  // Determine total time in bed
  let finalTimeInBed: number;
  if (totalTimeInBedFromInBedSamples > 0) {
    // Use explicit inBed samples if available
    finalTimeInBed = totalTimeInBedFromInBedSamples;
  } else {
    // Fallback: calculate from sleep stages + awake time
    finalTimeInBed = totalSleepTime + stageDurations.awake;
  }

  // Calculate percentages based on time in bed (not just sleep + awake)

  const stages = {
    awake: {
      name: "Awake",
      duration: Math.round(stageDurations.awake),
      percentage:
        finalTimeInBed > 0
          ? roundTo((stageDurations.awake / finalTimeInBed) * 100, 0)
          : 0,
      color: Colors.sleep.awake,
    },
    light: {
      name: "Light",
      duration: Math.round(stageDurations.light),
      percentage:
        finalTimeInBed > 0
          ? roundTo((stageDurations.light / finalTimeInBed) * 100, 0)
          : 0,
      color: Colors.sleep.light,
    },
    deep: {
      name: "SWS (Deep)",
      duration: Math.round(stageDurations.deep),
      percentage:
        finalTimeInBed > 0
          ? roundTo((stageDurations.deep / finalTimeInBed) * 100, 0)
          : 0,
      color: Colors.sleep.deep,
    },
    rem: {
      name: "REM",
      duration: Math.round(stageDurations.rem),
      percentage:
        finalTimeInBed > 0
          ? roundTo((stageDurations.rem / finalTimeInBed) * 100, 0)
          : 0,
      color: Colors.sleep.rem,
    },
  };

  const restorativeSleepMinutes = stageDurations.deep + stageDurations.rem;

  return {
    totalSleepTime: formatDuration(Math.round(totalSleepTime)),
    timeInBed: formatDuration(Math.round(finalTimeInBed)),
    stages,
    restorativeSleep: {
      duration: formatDuration(Math.round(restorativeSleepMinutes)),
    },
  };
};

/**
 * Calculate comprehensive sleep performance score
 * Combines duration (50%), efficiency (30%), and consistency (20%)
 */
export const calculateSleepPerformance = (
  totalSleep: number,
  sleepEfficiency: number,
  sleepConsistency: number
): number => {
  // Duration score: optimal around 7-9 hours, penalize too little or too much
  let durationScore = 0;
  if (totalSleep >= 7 && totalSleep <= 9) {
    durationScore = 100;
  } else if (totalSleep >= 6 && totalSleep < 7) {
    durationScore = 70 + ((totalSleep - 6) / 1) * 30; // 70-100%
  } else if (totalSleep > 9 && totalSleep <= 10) {
    durationScore = 70 + ((10 - totalSleep) / 1) * 30; // 100-70%
  } else if (totalSleep >= 5 && totalSleep < 6) {
    durationScore = 40 + ((totalSleep - 5) / 1) * 30; // 40-70%
  } else if (totalSleep > 10 && totalSleep <= 11) {
    durationScore = 40 + ((11 - totalSleep) / 1) * 30; // 70-40%
  } else if (totalSleep < 5) {
    durationScore = Math.max(0, (totalSleep / 5) * 40); // 0-40%
  } else {
    durationScore = Math.max(0, 40 - (totalSleep - 11) * 10); // <40% for >11h
  }

  // Efficiency score: direct mapping (85%+ is good)
  const efficiencyScore = Math.min(100, Math.max(0, sleepEfficiency));

  // Consistency score: higher is better (90%+ is good)
  const consistencyScore = Math.min(100, Math.max(0, sleepConsistency));

  // Weighted combination: Duration 50%, Efficiency 30%, Consistency 20%
  const overallScore =
    durationScore * 0.5 + efficiencyScore * 0.3 + consistencyScore * 0.2;

  return roundTo(overallScore, 1);
};

export const getPerformanceColor = (perf: number) => {
  if (perf >= 80) return Colors.sleep.performance.excellent;
  if (perf >= 60) return Colors.sleep.performance.good;
  return Colors.sleep.performance.poor;
};

/**
 * Enhanced Sleep Performance Calculation
 * Implements comprehensive sleep analysis based on HealthKit data
 */

/**
 * Groups sleep samples into contiguous sleep sessions (clusters)
 * Properly handles inBed samples as the container for sleep sessions
 */
export const createSleepClusters = (
  sleepSamples: readonly CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[]
): SleepCluster[] => {
  if (!sleepSamples || sleepSamples.length === 0) return [];

  const sortedSamples = [...sleepSamples].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const clusters: SleepCluster[] = [];
  const MAX_GAP_MS = 4 * 60 * 60 * 1000; // 4 hours gap breaks a sleep session

  // Group samples by time proximity
  let currentGroup: typeof sortedSamples = [];

  for (const sample of sortedSamples) {
    if (currentGroup.length === 0) {
      currentGroup = [sample];
    } else {
      const lastSample = currentGroup[currentGroup.length - 1];
      const gap =
        new Date(sample.startDate).getTime() -
        new Date(lastSample.endDate).getTime();

      if (gap <= MAX_GAP_MS) {
        currentGroup.push(sample);
      } else {
        // Process current group and start new one
        if (currentGroup.length > 0) {
          const cluster = createClusterFromSamples(currentGroup);
          if (cluster) clusters.push(cluster);
        }
        currentGroup = [sample];
      }
    }
  }

  // Process final group
  if (currentGroup.length > 0) {
    const cluster = createClusterFromSamples(currentGroup);
    if (cluster) clusters.push(cluster);
  }

  // Mark main sleep sessions (>= 3 hours of sleep)
  clusters.forEach((cluster) => {
    cluster.isMainSleep = msToHours(cluster.asleepMs) >= 3;
  });

  return clusters;
};

/**
 * Create a sleep cluster from a group of samples
 */
const createClusterFromSamples = (
  samples: CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[]
): SleepCluster | null => {
  if (samples.length === 0) return null;

  const startTime = new Date(samples[0].startDate);
  const endTime = new Date(samples[samples.length - 1].endDate);

  let totalAsleepMs = 0;
  let totalTimeInBedMs = 0;

  samples.forEach((sample) => {
    const durationMs =
      new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime();

    if (sample.value === CategoryValueSleepAnalysis.inBed) {
      totalTimeInBedMs += durationMs;
    } else if (ACTUAL_SLEEP_VALUES.includes(sample.value)) {
      totalAsleepMs += durationMs;
    }
  });

  // If no explicit inBed samples, calculate from session duration
  if (totalTimeInBedMs === 0) {
    totalTimeInBedMs = endTime.getTime() - startTime.getTime();
  }

  return {
    start: startTime,
    end: endTime,
    asleepMs: totalAsleepMs,
    timeInBedMs: totalTimeInBedMs,
    isMainSleep: false, // Will be set later
  };
};

/**
 * Calculate sleep need based on baseline, strain, debt, and naps
 */
export const calculateSleepNeed = (
  baselineHours: number = 8.0,
  strainHours: number = 0.0,
  sleepDebtHours: number = 0.0,
  napHours: number = 0.0
): SleepNeed => {
  const totalNeedHours = Math.max(
    0,
    baselineHours + strainHours + sleepDebtHours - napHours
  );

  return {
    baselineHours,
    strainHours,
    sleepDebtHours,
    napHours,
    totalNeedHours,
  };
};

/**
 * Calculate enhanced sleep consistency based on timing variance over multiple nights
 */
export const calculatEnhancedSleepConsistency = (
  clusters: SleepCluster[]
): number => {
  const mainSleepClusters = clusters
    .filter((c) => c.isMainSleep)
    .sort((a, b) => a.end.getTime() - b.end.getTime())
    .slice(-5); // Last 5 nights

  if (mainSleepClusters.length < 2) return 100;

  let totalBedDiffMinutes = 0;
  let totalWakeDiffMinutes = 0;
  let countDiffs = 0;

  for (let i = 1; i < mainSleepClusters.length; i++) {
    const prev = mainSleepClusters[i - 1];
    const curr = mainSleepClusters[i];

    // Calculate bedtime variance (24h ideal interval)
    const idealInterval = 24 * 60 * 60 * 1000; // 24 hours in ms
    const actualBedInterval = curr.start.getTime() - prev.start.getTime();
    const bedDiff = Math.abs(actualBedInterval - idealInterval);
    totalBedDiffMinutes += msToMinutes(bedDiff);

    // Calculate wake time variance
    const actualWakeInterval = curr.end.getTime() - prev.end.getTime();
    const wakeDiff = Math.abs(actualWakeInterval - idealInterval);
    totalWakeDiffMinutes += msToMinutes(wakeDiff);

    countDiffs++;
  }

  const avgBedDiffMin = totalBedDiffMinutes / countDiffs;
  const avgWakeDiffMin = totalWakeDiffMinutes / countDiffs;
  const avgTimingDiffMin = (avgBedDiffMin + avgWakeDiffMin) / 2;

  // Convert to score: 1 point deducted per 6 minutes of variance
  const consistencyScore = Math.max(0, 100 - avgTimingDiffMin / 6);
  return roundTo(consistencyScore, 1);
};

/**
 * Calculate sleep stress using physiological data during sleep
 */
export const calculateSleepStress = async (
  sleepCluster: SleepCluster
): Promise<number> => {
  const { start, end } = sleepCluster;

  try {
    // Fetch physiological data during sleep
    const [hrSamples, hrvSamples, respSamples] = await Promise.all([
      queryQuantitySamples("HKQuantityTypeIdentifierHeartRate", {
        filter: { startDate: start, endDate: end },
      }),
      queryQuantitySamples("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", {
        filter: { startDate: start, endDate: end },
      }),
      queryQuantitySamples("HKQuantityTypeIdentifierRespiratoryRate", {
        filter: { startDate: start, endDate: end },
      }),
    ]);

    const hrValues = (hrSamples as QuantitySample[]).map(
      (s: QuantitySample) => s.quantity
    );
    const hrvValues = (hrvSamples as QuantitySample[]).map(
      (s: QuantitySample) => s.quantity
    );
    const respValues = (respSamples as QuantitySample[]).map(
      (s: QuantitySample) => s.quantity
    );

    let stressPercentage = 0;

    // Analyze heart rate stress indicators
    if (hrValues.length > 0) {
      const sortedHR = [...hrValues].sort((a, b) => a - b);
      const hrThreshold = sortedHR[Math.floor(0.9 * sortedHR.length)]; // 90th percentile
      const highHrCount = hrValues.filter(
        (hr: number) => hr > hrThreshold
      ).length;
      const highHrFraction = highHrCount / hrValues.length;
      stressPercentage += highHrFraction * 100;
    }

    // Analyze HRV stress indicators (low HRV = high stress)
    if (hrvValues.length > 0) {
      const sortedHRV = [...hrvValues].sort((a, b) => a - b);
      const hrvThreshold = sortedHRV[Math.floor(0.1 * sortedHRV.length)]; // 10th percentile
      const lowHrvCount = hrvValues.filter(
        (v: number) => v < hrvThreshold
      ).length;
      const lowHrvFraction = lowHrvCount / hrvValues.length;
      stressPercentage += lowHrvFraction * 100;
    }

    // Analyze respiratory rate stress indicators
    if (respValues.length > 0) {
      const sortedResp = [...respValues].sort((a, b) => a - b);
      const respThreshold = sortedResp[Math.floor(0.9 * sortedResp.length)]; // 90th percentile
      const highRespCount = respValues.filter(
        (r: number) => r > respThreshold
      ).length;
      const highRespFraction = highRespCount / respValues.length;
      stressPercentage += highRespFraction * 50; // Half weight for respiratory rate
    }

    // Cap stress percentage at 100% and invert to score (higher is better)
    stressPercentage = Math.min(100, stressPercentage);
    const sleepStressScore = Math.max(0, 100 - stressPercentage);

    // If no physiological stress indicators were found, fall back to basic calculation
    if (
      hrValues.length === 0 &&
      hrvValues.length === 0 &&
      respValues.length === 0
    ) {
      return calculateBasicSleepStress(sleepCluster);
    }

    return roundTo(sleepStressScore, 1);
  } catch (error) {
    console.warn(
      "Could not fetch physiological data for sleep stress calculation:",
      error
    );
    // Fallback to basic awake time calculation
    return calculateBasicSleepStress(sleepCluster);
  }
};

/**
 * Fallback sleep stress calculation based on awake time percentage
 */
const calculateBasicSleepStress = (sleepCluster: SleepCluster): number => {
  const totalTime =
    sleepCluster.asleepMs + (sleepCluster.timeInBedMs - sleepCluster.asleepMs);

  if (totalTime === 0) return 0;

  const awakeTime = sleepCluster.timeInBedMs - sleepCluster.asleepMs;
  const awakePercentage = (awakeTime / totalTime) * 100;

  const highSleepStress = awakePercentage > 10 ? awakePercentage - 10 : 0;
  const sleepQualityScore = Math.max(0, 100 - highSleepStress);

  return roundTo(sleepQualityScore, 1);
};

/**
 * Calculate comprehensive enhanced sleep performance metrics
 */
export const calculateEnhancedSleepPerformance = async (
  targetDate: Date,
  sleepNeed?: SleepNeed
): Promise<SleepPerformanceMetrics> => {
  // Fetch sleep data for consistency analysis
  const sleepSamples: CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[] =
    await queryCategorySamples("HKCategoryTypeIdentifierSleepAnalysis", {
      limit: QUERY_LIMIT,
    });

  if (!sleepSamples || sleepSamples.length === 0) {
    throw new Error("No sleep data available");
  }

  // Create sleep clusters
  const clusters = createSleepClusters(sleepSamples);
  const mainCluster = clusters.find((c) => c.isMainSleep);

  if (!mainCluster) {
    throw new Error("Could not identify main sleep session");
  }

  // Calculate sleep need (use provided or defaults)
  const calculatedSleepNeed = sleepNeed || calculateSleepNeed();

  // Calculate total sleep hours from main cluster
  const totalSleepHours = msToHours(mainCluster.asleepMs);

  // 1. Hours vs. Needed
  const hoursVsNeeded =
    calculatedSleepNeed.totalNeedHours > 0
      ? Math.min(
          100,
          (totalSleepHours / calculatedSleepNeed.totalNeedHours) * 100
        )
      : 100;

  // 2. Sleep Consistency
  // Use the improved calculateSleepConsistency with fallback logic
  const sleepConsistency = calculateSleepConsistency(sleepSamples, targetDate);

  // 3. Sleep Efficiency
  const sleepEfficiency =
    mainCluster.timeInBedMs > 0
      ? Math.min(100, (mainCluster.asleepMs / mainCluster.timeInBedMs) * 100)
      : 0;

  // 4. Sleep Stress
  const sleepStress = await calculateSleepStress(mainCluster);

  // 5. Overall Score (weighted average)
  const overallScore = Math.round(
    (hoursVsNeeded + sleepConsistency + sleepEfficiency + sleepStress) / 4
  );

  return {
    hoursVsNeeded: Math.round(hoursVsNeeded),
    sleepConsistency: Math.round(sleepConsistency),
    sleepEfficiency: Math.round(sleepEfficiency),
    sleepStress: Math.round(sleepStress),
    overallScore,
    sleepNeed: calculatedSleepNeed,
    mainCluster,
  };
};

/**
 * Enhanced sleep performance calculation with personalized sleep need
 * This is the main function that should be used for comprehensive sleep analysis
 */
export const calculatePersonalizedSleepPerformance = async (
  targetDate: Date,
  baselineHours: number = 8.0,
  strainHours: number = 0.0,
  sleepDebtHours: number = 0.0,
  napHours: number = 0.0
): Promise<SleepPerformanceMetrics> => {
  const sleepNeed = calculateSleepNeed(
    baselineHours,
    strainHours,
    sleepDebtHours,
    napHours
  );
  return calculateEnhancedSleepPerformance(targetDate, sleepNeed);
};

/**
 * Convenience function for getting enhanced sleep metrics with user preferences
 * This can be called from React components that need detailed sleep analysis
 */
export const getSleepMetrics = async (
  targetDate: Date,
  options?: {
    baselineHours?: number;
    strainHours?: number;
    sleepDebtHours?: number;
    napHours?: number;
  }
): Promise<SleepPerformanceMetrics> => {
  const {
    baselineHours = 8.0,
    strainHours = 0.0,
    sleepDebtHours = 0.0,
    napHours = 0.0,
  } = options || {};

  return calculatePersonalizedSleepPerformance(
    targetDate,
    baselineHours,
    strainHours,
    sleepDebtHours,
    napHours
  );
};

/**
 * Get sleep debt based on recent sleep history
 * Calculates accumulated sleep deficit from the past week
 */
export const calculateSleepDebt = async (
  targetHours: number = 8.0
): Promise<number> => {
  const sleepSamples: CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[] =
    await queryCategorySamples("HKCategoryTypeIdentifierSleepAnalysis", {
      limit: QUERY_LIMIT,
    });

  const clusters = createSleepClusters(sleepSamples);
  const mainSleepClusters = clusters.filter((c) => c.isMainSleep);

  let totalDebt = 0;

  mainSleepClusters.forEach((cluster) => {
    const actualSleep = msToHours(cluster.asleepMs);
    const deficit = Math.max(0, targetHours - actualSleep);
    totalDebt += deficit;
  });

  return roundTo(totalDebt, 1);
};

/**
 * Fetch sleep averages for 14 and 30 day periods relative to a target date
 */
export const fetchSleepAverages = async (
  targetDate: Date
): Promise<{
  last14Days: SleepAverages;
  last30Days: SleepAverages;
}> => {
  const range14Days = getDateRange(14, targetDate);
  // Fetch 30 days of data once and slice for 14 days
  const sleepSamples30: CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[] =
    await queryCategorySamples("HKCategoryTypeIdentifierSleepAnalysis", {
      limit: 3000,
    });

  // Filter the 30-day data to get 14-day samples
  const sleepSamples14 = sleepSamples30.filter(
    (sample: CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">) =>
      new Date(sample.startDate) >= range14Days.from
  );

  const calculate14DayAverages = () => {
    // Use the midpoint of the 14-day period as reference
    const midDate = new Date(
      range14Days.from.getTime() +
        (range14Days.to.getTime() - range14Days.from.getTime()) / 2
    );

    const { dailySleepDurations } = processSleepData(sleepSamples14, midDate);
    const efficiency = calculateSleepEfficiency(sleepSamples14, midDate);
    const consistency = calculateSleepConsistency(sleepSamples14, midDate);

    const durations = dailySleepDurations.map((d) => d.duration);
    const avgDuration = calculateAverage(durations);

    return {
      duration: roundTo(avgDuration, 1),
      efficiency: roundTo(efficiency, 1),
      performance: roundTo((efficiency + consistency) / 2, 1),
      consistency: roundTo(consistency, 1),
    };
  };

  const calculate30DayAverages = () => {
    // Use target date as reference for 30-day period
    const { dailySleepDurations } = processSleepData(
      sleepSamples30,
      targetDate
    );
    const efficiency = calculateSleepEfficiency(sleepSamples30, targetDate);
    const consistency = calculateSleepConsistency(sleepSamples30, targetDate);

    const durations = dailySleepDurations.map((d) => d.duration);
    const avgDuration = calculateAverage(durations);

    return {
      duration: roundTo(avgDuration, 1),
      efficiency: roundTo(efficiency, 1),
      performance: roundTo((efficiency + consistency) / 2, 1),
      consistency: roundTo(consistency, 1),
    };
  };

  return {
    last14Days: calculate14DayAverages(),
    last30Days: calculate30DayAverages(),
  };
};
