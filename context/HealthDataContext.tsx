import {
  getMostRecentQuantitySample,
  HKCategorySample,
  HKCategoryTypeIdentifier,
  HKCategoryValueSleepAnalysis,
  HKQuantitySample,
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  HKUnits,
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  requestAuthorization,
  saveQuantitySample,
  UnitOfEnergy,
  UnitOfVolume,
} from "@kingstinct/react-native-healthkit";
import React, { createContext, ReactNode, useEffect, useState } from "react";
import { Platform } from "react-native";

interface ActivitySample {
  start: Date;
  end: Date;
  mets: number;
  energyBurned: number;
}

export interface HealthData {
  sleep: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[];
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
  hrvValues: number[];
}

const defaultData: HealthData = {
  sleep: [],
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
  hrvValues: [],
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
  writeHealthData: (options: WriteHealthDataOptions) => Promise<void>;
}>({
  data: defaultData,
  refresh: async () => {},
  writeHealthData: async () => {},
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
  HKQuantityTypeIdentifier.dietaryWater,
];

// Add environment variable to enable fake data for testing
const USE_FAKE_DATA = false; // Set to true to use fake data in development

// Check if HealthKit is available
const isHealthKitAvailable = Platform.OS === 'ios';

console.log('HealthKit availability check:');
console.log('Platform.OS:', Platform.OS);
console.log('isHealthKitAvailable:', isHealthKitAvailable);

// Initialize HealthKit if available
let healthKitInitialized = false;

const initializeHealthKit = async () => {
  if (isHealthKitAvailable && !healthKitInitialized) {
    try {
      console.log('Initializing HealthKit...');
      const isAvailable = await isHealthDataAvailable();
      if (isAvailable) {
        await requestAuthorization(readPermissions, writePermissions);
        healthKitInitialized = true;
        console.log('HealthKit initialized successfully');
      } else {
        console.log('HealthKit not available on this device');
      }
    } catch (error) {
      console.log('[ERROR] Cannot grant HealthKit permissions!', error);
    }
  } else {
    console.log('HealthKit not available or already initialized');
  }
};

export const HealthDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<HealthData>(defaultData);

  useEffect(() => {
    console.log("HealthDataProvider useEffect running, USE_FAKE_DATA:", USE_FAKE_DATA);

    const initData = async () => {
      if (USE_FAKE_DATA || !isHealthKitAvailable) {
        console.log("Using fake data");
        setData(generateFakeHealthData());
      } else {
        console.log("Initializing HealthKit and fetching data...");
        try {
          await initializeHealthKit();
          const fetchedData = await fetchBaseData();
          setData(fetchedData);
        } catch (error) {
          console.error("fetchBaseData failed:", error);
          // Fallback to fake data on error
          console.log("Falling back to fake data due to error");
          setData(generateFakeHealthData());
        }
      }
    };

    initData();
  }, []);

  const refresh = async () => {
    try {
      if (USE_FAKE_DATA || !isHealthKitAvailable) {
        const newData = generateFakeHealthData();
        setData(newData);
      } else {
        await initializeHealthKit();
        const newData = await fetchBaseData();
        setData(newData);
      }
    } catch (error) {
      console.error("Error refreshing health data", error);
      // Fallback to fake data on error
      setData(generateFakeHealthData());
    }
  };

  const writeHealthData = async (options: WriteHealthDataOptions) => {
    try {
      if (USE_FAKE_DATA || !isHealthKitAvailable) {
        console.log("Fake data mode - would write:", options);
        return;
      }

      await writeToAppleHealth(options);
      // Refresh data after writing
      await refresh();
    } catch (error) {
      console.error("Error writing health data", error);
      throw error;
    }
  };

  return (
    <HealthDataContext.Provider value={{ data, refresh, writeHealthData }}>
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
  console.log("Fetching base health data...");

  // Check if HealthKit is available
  if (!isHealthKitAvailable) {
    console.log("HealthKit not available - using fake data");
    return generateFakeHealthData();
  }

  try {
    const data = await fetchAllData();
    console.log("Fetched HealthKit data successfully");
    calculateSecondary(data);
    return data;
  } catch (error) {
    console.error("Error fetching HealthKit data", error);
    throw error;
  }
}

async function fetchAllData() {
  try {
    console.log("Fetching HealthKit data...");

    const today = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Sleep
    const sleepSamples = await queryCategorySamples(
      HKCategoryTypeIdentifier.sleepAnalysis,
      {
        from: sevenDaysAgo,
        to: today,
      }
    );

    const totalSleep = sleepSamples
      .filter((s) => ACTUAL_SLEEP_VALUES.includes(s.value))
      .reduce(
        (sum: number, s) =>
          sum +
          (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) /
            1000 /
            3600,
        0
      );

    // Steps for today
    const stepsToday = new Date();
    stepsToday.setHours(0, 0, 0, 0);
    const stepsStat = await queryStatisticsForQuantity(
      HKQuantityTypeIdentifier.stepCount,
      [HKStatisticsOptions.cumulativeSum],
      stepsToday,
      today
    );

    // Resting Heart Rate
    const restingHR = await getMostRecentQuantitySample(
      HKQuantityTypeIdentifier.restingHeartRate,
      'count/min'
    );

    // Active Calories
    const caloriesStart = new Date();
    caloriesStart.setHours(0, 0, 0, 0);
    const caloriesSamples = await queryQuantitySamples(
      HKQuantityTypeIdentifier.activeEnergyBurned,
      {
        from: caloriesStart,
        to: today,
      }
    );

    const totalCaloriesBurned = caloriesSamples.reduce(
      (sum: number, record) => sum + record.quantity,
      0
    );

    // SpO2
    const spo2Sample = await getMostRecentQuantitySample(
      HKQuantityTypeIdentifier.oxygenSaturation,
      HKUnits.Percent
    );

    // HRV
    const hrvSamples = await queryQuantitySamples(
      HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
      {
        from: sevenDaysAgo,
        to: today,
      }
    );
    const hrvValues = hrvSamples.map((s) => s.quantity);

    const sleepSamplesForConsistency = sleepSamples
      .filter((s) => s.value === HKCategoryValueSleepAnalysis.inBed)
      .map((s) => new Date(s.startDate));

    const sleepConsistency = calculateSleepConsistency(
      sleepSamplesForConsistency
    );
    const recoveryScore = calculateRecoveryScore(hrvValues);
    const strainScore = calculateStrainScore(totalCaloriesBurned);
    const stressLevel = calculateStressLevelFromHRV(hrvValues);
    console.log("Stress Level:", stressLevel, "%");

    return {
      sleep: sleepSamples,
      sleepHours: parseFloat(totalSleep.toFixed(2)),
      sleepPerformance: Math.min(100, (totalSleep / 8) * 100),
      sleepConsistency,
      recoveryScore,
      strainScore: strainScore,
      restingHeartRate: restingHR?.quantity || 0,
      steps: stepsStat?.sumQuantity?.quantity || 0,
      caloriesBurned: totalCaloriesBurned,
      rawCalories: caloriesSamples,
      bloodOxygen: spo2Sample?.quantity || 0,
      stressLevel,
      hrvValues,
    } as HealthData;
  } catch (fetchError) {
    console.error("HealthKit data fetch error", fetchError);
    throw new Error(
      "Failed to fetch health data. Please check permissions and try again."
    );
  }
}

const calculateStrainScore = (activeCalories: number): number => {
  const strain = (activeCalories / 1000) * 100;
  return Math.min(100, parseFloat(strain.toFixed(1)));
};

const calculateStressLevelFromHRV = (hrvData: number[]): number => {
  if (hrvData.length === 0) return 0;
  const recovery = calculateRecoveryScore(hrvData);
  return parseFloat((100 - recovery).toFixed(1));
};

//////////////////////////////////////
// 1. Sleep Efficiency
// total asleep time ÷ time in bed × 100
//////////////////////////////////////
function calculateSleepEfficiency(rawSleepSamples: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[]): number {
  let totalInBedMs = 0;
  let totalAsleepMs = 0;

  for (const s of rawSleepSamples) {
    const durationMs =
      new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
    if (s.value === HKCategoryValueSleepAnalysis.inBed) {
      totalInBedMs += durationMs;
    } else if (ACTUAL_SLEEP_VALUES.includes(s.value)) {
      totalAsleepMs += durationMs;
    }
  }

  if (totalInBedMs === 0) return 0;
  const efficiency = (totalAsleepMs / totalInBedMs) * 100;
  return parseFloat(efficiency.toFixed(1));
}

//////////////////////////////////////
// 2. Sleep Consistency
// 100 − normalized SD of bedtimes across days
//////////////////////////////////////
function calculateSleepConsistency(bedTimes: Date[]): number {
  if (bedTimes.length < 2) return 100; // Or 0, or handle as per preference for single/no data points

  const msSinceMidnight = bedTimes.map((d) => {
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  });
  const mean =
    msSinceMidnight.reduce((a, b) => a + b, 0) / msSinceMidnight.length;
  const variance =
    msSinceMidnight.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) /
    msSinceMidnight.length;
  const sd = Math.sqrt(variance);

  // assume a maximum tolerable SD of 3 hours (10 800 s) maps to consistency=0%
  const maxSd = 3 * 3600;
  const consistency = Math.max(0, 100 - (sd / maxSd) * 100);
  return parseFloat(consistency.toFixed(1));
}

//////////////////////////////////////
// 3. Recovery Score (HRV normalization)
// map HRV (SDNN) into 0–100 scale by observed min/max
//////////////////////////////////////
function calculateRecoveryScore(hrvValues: number[]): number {
  if (hrvValues.length === 0) return 0;
  const minHRV = Math.min(...hrvValues);
  const maxHRV = Math.max(...hrvValues);
  const latest = hrvValues[hrvValues.length - 1];
  if (maxHRV === minHRV) return 100;
  const score = ((latest - minHRV) / (maxHRV - minHRV)) * 100;
  return parseFloat(score.toFixed(1));
}

//////////////////////////////////////
// 4. Training Load (Strain)
// sum of (METs × duration_hours) or simply energy burned
//////////////////////////////////////
function calculateTrainingLoad(activities: ActivitySample[]): number {
  let totalEnergyBurned = 0;
  activities.forEach((a) => {
    totalEnergyBurned += a.energyBurned; // Summing up energyBurned directly
  });
  return parseFloat(totalEnergyBurned.toFixed(1));
}

//////////////////////////////////////
// 5. Stress Index
// inverse of HRV: higher when HRV low
//////////////////////////////////////
function calculateStressIndex(hrvValues: number[]): number {
  if (hrvValues.length === 0) return 0;
  // e.g., stress = 100 − recoveryScore
  const recovery = calculateRecoveryScore(hrvValues);
  return parseFloat((100 - recovery).toFixed(1));
}

//////////////////////////////////////
// 6. Pearson Correlation
// between two metrics, e.g., sleep vs. stress
//////////////////////////////////////
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let num = 0,
    denX = 0,
    denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  return denom === 0 ? 0 : parseFloat((num / denom).toFixed(3));
}

// Helper function to convert raw HealthData.rawCalories to ActivitySample[]
function hdToActivitySamples(hd: HealthData): ActivitySample[] {
  if (!hd.rawCalories) return [];
  return hd.rawCalories.map((s) => ({
    start: new Date(s.startDate),
    end: new Date(s.endDate),
    mets: 0, // METs are not provided by activeEnergyBurned, so set to 0 or a default
    energyBurned: s.quantity,
  }));
}

function calculateSecondary(hd: HealthData) {
  // hd.sleep contains the raw HealthValue[] sleep samples
  console.log("Sleep Efficiency:", calculateSleepEfficiency(hd.sleep), "%");

  const bedTimes = hd.sleep
    .filter((s) => String(s.value) === "INBED")
    .map((s) => new Date(s.startDate));
  console.log("Sleep Consistency:", calculateSleepConsistency(bedTimes), "%");

  console.log("Recovery Score:", calculateRecoveryScore(hd.hrvValues), "/100");
  console.log("Stress Index:", calculateStressIndex(hd.hrvValues), "/100");

  const activities: ActivitySample[] = hdToActivitySamples(hd);
  console.log(
    "Training Load (Energy Burned):",
    calculateTrainingLoad(activities),
    "kcal"
  );

  // Correlate sleep hours vs. stress index across days:
  // Calculate daily actual sleep duration
  const dailySleepDurations: number[] = [];
  if (hd.sleep.length > 0) {
    const sleepByDate: { [key: string]: number } = {};
    hd.sleep.forEach((sample) => {
      if (ACTUAL_SLEEP_VALUES.includes(sample.value)) {
        const day = new Date(sample.startDate).toISOString().split("T")[0];
        const duration =
          (new Date(sample.endDate).getTime() -
            new Date(sample.startDate).getTime()) /
          (1000 * 3600);
        sleepByDate[day] = (sleepByDate[day] || 0) + duration;
      }
    });
    dailySleepDurations.push(...Object.values(sleepByDate));
  }

  // Assuming hrvValues in HealthData are daily or can be mapped to the same period as sleep.
  // For simplicity, if hrvValues are daily SDNN values, we can use them directly.
  // If stress is calculated daily based on these, ensure alignment.
  // This example assumes dailyStress can be derived or is available in a compatible format.
  // The current calculateStressIndex uses the latest HRV relative to min/max, not daily.
  // For a proper daily stress correlation, daily stress values would be needed.
  // Here, we'll use a placeholder or a simplified approach if dailyStress is not readily available.
  // For now, let's assume calculateStressIndex can be mapped if hrvValues represent daily readings.
  // This part might need further refinement based on how hrvValues are structured over time.
  if (
    dailySleepDurations.length > 0 &&
    hd.hrvValues.length >= dailySleepDurations.length
  ) {
    // This is a simplification. A robust daily stress calculation would be needed.
    const dailyStressApproximation = hd.hrvValues
      .slice(0, dailySleepDurations.length)
      .map((hrv) =>
        parseFloat((100 - calculateRecoveryScore([hrv])).toFixed(1))
      );
    console.log(
      "Sleep-Stress Correlation:",
      pearsonCorrelation(dailySleepDurations, dailyStressApproximation)
    );
  } else {
    console.log("Sleep-Stress Correlation: Not enough data for correlation.");
  }
}

// Fake data generator for testing
function generateFakeHealthData(): HealthData {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Generate fake sleep data for the past 7 days
  const fakeSleep: HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[] = [];
  for (let i = 6; i >= 0; i--) {
    const sleepDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);

    // Bedtime (INBED) - around 10-11 PM
    const bedtime = new Date(sleepDate);
    bedtime.setHours(22 + Math.random() * 1, Math.random() * 60, 0, 0);

    // Wake time - around 6-8 AM next day
    const wakeTime = new Date(bedtime.getTime() + 24 * 60 * 60 * 1000);
    wakeTime.setHours(6 + Math.random() * 2, Math.random() * 60, 0, 0);

    // INBED sample
    fakeSleep.push({
      value: HKCategoryValueSleepAnalysis.inBed,
      startDate: bedtime,
      endDate: wakeTime,
      uuid: `fake-sleep-inbed-${i}`,
      metadata: {},
    } as HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>);

    // ASLEEP samples (simulate different sleep stages)
    const sleepStart = new Date(bedtime.getTime() + 15 * 60 * 1000); // 15 min to fall asleep
    const sleepEnd = new Date(wakeTime.getTime() - 10 * 60 * 1000); // wake 10 min before getting up

    // Core sleep
    fakeSleep.push({
      value: HKCategoryValueSleepAnalysis.asleepCore,
      startDate: sleepStart,
      endDate: new Date(sleepStart.getTime() + 4 * 60 * 60 * 1000),
      uuid: `fake-sleep-core-${i}`,
      metadata: {},
    } as HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>);

    // Deep sleep
    fakeSleep.push({
      value: HKCategoryValueSleepAnalysis.asleepDeep,
      startDate: new Date(sleepStart.getTime() + 1 * 60 * 60 * 1000),
      endDate: new Date(sleepStart.getTime() + 3 * 60 * 60 * 1000),
      uuid: `fake-sleep-deep-${i}`,
      metadata: {},
    } as HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>);

    // REM sleep
    fakeSleep.push({
      value: HKCategoryValueSleepAnalysis.asleepREM,
      startDate: new Date(sleepStart.getTime() + 5 * 60 * 60 * 1000),
      endDate: sleepEnd,
      uuid: `fake-sleep-rem-${i}`,
      metadata: {},
    } as HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>);
  }

  // Generate fake calorie data for today
  const fakeCalories: HKQuantitySample<HKQuantityTypeIdentifier.activeEnergyBurned>[] = [];
  for (let hour = 6; hour < 22; hour++) {
    const hourlyCalories = 50 + Math.random() * 150; // 50-200 calories per hour
    const startTime = new Date(today);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    fakeCalories.push({
      quantity: hourlyCalories,
      unit: 'kcal',
      startDate: startTime,
      endDate: endTime,
      uuid: `fake-calories-${hour}`,
      metadata: {},
    } as HKQuantitySample<HKQuantityTypeIdentifier.activeEnergyBurned>);
  }

  // Generate fake HRV values for the past 7 days
  const fakeHRV: number[] = [];
  for (let i = 0; i < 7; i++) {
    fakeHRV.push(25 + Math.random() * 30); // HRV between 25-55ms
  }

  // Calculate totals and metrics
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

  return {
    sleep: fakeSleep,
    sleepHours: parseFloat(totalSleep.toFixed(2)),
    sleepPerformance: Math.min(100, (totalSleep / 8) * 100),
    sleepConsistency: calculateSleepConsistency(bedTimes),
    recoveryScore: calculateRecoveryScore(fakeHRV),
    strainScore: calculateStrainScore(totalCaloriesBurned),
    restingHeartRate: 55 + Math.random() * 25, // 55-80 bpm
    steps: Math.floor(6000 + Math.random() * 8000), // 6,000-14,000 steps
    caloriesBurned: totalCaloriesBurned,
    rawCalories: fakeCalories,
    bloodOxygen: 95 + Math.random() * 4, // 95-99%
    stressLevel: calculateStressLevelFromHRV(fakeHRV),
    hrvValues: fakeHRV,
  };
}

// Function to write data to Apple Health
async function writeToAppleHealth(
  options: WriteHealthDataOptions
): Promise<void> {
  const promises: Promise<boolean>[] = [];

  try {
    // Save steps
    if (options.steps) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.stepCount,
          HKUnits.Count,
          options.steps,
          {
            start: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            end: new Date(),
          }
        )
      );
    }

    // Save weight
    if (options.weight) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.bodyMass,
          'kg',
          options.weight,
          {
            start: new Date(),
            end: new Date(),
          }
        )
      );
    }

    // Save height
    if (options.height) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.height,
          'm',
          options.height / 100, // Convert cm to meters
          {
            start: new Date(),
            end: new Date(),
          }
        )
      );
    }

    // Save heart rate
    if (options.heartRate) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.heartRate,
          'count/min',
          options.heartRate,
          {
            start: new Date(),
            end: new Date(),
          }
        )
      );
    }

    // Save body fat percentage
    if (options.bodyFatPercentage) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.bodyFatPercentage,
          HKUnits.Percent,
          options.bodyFatPercentage / 100, // Convert percentage to decimal
          {
            start: new Date(),
            end: new Date(),
          }
        )
      );
    }

    // Save water intake
    if (options.waterIntake) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.dietaryWater,
          UnitOfVolume.Liter, // Liter unit
          options.waterIntake / 1000, // Convert ml to liters
          {
            start: new Date(),
            end: new Date(),
          }
        )
      );
    }

    // Save active energy burned
    if (options.activeEnergyBurned) {
      promises.push(
        saveQuantitySample(
          HKQuantityTypeIdentifier.activeEnergyBurned,
          UnitOfEnergy.Kilocalories, // Kilocalorie unit
          options.activeEnergyBurned,
          {
            start: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            end: new Date(),
          }
        )
      );
    }

    // Execute all promises
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (error) {
    console.error("Error writing to HealthKit:", error);
    throw error;
  }
}
