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
  HKWorkout,
  HKWorkoutTypeIdentifier,
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  saveQuantitySample,
  UnitOfEnergy,
  UnitOfVolume,
} from "@kingstinct/react-native-healthkit";
import React, { createContext, ReactNode, useEffect, useState } from "react";
import { Platform } from "react-native";

const SLEEP_PERFORMANCE_GOAL_HOURS = 8;
const SLEEP_CONSISTENCY_MAX_STD_DEV_HOURS = 2.5;
const STRAIN_NORMALIZATION_FACTOR = 12; // Adjusts the final strain score to a 0-100 scale

const ACTIVITY_MULTIPLIERS = {
  LOW_INTENSITY: 0.9, // < 4 METs
  MODERATE_INTENSITY: 1.1, // 4-7 METs
  HIGH_INTENSITY: 1.4, // > 7 METs
};

const ACTUAL_SLEEP_VALUES = [
  HKCategoryValueSleepAnalysis.asleepUnspecified,
  HKCategoryValueSleepAnalysis.asleepDeep,
  HKCategoryValueSleepAnalysis.asleepCore,
  HKCategoryValueSleepAnalysis.asleepREM,
];
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
  restingHeartRate: number;
  steps: number;
  caloriesBurned: number; // This is total for the day
  rawCalories: readonly HKQuantitySample<HKQuantityTypeIdentifier.activeEnergyBurned>[];
  bloodOxygen: number;
  stressLevel: number;
  sleepEfficiency: number;

  // Secondary / For Charting
  dailySleepDurations: { date: string; duration: number }[];
}

const defaultData: HealthData = {
  sleep: [],
  restingHeartRate: null,
  steps: 0,
  caloriesBurned: 0,
  rawCalories: [],
  bloodOxygen: null,
  hrv7DayAvg: 0,
  hrvMostRecent: 0,
  hrvValues: [],
  age: null,
  weightInKg: null,
  sleepHours: 0,
  sleepPerformance: 0,
  sleepConsistency: 0,
  recoveryScore: 0,
  strainScore: 0,
  restingHeartRate: 0,
  steps: 0,
  caloriesBurned: 0,
  rawCalories: [],
  bloodOxygen: 0,
  stressLevel: 0,
  sleepEfficiency: 0,
  dailySleepDurations: [],
};

// Write data interfaces
export interface WriteHealthDataOptions {
  steps?: number;
  weight?: number; // in kg
  height?: number; // in cm
  heartRate?: number; // bpm
  bodyFatPercentage?: number; // percentage
  activeEnergyBurned?: number; // calories
  waterIntake?: number; // ml
  mindfulSession?: {
    duration: number; // minutes
    startDate?: Date;
  };
  workout?: {
    type: string;
    duration: number; // minutes
    energyBurned?: number; // calories
    distance?: number; // meters
    startDate?: Date;
  };
}

export const HealthDataContext = createContext<{
  data: HealthData;
  refresh: () => Promise<void>;
}>({
  data: defaultData,
  refresh: async () => {},
});

// Define permissions needed for reading
const readPermissions = [
  HKQuantityTypeIdentifier.heartRate,
  HKCategoryTypeIdentifier.sleepAnalysis,
  HKQuantityTypeIdentifier.restingHeartRate,
  HKQuantityTypeIdentifier.stepCount,
  HKQuantityTypeIdentifier.activeEnergyBurned,
  HKQuantityTypeIdentifier.oxygenSaturation,
  HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
];

// Define permissions needed for writing
const writePermissions = [
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
const isHealthKitAvailable = Platform.OS === "ios";
let healthKitInitialized = false;

const initializeHealthKit = async () => {
  if (isHealthKitAvailable && !healthKitInitialized) {
    try {
      const isAvailable = await isHealthDataAvailable();

      if (isAvailable) {
        await requestAuthorization(readPermissions, []);
        healthKitInitialized = true;
      }
    } catch (error) {
      console.log("[ERROR] Cannot grant HealthKit permissions!", error);
    }
  } else {
    console.log("HealthKit not available or already initialized");
  }
};

export const HealthDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<HealthData>(defaultData);

  const initData = async () => {
    if (USE_FAKE_DATA || !isHealthKitAvailable) {
      console.log("Using fake data");
      setData(generateFakeHealthData());
    } else {
      try {
        await initializeHealthKit();
        const fetchedData = await fetchBaseData();
        setData(fetchedData);
      } catch (error) {
        console.error("fetchBaseData failed:", error);
        setData(generateFakeHealthData());
      }
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // const writeHealthData = async (options: WriteHealthDataOptions) => {
  //   try {
  //     if (USE_FAKE_DATA || !isHealthKitAvailable) {
  //       console.log("Fake data mode - would write:", options);
  //       return;
  //     }

  //     await writeToAppleHealth(options);
  //     await initData();
  //   } catch (error) {
  //     console.error("Error writing health data", error);
  //     throw error;
  //   }
  // };

  return (
    <HealthDataContext.Provider value={{ data, refresh: initData }}>
      {children}
    </HealthDataContext.Provider>
  );
};

// Helper array for actual sleep values
const ACTUAL_SLEEP_VALUES = [
  HKCategoryValueSleepAnalysis.asleepUnspecified,
  HKCategoryValueSleepAnalysis.asleepDeep,
  HKCategoryValueSleepAnalysis.asleepCore,
  HKCategoryValueSleepAnalysis.asleepREM,
];

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

    const restingHR = await getMostRecentQuantitySample(
      HKQuantityTypeIdentifier.restingHeartRate,
      "count/min"
    );

    const caloriesStart = new Date();
    caloriesStart.setHours(0, 0, 0, 0);
    const caloriesSamples = await queryQuantitySamples(
      HKQuantityTypeIdentifier.activeEnergyBurned,
      { from: caloriesStart, to: today }
    );

    const totalCaloriesBurned = caloriesSamples.reduce(
      (sum: number, record) => sum + record.quantity,
      0
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

    // Fetch workouts from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const workoutSamples = await queryWorkoutSamples({
      from: thirtyDaysAgo,
      to: today,
      ascending: false, // Most recent first
    });

    // --- DATA PROCESSING & PRIMARY CALCULATIONS ---
    const age = dob ? today.getFullYear() - dob.getFullYear() : null;
    const weightInKg = weightSample?.quantity ?? null;

    const { totalSleep, dailySleepDurations } = processSleepData(sleepSamples);
    const sleepEfficiency = calculateSleepEfficiency(sleepSamples);
    const sleepConsistency = calculateSleepConsistency(sleepSamples);
    const { hrv7DayAvg, hrvMostRecent } = processHrv(hrvValues);

    const recoveryScore = calculateRecoveryScore(hrvMostRecent, hrv7DayAvg);

    const caloriesBurned = caloriesSamples.reduce(
      (sum, record) => sum + record.quantity,
      0
    );

    const strainScore = calculateStrainScore({
      rawCalories: caloriesSamples,
      age: age,
      weightInKg: weightInKg,
    });

    const restingHeartRate = restingHRSample?.quantity ?? null;
    const stressLevel = calculateStressLevel(restingHeartRate, hrv7DayAvg);

    return {
      // Core Data
      sleep: sleepSamples,
      restingHeartRate,
      steps: stepsStat?.sumQuantity?.quantity || 0,
      caloriesBurned,
      rawCalories: caloriesSamples,
      bloodOxygen: spo2Sample
        ? { value: spo2Sample.quantity, date: new Date(spo2Sample.endDate) }
        : null,
      hrv7DayAvg,
      hrvMostRecent,
      hrvValues,
      age,
      weightInKg,

      // Calculated Metrics
      sleepHours: parseFloat(totalSleep.toFixed(1)),
      sleepPerformance: Math.min(
        100,
        (totalSleep / SLEEP_PERFORMANCE_GOAL_HOURS) * 100
      ),
      sleepConsistency,
      recoveryScore,
      strainScore,
      restingHeartRate: restingHR?.quantity || 0,
      steps: stepsStat?.sumQuantity?.quantity || 0,
      caloriesBurned: totalCaloriesBurned,
      rawCalories: caloriesSamples,
      bloodOxygen: spo2Sample?.quantity || 0,
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
 * RECOVERY SCORE (Improved): Compares the most recent HRV to the 7-day baseline.
 * A score > 50 means today's HRV is better than average, indicating good recovery.
 * A score < 50 suggests poorer recovery than average.
 */
function calculateRecoveryScore(
  mostRecentHrv: number,
  hrv7DayAvg: number
): number {
  if (!mostRecentHrv || !hrv7DayAvg) return 0;

  // The ratio gives a direct comparison to the recent norm.
  const recoveryRatio = mostRecentHrv / hrv7DayAvg;

  // Map the ratio to a 0-100 score. We'll map a ratio of 1.0 (equal to avg) to 50%.
  // Let's say a ratio of 1.5 (50% above avg) is a "perfect" score of 100.
  // And a ratio of 0.5 (50% below avg) is a "poor" score of 0.
  const score = 50 + (recoveryRatio - 1) * 100;

  return Math.max(0, Math.min(100, parseFloat(score.toFixed(1))));
}

/**
 * STRAIN SCORE (Improved): A simplified but more robust TRIMP-like model.
 * It uses age and weight for more accurate METs and Max HR estimation.
 */
interface StrainData {
  rawCalories: readonly HKQuantitySample<HKQuantityTypeIdentifier.activeEnergyBurned>[];
  age: number | null;
  weightInKg: number | null;
}
function calculateStrainScore(data: StrainData): number {
  const { rawCalories, age, weightInKg } = data;

  // We need weight and age for a meaningful calculation.
  if (!rawCalories || rawCalories.length === 0 || !age || !weightInKg) {
    return 0;
  }

  // Tanaka formula for Max HR is more accurate than age-based estimations from RHR.
  const maxHeartRate = 208 - 0.7 * age;

  let totalStrain = 0;
  rawCalories.forEach((session) => {
    const durationHours =
      (new Date(session.endDate).getTime() -
        new Date(session.startDate).getTime()) /
      (1000 * 60 * 60);
    if (durationHours <= 0) return;

    // Estimate METs from calories, duration, and body weight.
    // Formula: METs = (calories / (weight_kg * duration_hr))
    const estimatedMets = session.quantity / (weightInKg * durationHours);

    // Estimate average heart rate as a percentage of Max HR, based on METs.
    // This is a rough approximation. 1 MET (rest) is ~RHR. Max METs approaches Max HR.
    // A simple linear mapping: assume 12 METs is ~90% of Max HR.
    const intensityPercent = Math.min(0.95, (estimatedMets / 12) * 0.9);
    const estimatedAvgHr = intensityPercent * maxHeartRate;

    // Use a multiplier based on intensity zone (derived from METs)
    const activityMultiplier =
      estimatedMets < 4
        ? ACTIVITY_MULTIPLIERS.LOW_INTENSITY
        : estimatedMets < 7
        ? ACTIVITY_MULTIPLIERS.MODERATE_INTENSITY
        : ACTIVITY_MULTIPLIERS.HIGH_INTENSITY;

    // Simplified TRIMP: duration_in_minutes * intensity_factor * multiplier
    const sessionStrain =
      durationHours * 60 * intensityPercent * activityMultiplier;
    totalStrain += sessionStrain;
  });

  // Normalize to a user-friendly 0-100 scale.
  const normalizedStrain = Math.min(
    100,
    totalStrain / STRAIN_NORMALIZATION_FACTOR
  );

  return parseFloat(normalizedStrain.toFixed(1));
}

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
  let totalSleepMs = 0;

  sleepSamples.forEach((sample) => {
    if (ACTUAL_SLEEP_VALUES.includes(sample.value)) {
      // Use the END date to attribute sleep to the day the user woke up.
      const day = new Date(sample.endDate).toISOString().split("T")[0];
      const durationMs =
        new Date(sample.endDate).getTime() -
        new Date(sample.startDate).getTime();

      sleepByDate[day] = (sleepByDate[day] || 0) + durationMs;
      totalSleepMs += durationMs;
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
  const { hrv7DayAvg, hrvMostRecent } = processHrv(fakeHrvValues);

  return {
    sleepEfficiency: calculateSleepEfficiency(hd.sleep),
    trainingLoad: calculateTrainingLoad(activities),
    dailySleepDurations,
    sleepStressCorrelation,
  };
}

function generateFakeHealthData(): HealthData {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fakeSleep: HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[] =
    [];
  for (let i = 6; i >= 0; i--) {
    const sleepDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);

    const bedtime = new Date(sleepDate);
    bedtime.setHours(22 + Math.random() * 1, Math.random() * 60, 0, 0);

    const wakeTime = new Date(bedtime.getTime() + 24 * 60 * 60 * 1000);
    wakeTime.setHours(6 + Math.random() * 2, Math.random() * 60, 0, 0);

    fakeSleep.push({
      value: HKCategoryValueSleepAnalysis.inBed,
      startDate: bedtime,
      endDate: wakeTime,
      uuid: `fake-sleep-inbed-${i}`,
      metadata: {},
    } as HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>);

    const sleepStart = new Date(bedtime.getTime() + 15 * 60 * 1000); // 15 min to fall asleep
    const sleepEnd = new Date(wakeTime.getTime() - 10 * 60 * 1000); // wake 10 min before getting up

    fakeSleep.push({
      value: HKCategoryValueSleepAnalysis.asleepCore,
      startDate: sleepStart,
      endDate: new Date(sleepStart.getTime() + 4 * 60 * 60 * 1000),
      uuid: `fake-sleep-core-${i}`,
      metadata: {},
    } as HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>);
    fakeSleep.push({
      value: HKCategoryValueSleepAnalysis.asleepDeep,
      startDate: new Date(sleepStart.getTime() + 1 * 60 * 60 * 1000),
      endDate: new Date(sleepStart.getTime() + 3 * 60 * 60 * 1000),
      uuid: `fake-sleep-deep-${i}`,
      metadata: {},
    } as HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>);

    fakeSleep.push({
      value: HKCategoryValueSleepAnalysis.asleepREM,
      startDate: new Date(sleepStart.getTime() + 5 * 60 * 60 * 1000),
      endDate: sleepEnd,
      uuid: `fake-sleep-rem-${i}`,
      metadata: {},
    } as HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>);
  }

  const fakeCalories: HKQuantitySample<HKQuantityTypeIdentifier.activeEnergyBurned>[] =
    [];
  for (let hour = 6; hour < 22; hour++) {
    const hourlyCalories = 50 + Math.random() * 150; // 50-200 calories per hour
    const startTime = new Date(today);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    fakeCalories.push({
      quantity: hourlyCalories,
      unit: "kcal",
      startDate: startTime,
      endDate: endTime,
      uuid: `fake-calories-${hour}`,
      metadata: {},
    } as HKQuantitySample<HKQuantityTypeIdentifier.activeEnergyBurned>);
  }

  const fakeHRV: number[] = [];
  for (let i = 0; i < 7; i++) {
    fakeHRV.push(25 + Math.random() * 30);
  }

  const totalSleep = fakeSleep
    .filter((s) => ACTUAL_SLEEP_VALUES.includes(s.value))
    .reduce(
      (sum, s) =>
        sum +
        (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) /
          1000 /
          3600,
      0
    );

  const totalCaloriesBurned = fakeCalories.reduce(
    (sum, record) => sum + record.quantity,
    0
  );

  const bedTimes = fakeSleep
    .filter((s) => s.value === HKCategoryValueSleepAnalysis.inBed)
    .map((s) => new Date(s.startDate));

  const fakeHealthData = {
    sleep: fakeSleep,
    sleepHours: parseFloat(totalSleep.toFixed(2)),
    sleepPerformance: Math.min(100, (totalSleep / 8) * 100),
    sleepConsistency: calculateSleepConsistency(bedTimes),
    recoveryScore: calculateRecoveryScore(fakeHRV),
    strainScore: calculateStrainScore({
      activeCalories: totalCaloriesBurned,
      restingHeartRate: 55 + Math.random() * 25, // 55-80 bpm
      rawCalories: fakeCalories,
      hrvValues: fakeHRV,
    }),
    restingHeartRate: 55 + Math.random() * 25, // 55-80 bpm
    steps: Math.floor(6000 + Math.random() * 8000), // 6,000-14,000 steps
    caloriesBurned: totalCaloriesBurned,
    rawCalories: fakeCalories,
    bloodOxygen: 95 + Math.random() * 4, // 95-99%
    stressLevel: calculateStressLevelFromHRV(fakeHRV),
    hrvValues: fakeHRV,
    // Placeholder values for secondary metrics
    sleepEfficiency: 0,
    trainingLoad: 0,
    dailySleepDurations: [],
    sleepStressCorrelation: 0,
  };

  // Calculate and add secondary metrics
  const secondaryMetrics = calculateSecondary(fakeHealthData);
  return { ...fakeHealthData, ...secondaryMetrics };
}

async function writeToAppleHealth(
  options: WriteHealthDataOptions
): Promise<void> {
  const promises: Promise<boolean>[] = [];

  try {
    if (options.steps) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.stepCount,
          HKUnits.Count,
          options.steps,
          {
            start: new Date(Date.now() - 60 * 60 * 1000),
            end: new Date(),
          }
        )
      );
    }

    if (options.weight) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.bodyMass,
          "kg",
          options.weight,
          { start: new Date(), end: new Date() }
        )
      );
    }

    if (options.height) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.height,
          "m",
          options.height / 100,
          { start: new Date(), end: new Date() }
        )
      );
    }

    if (options.heartRate) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.heartRate,
          "count/min",
          options.heartRate,
          { start: new Date(), end: new Date() }
        )
      );
    }

    if (options.bodyFatPercentage) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.bodyFatPercentage,
          HKUnits.Percent,
          options.bodyFatPercentage / 100,
          { start: new Date(), end: new Date() }
        )
      );
    }

    if (options.waterIntake) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.dietaryWater,
          UnitOfVolume.Liter,
          options.waterIntake / 1000,
          { start: new Date(), end: new Date() }
        )
      );
    }

    if (options.activeEnergyBurned) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.activeEnergyBurned,
          UnitOfEnergy.Kilocalories,
          options.activeEnergyBurned,
          {
            start: new Date(Date.now() - 60 * 60 * 1000),
            end: new Date(),
          }
        )
      );
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (error) {
    console.error("Error writing to HealthKit:", error);
    throw error;
  }
}
