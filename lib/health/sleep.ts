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

export const fetchSleepAnalysis = async (
  targetDate: Date
): Promise<SleepAnalysis> => {
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

  let performanceMetrics: SleepPerformanceMetrics;

  try {
    performanceMetrics = await calculateEnhancedSleepPerformance(targetDate);
  } catch {
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

  const stageAnalysis = calculateSleepStageAnalysis(sleepSamples, targetDate);

  return {
    ...performanceMetrics,
    overallPerformance: performanceMetrics.overallScore,

    totalSleepTime: stageAnalysis.totalSleepTime,
    totalSleepHours: totalSleep,
    timeInBed: stageAnalysis.timeInBed,

    stages: stageAnalysis.stages,

    restorativeSleep: {
      duration: stageAnalysis.restorativeSleep.duration,
      minutes:
        stageAnalysis.stages.deep.duration + stageAnalysis.stages.rem.duration,
    },

    dailySleepDurations,
  };
};

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

  targetDateSamples.forEach((sample) => {
    const durationMs =
      new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime();

    if (sample.value === CategoryValueSleepAnalysis.inBed) {
      totalTimeInBedMs += durationMs;
    } else if (ACTUAL_SLEEP_VALUES.includes(sample.value)) {
      totalAsleepMs += durationMs;
    }
  });

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

export const calculateSleepConsistency = (
  sleepSamples: readonly CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[],
  targetDate: Date
): number => {
  const bedTimes = sleepSamples
    .filter((s) => s.value === CategoryValueSleepAnalysis.inBed)
    .map((s) => new Date(s.startDate));

  if (bedTimes.length < 2) {
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

    const consistencyScore = Math.max(0, 100 - awakePercentage);
    return roundTo(consistencyScore, 1);
  }

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
  const sleepByDate: { [date: string]: number } = {};

  const allDates = Array.from(
    new Set(
      sleepSamples.map((sample) =>
        format(new Date(sample.endDate), "yyyy-MM-dd")
      )
    )
  );

  allDates.forEach((dateString) => {
    const date = new Date(dateString + "T12:00:00.000Z");
    const samplesForDate = getSleepSamplesForDate(sleepSamples, date);

    if (samplesForDate.length === 0) {
      sleepByDate[dateString] = 0;
      return;
    }

    const totalSleepMs = samplesForDate
      .filter((sample) => ACTUAL_SLEEP_VALUES.includes(sample.value))
      .reduce((sum, sample) => {
        const durationMs = differenceInMilliseconds(
          new Date(sample.endDate),
          new Date(sample.startDate)
        );
        return sum + durationMs;
      }, 0);

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

  return { totalSleep, dailySleepDurations };
};

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

const getSleepSamplesForDate = (
  sleepSamples: readonly CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[],
  targetDate: Date
): CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[] => {
  const startOfWindow = new Date(targetDate);
  startOfWindow.setDate(startOfWindow.getDate() - 1);
  startOfWindow.setHours(12, 0, 0, 0);

  const endOfWindow = new Date(targetDate);
  endOfWindow.setHours(12, 0, 0, 0);

  const filtered = sleepSamples.filter((sample) => {
    const startDate = new Date(sample.startDate);
    const endDate = new Date(sample.endDate);

    return (
      (startDate >= startOfWindow && startDate < endOfWindow) ||
      (endDate > startOfWindow && endDate <= endOfWindow) ||
      (startDate < startOfWindow && endDate > endOfWindow)
    );
  });

  return filtered;
};

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

  let finalTimeInBed: number;
  if (totalTimeInBedFromInBedSamples > 0) {
    finalTimeInBed = totalTimeInBedFromInBedSamples;
  } else {
    finalTimeInBed = totalSleepTime + stageDurations.awake;
  }

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

export const calculateSleepPerformance = (
  totalSleep: number,
  sleepEfficiency: number,
  sleepConsistency: number
): number => {
  let durationScore = 0;
  if (totalSleep >= 7 && totalSleep <= 9) {
    durationScore = 100;
  } else if (totalSleep >= 6 && totalSleep < 7) {
    durationScore = 70 + ((totalSleep - 6) / 1) * 30;
  } else if (totalSleep > 9 && totalSleep <= 10) {
    durationScore = 70 + ((10 - totalSleep) / 1) * 30;
  } else if (totalSleep >= 5 && totalSleep < 6) {
    durationScore = 40 + ((totalSleep - 5) / 1) * 30;
  } else if (totalSleep > 10 && totalSleep <= 11) {
    durationScore = 40 + ((11 - totalSleep) / 1) * 30;
  } else if (totalSleep < 5) {
    durationScore = Math.max(0, (totalSleep / 5) * 40);
  } else {
    durationScore = Math.max(0, 40 - (totalSleep - 11) * 10);
  }

  const efficiencyScore = Math.min(100, Math.max(0, sleepEfficiency));

  const consistencyScore = Math.min(100, Math.max(0, sleepConsistency));

  const overallScore =
    durationScore * 0.5 + efficiencyScore * 0.3 + consistencyScore * 0.2;

  return roundTo(overallScore, 1);
};

export const getPerformanceColor = (perf: number) => {
  if (perf >= 80) return Colors.sleep.performance.excellent;
  if (perf >= 60) return Colors.sleep.performance.good;
  return Colors.sleep.performance.poor;
};

export const createSleepClusters = (
  sleepSamples: readonly CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[]
): SleepCluster[] => {
  if (!sleepSamples || sleepSamples.length === 0) return [];

  const sortedSamples = [...sleepSamples].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const clusters: SleepCluster[] = [];
  const MAX_GAP_MS = 4 * 60 * 60 * 1000;

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
        if (currentGroup.length > 0) {
          const cluster = createClusterFromSamples(currentGroup);
          if (cluster) clusters.push(cluster);
        }
        currentGroup = [sample];
      }
    }
  }

  if (currentGroup.length > 0) {
    const cluster = createClusterFromSamples(currentGroup);
    if (cluster) clusters.push(cluster);
  }

  clusters.forEach((cluster) => {
    cluster.isMainSleep = msToHours(cluster.asleepMs) >= 3;
  });

  return clusters;
};

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

  if (totalTimeInBedMs === 0) {
    totalTimeInBedMs = endTime.getTime() - startTime.getTime();
  }

  return {
    start: startTime,
    end: endTime,
    asleepMs: totalAsleepMs,
    timeInBedMs: totalTimeInBedMs,
    isMainSleep: false,
  };
};

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

export const calculatEnhancedSleepConsistency = (
  clusters: SleepCluster[]
): number => {
  const mainSleepClusters = clusters
    .filter((c) => c.isMainSleep)
    .sort((a, b) => a.end.getTime() - b.end.getTime())
    .slice(-5);

  if (mainSleepClusters.length < 2) return 100;

  let totalBedDiffMinutes = 0;
  let totalWakeDiffMinutes = 0;
  let countDiffs = 0;

  for (let i = 1; i < mainSleepClusters.length; i++) {
    const prev = mainSleepClusters[i - 1];
    const curr = mainSleepClusters[i];

    const idealInterval = 24 * 60 * 60 * 1000;
    const actualBedInterval = curr.start.getTime() - prev.start.getTime();
    const bedDiff = Math.abs(actualBedInterval - idealInterval);
    totalBedDiffMinutes += msToMinutes(bedDiff);

    const actualWakeInterval = curr.end.getTime() - prev.end.getTime();
    const wakeDiff = Math.abs(actualWakeInterval - idealInterval);
    totalWakeDiffMinutes += msToMinutes(wakeDiff);

    countDiffs++;
  }

  const avgBedDiffMin = totalBedDiffMinutes / countDiffs;
  const avgWakeDiffMin = totalWakeDiffMinutes / countDiffs;
  const avgTimingDiffMin = (avgBedDiffMin + avgWakeDiffMin) / 2;

  const consistencyScore = Math.max(0, 100 - avgTimingDiffMin / 6);
  return roundTo(consistencyScore, 1);
};

export const calculateSleepStress = async (
  sleepCluster: SleepCluster
): Promise<number> => {
  const { start, end } = sleepCluster;

  try {
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

    if (hrValues.length > 0) {
      const sortedHR = [...hrValues].sort((a, b) => a - b);
      const hrThreshold = sortedHR[Math.floor(0.9 * sortedHR.length)];
      const highHrCount = hrValues.filter(
        (hr: number) => hr > hrThreshold
      ).length;
      const highHrFraction = highHrCount / hrValues.length;
      stressPercentage += highHrFraction * 100;
    }

    if (hrvValues.length > 0) {
      const sortedHRV = [...hrvValues].sort((a, b) => a - b);
      const hrvThreshold = sortedHRV[Math.floor(0.1 * sortedHRV.length)];
      const lowHrvCount = hrvValues.filter(
        (v: number) => v < hrvThreshold
      ).length;
      const lowHrvFraction = lowHrvCount / hrvValues.length;
      stressPercentage += lowHrvFraction * 100;
    }

    if (respValues.length > 0) {
      const sortedResp = [...respValues].sort((a, b) => a - b);
      const respThreshold = sortedResp[Math.floor(0.9 * sortedResp.length)];
      const highRespCount = respValues.filter(
        (r: number) => r > respThreshold
      ).length;
      const highRespFraction = highRespCount / respValues.length;
      stressPercentage += highRespFraction * 50;
    }

    stressPercentage = Math.min(100, stressPercentage);
    const sleepStressScore = Math.max(0, 100 - stressPercentage);

    if (
      hrValues.length === 0 &&
      hrvValues.length === 0 &&
      respValues.length === 0
    ) {
      return calculateBasicSleepStress(sleepCluster);
    }

    return roundTo(sleepStressScore, 1);
  } catch {
    return calculateBasicSleepStress(sleepCluster);
  }
};

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

export const calculateEnhancedSleepPerformance = async (
  targetDate: Date,
  sleepNeed?: SleepNeed
): Promise<SleepPerformanceMetrics> => {
  const sleepSamples: CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[] =
    await queryCategorySamples("HKCategoryTypeIdentifierSleepAnalysis", {
      limit: QUERY_LIMIT,
    });

  if (!sleepSamples || sleepSamples.length === 0) {
    throw new Error("No sleep data available");
  }

  const clusters = createSleepClusters(sleepSamples);
  const mainCluster = clusters.find((c) => c.isMainSleep);

  if (!mainCluster) {
    throw new Error("Could not identify main sleep session");
  }

  const calculatedSleepNeed = sleepNeed || calculateSleepNeed();

  const totalSleepHours = msToHours(mainCluster.asleepMs);

  const hoursVsNeeded =
    calculatedSleepNeed.totalNeedHours > 0
      ? Math.min(
          100,
          (totalSleepHours / calculatedSleepNeed.totalNeedHours) * 100
        )
      : 100;

  const sleepConsistency = calculateSleepConsistency(sleepSamples, targetDate);

  const sleepEfficiency =
    mainCluster.timeInBedMs > 0
      ? Math.min(100, (mainCluster.asleepMs / mainCluster.timeInBedMs) * 100)
      : 0;

  const sleepStress = await calculateSleepStress(mainCluster);

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

export const fetchSleepAverages = async (
  targetDate: Date
): Promise<{
  last14Days: SleepAverages;
  last30Days: SleepAverages;
}> => {
  const range14Days = getDateRange(14, targetDate);
  const sleepSamples30: CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">[] =
    await queryCategorySamples("HKCategoryTypeIdentifierSleepAnalysis", {
      limit: 3000,
    });

  const sleepSamples14 = sleepSamples30.filter(
    (sample: CategorySampleTyped<"HKCategoryTypeIdentifierSleepAnalysis">) =>
      new Date(sample.startDate) >= range14Days.from
  );

  const calculate14DayAverages = () => {
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
