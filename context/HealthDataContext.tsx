import {
  getDateOfBirth,
  getMostRecentQuantitySample,
  HKCategorySample,
  HKCategoryTypeIdentifier,
  HKCategoryValueSleepAnalysis,
  HKCharacteristicTypeIdentifier,
  HKQuantitySample,
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  HKUnits,
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";
import React, { createContext, ReactNode, useEffect, useState } from "react";

import {
  calculateRecoveryScore,
  getUserStats,
  SLEEP_CONSISTENCY_MAX_STD_DEV_HOURS,
  SLEEP_PERFORMANCE_GOAL_HOURS,
} from "@/lib/healthStats";

export interface HealthData {
  // Core Data
  sleep: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[];
  restingHeartRate: number | null;
  steps: number;
  caloriesBurned: number;
  rawCalories: readonly HKQuantitySample<HKQuantityTypeIdentifier.activeEnergyBurned>[];
  bloodOxygen: { value: number; date: Date | null } | null;
  hrv7DayAvg: number;
  hrvMostRecent: number;
  hrvValues: number[];
  age: number | null;
  weightInKg: number | null;

  // Primary Calculated Metrics
  sleepHours: number;
  sleepPerformance: number;
  sleepConsistency: number;
  recoveryScore: number;
  strainScore: number;
  stressLevel: number;
  sleepEfficiency: number;

  // Secondary / For Charting
  dailySleepDurations: { date: string; duration: number }[];
}

const defaultData: HealthData = {
  // GeneralStats
  age: null,
  weightInKg: null,
  steps: 0,

  // WorkoutStats
  exerciseMins: 0,
  standHours: 0,
  moveKcal: 0,
  rawCalories: [],

  // SleepStats
  sleepHours: 0,
  sleepPerformance: 0,
  sleepConsistency: 0,
  sleepEfficiency: 0,
  dailySleepDurations: [],
  sleep: [],

  // HeartStressStats
  restingHeartRate: null,
  hrv7DayAvg: 0,
  hrvMostRecent: 0,
  hrvValues: [],
  recoveryScore: 0,
  strainScore: 0,
  restingHeartRate: 0,
  steps: 0,
  caloriesBurned: 0,
  rawCalories: [],
  bloodOxygen: 0,
  stressLevel: 0,
  bloodOxygen: null,
};

export const HealthDataContext = createContext<{
  data: HealthData;
  refresh: () => Promise<void>;
}>({
  data: defaultData,
  refresh: async () => {},
});

const readPermissions = [
  HKQuantityTypeIdentifier.heartRate,
  HKCategoryTypeIdentifier.sleepAnalysis,
  HKQuantityTypeIdentifier.restingHeartRate,
  HKQuantityTypeIdentifier.stepCount,
  HKQuantityTypeIdentifier.activeEnergyBurned,
  HKQuantityTypeIdentifier.oxygenSaturation,
  HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
  HKQuantityTypeIdentifier.bodyMass,
  HKQuantityTypeIdentifier.height,
  HKQuantityTypeIdentifier.bodyFatPercentage,
  HKQuantityTypeIdentifier.activeEnergyBurned,
  HKCharacteristicTypeIdentifier.dateOfBirth,
];

const USE_FAKE_DATA = false;

export const HealthDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<HealthData>(defaultData);

  const initData = async () => {
    if (USE_FAKE_DATA || !isHealthKitAvailable) {
      console.log("Using fake data");
      setData(generateFakeHealthData());
    } else {
      try {
        const fetchedData = await getAllHealthStats();
        setData(fetchedData);
      } catch (error) {
        console.error("getAllHealthStats failed:", error);
        setData(generateFakeHealthData());
      }
    }
  };

  useEffect(() => {
    initData();
  }, []);

  return (
    <HealthDataContext.Provider value={{ data, refresh: initData }}>
      {children}
    </HealthDataContext.Provider>
  );
};

async function fetchBaseData() {
  if (!isHealthKitAvailable) {
    throw new Error("HealthKit is not available on this platform.");
  }

  try {
    return await fetchAllData();
  } catch (error) {
    console.error("Error fetching HealthKit data", error);
    throw error;
  }
}

async function fetchAllData() {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const sleepSamples = await queryCategorySamples(
      HKCategoryTypeIdentifier.sleepAnalysis,
      { from: sevenDaysAgo, to: today }
    );

    const stepsToday = new Date();
    stepsToday.setHours(0, 0, 0, 0);
    const stepsStat = await queryStatisticsForQuantity(
      HKQuantityTypeIdentifier.stepCount,
      [HKStatisticsOptions.cumulativeSum],
      stepsToday,
      today
    );

    const caloriesStart = new Date();
    caloriesStart.setHours(0, 0, 0, 0);
    const caloriesSamples = await queryQuantitySamples(
      HKQuantityTypeIdentifier.activeEnergyBurned,
      { from: caloriesStart, to: today }
    );

    const spo2Sample = await getMostRecentQuantitySample(
      HKQuantityTypeIdentifier.oxygenSaturation,
      HKUnits.Percent
    );

    const hrvSamples = await queryQuantitySamples(
      HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
      { from: sevenDaysAgo, to: today }
    );
    const dob = await getDateOfBirth();
    const weightSample = await getMostRecentQuantitySample(
      HKQuantityTypeIdentifier.bodyMass,
      "kg"
    );

    const restingHRSample = await getMostRecentQuantitySample(
      HKQuantityTypeIdentifier.restingHeartRate,
      "count/min"
    );

    const hrvValues = hrvSamples.map((s) => s.quantity);

    // --- USE getUserStats FOR PRIMARY CALCULATIONS ---
    const userStats = await getUserStats();

    // --- SUPPLEMENT WITH ADDITIONAL DATA NEEDED FOR HealthData INTERFACE ---
    const age = dob ? today.getFullYear() - dob.getFullYear() : null;
    const weightInKg = weightSample?.quantity ?? null;

    const { totalSleep, dailySleepDurations } = processSleepData(sleepSamples);
    const sleepEfficiency = calculateSleepEfficiency(sleepSamples);
    const sleepConsistency = calculateSleepConsistency(sleepSamples);
    const { hrv7DayAvg, hrvMostRecent } = processHrv(hrvValues);

    const restingHeartRate = restingHRSample?.quantity ?? null;
    const stressLevel = calculateStressLevel(restingHeartRate, hrv7DayAvg);

    return {
      // Core Data
      sleep: sleepSamples,
      restingHeartRate,
      steps: stepsStat?.sumQuantity?.quantity || 0,
      caloriesBurned: userStats.moveKcal,
      rawCalories: caloriesSamples,
      bloodOxygen: spo2Sample
        ? { value: spo2Sample.quantity, date: new Date(spo2Sample.endDate) }
        : null,
      hrv7DayAvg,
      hrvMostRecent,
      hrvValues,
      age,
      weightInKg,

      // Calculated Metrics - Using getUserStats results
      sleepHours: parseFloat(totalSleep.toFixed(1)),
      sleepPerformance: Math.min(
        100,
        (totalSleep / SLEEP_PERFORMANCE_GOAL_HOURS) * 100
      ),
      sleepConsistency,
      recoveryScore: userStats.recoveryScore,
      strainScore: userStats.strainScore,
      stressLevel,
      sleepEfficiency,
      dailySleepDurations,
    } as HealthData;
  } catch (fetchError) {
    console.error("HealthKit data fetch error", fetchError);
    throw new Error(
      "Failed to fetch health data. Please check permissions and try again."
    );
  }
}

//////////////////////////////////////
// Enhanced Strain Score Calculation
// Uses heart rate zones, duration, and activity intensity
//////////////////////////////////////

// --- DETAILED CALCULATION FUNCTIONS ---

/**
 * STRESS LEVEL (Improved): Uses the RHR to HRV ratio.
 * A higher RHR and lower HRV can indicate higher physiological stress (sympathetic dominance).
 * This score is independent of the Recovery Score.
 */
function calculateStressLevel(
  restingHeartRate: number | null,
  hrv: number | null
): number {
  if (!restingHeartRate || !hrv || hrv === 0) return 0;

  // A higher ratio suggests more stress. Normalize this to a 0-100 scale.
  // A typical RHR/HRV ratio for healthy adults might be 1.0-2.0. A ratio > 2.5 could indicate high stress.
  const ratio = restingHeartRate / hrv;

  // Let's map a ratio of 0.5 to 0 (very low stress) and 3.0 to 100 (high stress).
  const stressScore = ((ratio - 0.5) / (3.0 - 0.5)) * 100;

  return Math.max(0, Math.min(100, parseFloat(stressScore.toFixed(1))));
}

/**
 * SLEEP EFFICIENCY: Total time asleep / total time in bed.
 */
function calculateSleepEfficiency(
  sleepSamples: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[]
): number {
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
  return parseFloat(efficiency.toFixed(1));
}

/**
 * SLEEP CONSISTENCY: Calculates the standard deviation of bedtimes over the last week.
 */
function calculateSleepConsistency(
  sleepSamples: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[]
): number {
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
  return parseFloat(consistency.toFixed(1));
}

// --- HELPER & PROCESSING FUNCTIONS ---

function processSleepData(
  sleepSamples: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[]
) {
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
      duration: parseFloat((durationMs / (1000 * 3600)).toFixed(1)),
    })
  );

  // Calculate total sleep for the most recent night.
  const lastSleepDay = dailySleepDurations.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  const totalSleep = lastSleepDay ? lastSleepDay.duration : 0;

  return { totalSleep, dailySleepDurations };
}

function processHrv(hrvValues: number[]) {
  if (hrvValues.length === 0) {
    return { hrv7DayAvg: 0, hrvMostRecent: 0 };
  }
  const hrv7DayAvg =
    hrvValues.reduce((sum, val) => sum + val, 0) / hrvValues.length;
  const hrvMostRecent = hrvValues[hrvValues.length - 1];
  return { hrv7DayAvg, hrvMostRecent };
}

// --- FAKE DATA GENERATOR (For Development) ---

function generateFakeHealthData(): HealthData {
  console.log("Generating fake data...");
  const fakeAge = 30;
  const fakeWeight = 75;
  const fakeRHR = 60;
  const fakeHrvValues = [40, 42, 48, 45, 43, 52, 50];

  return {
    // GeneralStats
    age: fakeAge,
    weightInKg: fakeWeight,
    steps: 8500,

    // WorkoutStats
    exerciseMins: 45,
    standHours: 10,
    moveKcal: 500,
    rawCalories: [],

    // SleepStats
    sleepHours: 7.5,
    sleepPerformance: 94,
    sleepConsistency: 85,
    recoveryScore: calculateRecoveryScore(
      fakeHrvValues,
      fakeRHR,
      15, // respiratory rate
      92, // sleep efficiency
      50  // prior strain
    ),
    strainScore: 65, // Dummy value
    stressLevel: calculateStressLevel(fakeRHR, hrv7DayAvg),
    steps: 8500,
    caloriesBurned: 500,
    bloodOxygen: { value: 0.98, date: new Date() },
  };
}
