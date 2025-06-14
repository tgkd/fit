import {
  getDateOfBirth,
  getMostRecentQuantitySample,
  HKCategorySample,
  HKCategoryTypeIdentifier,
  HKCategoryValueSleepAnalysis,
  HKQuantityTypeIdentifier,
  HKStatisticsOptions,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
} from "@kingstinct/react-native-healthkit";

export const SLEEP_PERFORMANCE_GOAL_HOURS = 8;
export const SLEEP_CONSISTENCY_MAX_STD_DEV_HOURS = 2.5;
export const STRAIN_NORMALIZATION_FACTOR = 12; // Adjusts the final strain score to a 0-100 scale

export const ACTIVITY_MULTIPLIERS = {
  LOW_INTENSITY: 0.9, // < 4 METs
  MODERATE_INTENSITY: 1.1, // 4-7 METs
  HIGH_INTENSITY: 1.4, // > 7 METs
};

export const ACTUAL_SLEEP_VALUES = [
  HKCategoryValueSleepAnalysis.asleepUnspecified,
  HKCategoryValueSleepAnalysis.asleepDeep,
  HKCategoryValueSleepAnalysis.asleepCore,
  HKCategoryValueSleepAnalysis.asleepREM,
];

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

export interface UserStats {
  moveKcal: number;
  exerciseMins: number;
  standHours: number;
  recoveryScore: number;
  strainScore: number;
}

/** Main aggregator */
export async function getUserStats(): Promise<UserStats> {
  const now = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  // Move (active calories today) - using same pattern as HealthDataContext
  const caloriesSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.activeEnergyBurned,
    { from: startOfToday, to: now }
  );
  const moveKcal = caloriesSamples.reduce(
    (sum: number, record) => sum + record.quantity,
    0
  );

  // Exercise (workouts ≥3 METs in last 24h) - using queryWorkoutSamples
  const workouts = await queryWorkoutSamples({ from: oneDayAgo, to: now });
  const exerciseMins = calculateExerciseMins(
    workouts.map((w) => ({
      start: new Date(w.startDate),
      end: new Date(w.endDate),
      // Simplified METs estimation - most workouts are at least moderate intensity
      mets:
        w.totalEnergyBurned && typeof w.totalEnergyBurned.quantity === "number"
          ? Math.max(
              3,
              w.totalEnergyBurned.quantity /
                ((new Date(w.endDate).getTime() -
                  new Date(w.startDate).getTime()) /
                  (1000 * 60 * 60)) /
                70
            )
          : 4, // Default to moderate intensity
    }))
  );

  // Stand (hourly stepCounts → 24 values) - simplified approach using step statistics
  const stepsStat = await queryStatisticsForQuantity(
    HKQuantityTypeIdentifier.stepCount,
    [HKStatisticsOptions.cumulativeSum],
    startOfToday,
    now
  );
  // For simplicity, estimate stand hours based on total steps (rough approximation)
  const totalSteps = stepsStat?.sumQuantity?.quantity || 0;
  const standHours = Math.min(12, Math.floor(totalSteps / 250)); // Rough estimate: 250 steps per standing hour

  // HRV series (overnight → last 7 days avg) - using same pattern as HealthDataContext
  const hrvSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
    { from: oneWeekAgo, to: now }
  );
  const hrvValues = hrvSamples.map((s) => s.quantity);

  // Resting HR (most recent) - using same pattern as HealthDataContext
  const rhrSample = await getMostRecentQuantitySample(
    HKQuantityTypeIdentifier.restingHeartRate,
    "count/min"
  );
  const restingHR = rhrSample?.quantity ?? 0;

  // Respiratory rate (today avg) - using same pattern as HealthDataContext
  const respStats = await queryStatisticsForQuantity(
    HKQuantityTypeIdentifier.respiratoryRate,
    [HKStatisticsOptions.discreteAverage],
    startOfToday,
    now
  );
  const respRate = respStats?.averageQuantity?.quantity ?? 0;

  const priorStrain = 50; // placeholder or fetch historic
  const sleepSamples = await queryCategorySamples(
    HKCategoryTypeIdentifier.sleepAnalysis,
    { from: oneDayAgo, to: now }
  );

  const sleepEff = calculateSleepEfficiency(sleepSamples);

  const recoveryScore = calculateRecoveryScore(
    hrvValues,
    restingHR,
    respRate,
    sleepEff,
    priorStrain
  );

  const hrSamplesRaw = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRate,
    { from: oneDayAgo, to: now }
  );
  const hrSamples: HeartRateSample[] = hrSamplesRaw.map((h) => ({
    timestamp: new Date(h.startDate),
    value: h.quantity,
  }));

  // Estimate HRmax = 220 − age
  const dob = await getDateOfBirth();
  const age = dob ? new Date().getFullYear() - dob.getFullYear() : 30;
  const hrMax = 220 - age;

  const strainScore = calculateStrainScore(hrSamples, hrMax);

  return {
    moveKcal,
    exerciseMins,
    standHours,
    recoveryScore,
    strainScore,
  };
}

// src/analytics.ts
export interface SleepSample {
  inBedStart: Date;
  inBedEnd: Date;
  asleepStart: Date;
  asleepEnd: Date;
}

export interface ActivitySample {
  start: Date;
  end: Date;
  mets: number;
}

export interface HeartRateSample {
  timestamp: Date;
  value: number; // bpm
}

/////////////////////////////////////////////
// Apple Rings Calculations
/////////////////////////////////////////////

/** 1. Move: total active calories (kcal) */
export function calculateMove(activeEnergyKcal: number): number {
  return parseFloat(activeEnergyKcal.toFixed(0));
}

/** 2. Exercise: minutes ≥ 3 METs */
export function calculateExerciseMins(activities: ActivitySample[]): number {
  let mins = 0;
  activities.forEach((a) => {
    const durationMin = (a.end.getTime() - a.start.getTime()) / 1000 / 60;
    if (a.mets >= 3) mins += durationMin;
  });
  return parseFloat(mins.toFixed(0));
}

/** 3. Stand: count of hours with ≥1 step */
export function calculateStandHours(hourlyStepCounts: number[]): number {
  return hourlyStepCounts.filter((count) => count >= 1).length;
}

/** Normalize value v between [min, max] → 0–100 */
function normalize(v: number, min: number, max: number): number {
  if (max === min) return 100;
  return ((v - min) / (max - min)) * 100;
}

/**
 * Recovery Score: weighted average of
 * HRV, Resting HR (inverse), Resp Rate (inverse),
 * Sleep Efficiency, Prior Strain (inverse)
 */
export function calculateRecoveryScore(
  hrv: number[], // ms SDNN over last night
  restingHR: number, // bpm
  respRate: number, // breaths/min
  sleepEff: number, // %
  priorStrain: number // 0–100
): number {
  const latestHRV = hrv[hrv.length - 1] || hrv[0] || 0;
  const normHRV = normalize(latestHRV, Math.min(...hrv), Math.max(...hrv));
  const normRHR = 100 - normalize(restingHR, 40, 100); // lower HR better
  const normResp = 100 - normalize(respRate, 8, 20); // lower RR better
  const normSleep = sleepEff; // 0–100
  const normStrainInv = 100 - priorStrain; // high strain reduces readiness

  // weights: HRV 40%, RHR 20%, Resp 10%, Sleep 20%, Strain 10%
  const score =
    normHRV * 0.4 +
    normRHR * 0.2 +
    normResp * 0.1 +
    normSleep * 0.2 +
    normStrainInv * 0.1;

  return parseFloat(score.toFixed(1));
}

/**
 * Strain Score: sum of (minutes_in_zone × zone_index) ÷ 60
 * Zones based on %HRmax
 */
export function calculateStrainScore(
  hrSamples: HeartRateSample[],
  hrMax: number
): number {
  let weightedMinSum = 0;
  for (let i = 1; i < hrSamples.length; i++) {
    const prev = hrSamples[i - 1];
    const curr = hrSamples[i];
    const minutes =
      (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000 / 60;
    const pct = prev.value / hrMax;
    let zone = 0;
    if (pct < 0.6) zone = 1;
    else if (pct < 0.7) zone = 2;
    else if (pct < 0.8) zone = 3;
    else if (pct < 0.9) zone = 4;
    else zone = 5;
    weightedMinSum += zone * minutes;
  }
  return parseFloat((weightedMinSum / 60).toFixed(1)); // roughly 0–21
}
