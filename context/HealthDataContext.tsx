import {
  getMostRecentQuantitySample,
  HKCategorySample,
  HKCategoryTypeIdentifier,
  HKCategoryValueSleepAnalysis,
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
  UnitOfVolume
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
  workouts: readonly HKWorkout[];
  bloodOxygen: number;
  stressLevel: number;
  hrvValues: number[];
  // Secondary calculated metrics
  sleepEfficiency: number;
  trainingLoad: number;
  dailySleepDurations: number[];
  sleepStressCorrelation: number;
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
  workouts: [],
  bloodOxygen: 0,
  stressLevel: 0,
  hrvValues: [],
  // Secondary calculated metrics
  sleepEfficiency: 0,
  trainingLoad: 0,
  dailySleepDurations: [],
  sleepStressCorrelation: 0,
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
  HKWorkoutTypeIdentifier,
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

const USE_FAKE_DATA = false;
const isHealthKitAvailable = Platform.OS === "ios";
let healthKitInitialized = false;

const initializeHealthKit = async () => {
  if (isHealthKitAvailable && !healthKitInitialized) {
    try {
      const isAvailable = await isHealthDataAvailable();
      if (isAvailable) {
        await requestAuthorization(readPermissions, writePermissions);
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

  const writeHealthData = async (options: WriteHealthDataOptions) => {
    try {
      if (USE_FAKE_DATA || !isHealthKitAvailable) {
        console.log("Fake data mode - would write:", options);
        return;
      }

      await writeToAppleHealth(options);
      await initData();
    } catch (error) {
      console.error("Error writing health data", error);
      throw error;
    }
  };

  return (
    <HealthDataContext.Provider
      value={{ data, refresh: initData, writeHealthData }}
    >
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
  HKCategoryValueSleepAnalysis.awake,
  HKCategoryValueSleepAnalysis.inBed,
];

async function fetchBaseData() {
  if (!isHealthKitAvailable) {
    throw new Error("HealthKit is not available on this platform.");
  }

  try {
    const data = await fetchAllData();
    const secondaryMetrics = calculateSecondary(data);
    return { ...data, ...secondaryMetrics };
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
    const hrvValues = hrvSamples.map((s) => s.quantity);

    // Fetch workouts from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const workoutSamples = await queryWorkoutSamples({
      from: thirtyDaysAgo,
      to: today,
      ascending: false, // Most recent first
    });

    const sleepSamplesForConsistency = sleepSamples
      .filter((s) => s.value === HKCategoryValueSleepAnalysis.inBed)
      .map((s) => new Date(s.startDate));

    const sleepConsistency = calculateSleepConsistency(
      sleepSamplesForConsistency
    );
    const recoveryScore = calculateRecoveryScore(hrvValues);
    const strainScore = calculateStrainScore({
      activeCalories: totalCaloriesBurned,
      restingHeartRate: restingHR?.quantity || 0,
      rawCalories: caloriesSamples,
      hrvValues,
    });
    const stressLevel = calculateStressLevelFromHRV(hrvValues);

    return {
      sleep: sleepSamples,
      sleepHours: parseFloat(totalSleep.toFixed(2)),
      sleepPerformance: Math.min(100, (totalSleep / 8) * 100),
      sleepConsistency,
      recoveryScore,
      strainScore,
      restingHeartRate: restingHR?.quantity || 0,
      steps: stepsStat?.sumQuantity?.quantity || 0,
      caloriesBurned: totalCaloriesBurned,
      rawCalories: caloriesSamples,
      workouts: workoutSamples,
      bloodOxygen: spo2Sample?.quantity || 0,
      stressLevel,
      hrvValues,
      // Secondary metrics will be calculated separately
      sleepEfficiency: 0,
      trainingLoad: 0,
      dailySleepDurations: [],
      sleepStressCorrelation: 0,
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

interface StrainCalculationData {
  activeCalories: number;
  restingHeartRate: number;
  rawCalories: readonly HKQuantitySample<HKQuantityTypeIdentifier.activeEnergyBurned>[];
  hrvValues: number[];
}

// Activity type multipliers (estimated from calories/time ratio)
const ACTIVITY_MULTIPLIERS = {
  LOW_INTENSITY: 0.8, // < 100 cal/hour
  MODERATE: 1.0, // 100-300 cal/hour
  HIGH_INTENSITY: 1.3, // 300-600 cal/hour
  VERY_HIGH: 1.6, // > 600 cal/hour
};

const calculateStrainScore = (data: StrainCalculationData): number => {
  const { activeCalories, restingHeartRate, rawCalories, hrvValues } = data;

  // Fallback to simple calculation if insufficient data
  if (!rawCalories || rawCalories.length === 0 || !restingHeartRate) {
    return calculateSimpleStrainScore(activeCalories);
  }

  let totalStrain = 0;
  const maxHeartRate = estimateMaxHeartRate(restingHeartRate);
  const heartRateReserve = maxHeartRate - restingHeartRate;

  // Calculate strain for each activity session
  rawCalories.forEach((session, index) => {
    const durationHours =
      (new Date(session.endDate).getTime() -
        new Date(session.startDate).getTime()) /
      (1000 * 60 * 60);

    if (durationHours > 0) {
      const caloriesPerHour = session.quantity / durationHours;
      const activityMultiplier = getActivityMultiplier(caloriesPerHour);

      // Estimate heart rate intensity based on calories and duration
      const estimatedIntensity = estimateIntensityFromCalories(
        caloriesPerHour,
        durationHours
      );

      // Calculate TRIMP-like score
      const sessionStrain = calculateSessionStrain(
        durationHours,
        estimatedIntensity,
        activityMultiplier,
        heartRateReserve
      );

      totalStrain += sessionStrain;
    }
  });

  // Apply individual fitness level adjustment based on HRV
  const fitnessAdjustment = calculateFitnessAdjustment(hrvValues);
  totalStrain *= fitnessAdjustment;

  // Normalize to 0-100 scale
  // Typical daily strain ranges: 0-20 (rest), 20-40 (light), 40-60 (moderate), 60-80 (high), 80-100 (very high)
  const normalizedStrain = Math.min(100, totalStrain * 15); // Multiply by 15 for better scaling

  console.log("📈 Final strain calculation:", {
    totalStrain: totalStrain.toFixed(2),
    fitnessAdjustment: fitnessAdjustment.toFixed(2),
    normalizedStrain: normalizedStrain.toFixed(1),
  });

  return parseFloat(normalizedStrain.toFixed(1));
};

// Fallback simple calculation
const calculateSimpleStrainScore = (activeCalories: number): number => {
  const strain = (activeCalories / 1000) * 100;
  return Math.min(100, parseFloat(strain.toFixed(1)));
};

// Estimate max heart rate using improved formula
const estimateMaxHeartRate = (restingHR: number): number => {
  // Using Tanaka formula: 208 - (0.7 × age)
  // Since we don't have age, estimate from resting HR
  // Typical range: fit person (40-60 bpm) vs average (60-80 bpm)
  const estimatedAge =
    restingHR < 50 ? 25 : restingHR < 60 ? 35 : restingHR < 70 ? 45 : 55;
  return Math.round(208 - 0.7 * estimatedAge);
};

// Get activity multiplier based on calorie burn rate
const getActivityMultiplier = (caloriesPerHour: number): number => {
  if (caloriesPerHour < 100) return ACTIVITY_MULTIPLIERS.LOW_INTENSITY;
  if (caloriesPerHour < 300) return ACTIVITY_MULTIPLIERS.MODERATE;
  if (caloriesPerHour < 600) return ACTIVITY_MULTIPLIERS.HIGH_INTENSITY;
  return ACTIVITY_MULTIPLIERS.VERY_HIGH;
};

// Estimate intensity from calories and duration
const estimateIntensityFromCalories = (
  caloriesPerHour: number,
  durationHours: number
): number => {
  // Base intensity on calorie burn rate
  let baseIntensity = Math.min(0.9, caloriesPerHour / 800); // Max 800 cal/hour = 90% intensity

  // Adjust for duration (longer sessions tend to be lower intensity)
  if (durationHours > 2) baseIntensity *= 0.8;
  else if (durationHours > 1) baseIntensity *= 0.9;
  else if (durationHours < 0.5) baseIntensity *= 1.1; // Short, intense sessions

  return Math.max(0.5, Math.min(0.95, baseIntensity)); // Keep within reasonable bounds
};

// Calculate strain for individual session using TRIMP-like formula
const calculateSessionStrain = (
  durationHours: number,
  intensity: number,
  activityMultiplier: number,
  heartRateReserve: number
): number => {
  // Modified TRIMP calculation
  const durationMinutes = durationHours * 60;
  const intensityFactor = Math.exp(1.92 * intensity); // Exponential weighting for higher intensities

  const sessionStrain =
    durationMinutes * intensity * intensityFactor * activityMultiplier * 0.01;

  return sessionStrain;
};

// Adjust strain based on individual fitness level (using HRV as proxy)
const calculateFitnessAdjustment = (hrvValues: number[]): number => {
  if (hrvValues.length === 0) return 1.0;

  const avgHRV =
    hrvValues.reduce((sum, val) => sum + val, 0) / hrvValues.length;

  // Higher HRV typically indicates better fitness/recovery
  // Adjust strain perception: fitter individuals handle strain better
  if (avgHRV > 45) return 0.85; // Very fit
  if (avgHRV > 35) return 0.9; // Fit
  if (avgHRV > 25) return 1.0; // Average
  if (avgHRV > 15) return 1.1; // Below average
  return 1.2; // Poor fitness
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
function calculateSleepEfficiency(
  rawSleepSamples: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[]
): number {
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

interface SecondaryMetrics {
  sleepEfficiency: number;
  trainingLoad: number;
  dailySleepDurations: number[];
  sleepStressCorrelation: number;
}

function calculateSecondary(hd: HealthData): SecondaryMetrics {
  const activities: ActivitySample[] = hdToActivitySamples(hd);

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

  let sleepStressCorrelation = 0;
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

    sleepStressCorrelation = pearsonCorrelation(
      dailySleepDurations,
      dailyStressApproximation
    );
  } else {
    console.log("Sleep-Stress Correlation: Not enough data for correlation.");
  }

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
    workouts: [],
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
