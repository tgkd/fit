import {
  HKQuantitySample,
  HKQuantityTypeIdentifier,
  HKWorkout,
  HKWorkoutActivityType,
  UnitOfEnergy,
  getDateOfBirth,
  getMostRecentQuantitySample,
  queryQuantitySamples,
  queryWorkoutSamples,
} from "@kingstinct/react-native-healthkit";
import { endOfDay, startOfDay } from "date-fns";

import { UserParams } from "./types";

export const MAX_STRAIN = 21;

interface StrainCalculationDefaults {
  RESTING_HEART_RATE?: number;
  MAX_HEART_RATE?: number;
  STRAIN_SCALE_FACTOR?: number;
  HEART_RATE_ZONE_WEIGHTS?: number[];
  MUSCLE_POINTS_PER_KCAL?: number;
  MUSCLE_POINTS_PER_MINUTE_DURATION?: number;
  HRR_ZONE_LOWER_BOUND_PERCENTAGES?: number[];
  MIN_HRR_FALLBACK_ADJUSTMENT?: number;
  ACTIVITY_THRESHOLD_PERCENTAGE?: number;
}

/**
 * Calculate the "Day Strain" score (0–21) for a given day using HealthKit data.
 * Combines cardiovascular load (from heart rate zones) and muscular load (from strength workouts).
 */
export async function calculateDayStrain(
  date: Date,
  defaults?: StrainCalculationDefaults,
  userParams?: UserParams
): Promise<number> {
  // Configurable constants with fallbacks
  const DEFAULT_RESTING_HR = defaults?.RESTING_HEART_RATE ?? 60;
  const DEFAULT_MAX_HR = defaults?.MAX_HEART_RATE ?? 190;
  const SCALE_FACTOR = defaults?.STRAIN_SCALE_FACTOR ?? 0.01;
  const ZONE_WEIGHTS = defaults?.HEART_RATE_ZONE_WEIGHTS ?? [1, 2, 4, 6, 8];
  const MUSCLE_PTS_PER_KCAL = defaults?.MUSCLE_POINTS_PER_KCAL ?? 0.05;
  const MUSCLE_PTS_PER_MIN = defaults?.MUSCLE_POINTS_PER_MINUTE_DURATION ?? 0.5;
  const HRR_ZONE_BOUNDS = defaults?.HRR_ZONE_LOWER_BOUND_PERCENTAGES ?? [
    0.6, 0.7, 0.8, 0.85, 0.95,
  ];
  const MIN_HRR_ADJUST = defaults?.MIN_HRR_FALLBACK_ADJUSTMENT ?? 30;
  const ACTIVITY_THRESHOLD_PCT = defaults?.ACTIVITY_THRESHOLD_PERCENTAGE ?? 0.1;

  // 1. Define the time range for the day
  const dateFrom = startOfDay(date);
  const dateTo = endOfDay(date);

  // 2. Query heart rate samples for the day
  let heartRateSamples: HKQuantitySample[] = [];
  try {
    heartRateSamples = (await queryQuantitySamples(
      HKQuantityTypeIdentifier.heartRate,
      {
        unit: "count/min",
        from: dateFrom,
        to: dateTo,
      }
    )) as HKQuantitySample[];
  } catch (error) {
    console.warn("Could not query heart rate samples:", error);
  }

  // 3. Determine user’s resting and max HR for zone calculations
  let restingHR = DEFAULT_RESTING_HR;
  try {
    const restingSample = await getMostRecentQuantitySample(
      HKQuantityTypeIdentifier.restingHeartRate,
      "count/min"
    );
    if (
      restingSample &&
      typeof restingSample.quantity === "number" &&
      restingSample.quantity > 0
    ) {
      restingHR = restingSample.quantity;
    }
  } catch (error) {
    console.warn("Could not fetch resting heart rate, using default:", error);
  }

  let maxHR = DEFAULT_MAX_HR;
  try {
    const birthDateISO = await getDateOfBirth();
    if (birthDateISO) {
      const birthDate = new Date(birthDateISO);
      if (!isNaN(birthDate.getTime())) {
        const currentYear = new Date().getFullYear();
        const birthYear = birthDate.getFullYear();
        const age = currentYear - birthYear;
        if (age > 0 && age < 120) {
          maxHR = 220 - age;
        }
      }
    }
  } catch (error) {
    console.warn(
      "Could not fetch date of birth for max HR calculation:",
      error
    );
  }

  let observedMaxHRInSamples = 0;
  heartRateSamples.forEach((sample) => {
    if (
      typeof sample.quantity === "number" &&
      sample.quantity > observedMaxHRInSamples
    ) {
      observedMaxHRInSamples = sample.quantity;
    }
  });
  if (observedMaxHRInSamples > maxHR) {
    maxHR = observedMaxHRInSamples;
  }
  if (maxHR <= restingHR) {
    maxHR = restingHR + MIN_HRR_ADJUST;
  }

  // 4. Define heart rate zone thresholds using Heart Rate Reserve (HRR) method
  const HRR = Math.max(1, maxHR - restingHR);
  const zonesThresholds = [
    restingHR + HRR_ZONE_BOUNDS[0] * HRR,
    restingHR + HRR_ZONE_BOUNDS[1] * HRR,
    restingHR + HRR_ZONE_BOUNDS[2] * HRR,
    restingHR + HRR_ZONE_BOUNDS[3] * HRR,
    restingHR + HRR_ZONE_BOUNDS[4] * HRR,
  ];

  // 5. Calculate time in each zone using continuous zone accumulation
  const activityThreshold = restingHR + HRR * ACTIVITY_THRESHOLD_PCT;
  let zoneMinutes = [0, 0, 0, 0, 0];

  if (heartRateSamples.length > 0) {
    // Process all samples above activity threshold continuously
    const activeSamples = heartRateSamples.filter(
      (sample) =>
        typeof sample.quantity === "number" &&
        sample.quantity > activityThreshold
    );

    console.log(
      `Processing ${
        activeSamples.length
      } samples above ${activityThreshold.toFixed(0)} BPM`
    );

    // Calculate duration for each sample
    activeSamples.forEach((sample) => {
      const hr = typeof sample.quantity === "number" ? sample.quantity : 0;

      // Determine sample duration (Apple Watch typically records every 1-5 minutes during activity)
      const startTime = new Date(sample.startDate);
      const endTime = new Date(sample.endDate);
      const durationMinutes = Math.max(
        1,
        (endTime.getTime() - startTime.getTime()) / (1000 * 60)
      );

      // Classify into zone based on HR thresholds
      let zoneIdx = -1;
      if (hr >= zonesThresholds[4]) zoneIdx = 4;
      else if (hr >= zonesThresholds[3]) zoneIdx = 3;
      else if (hr >= zonesThresholds[2]) zoneIdx = 2;
      else if (hr >= zonesThresholds[1]) zoneIdx = 1;
      else if (hr >= zonesThresholds[0]) zoneIdx = 0;

      if (zoneIdx >= 0) {
        zoneMinutes[zoneIdx] += durationMinutes;
      }
    });
  }

  // 6. Compute cardiovascular strain points
  let cardioPoints = 0;
  for (let z = 0; z < ZONE_WEIGHTS.length; z++) {
    // Ensure zoneMinutes has a value for this index, or default to 0
    cardioPoints += (zoneMinutes[z] || 0) * ZONE_WEIGHTS[z];
  }

  // 7. Query strength-type workouts for the day
  const strengthWorkoutTypes = [
    HKWorkoutActivityType.functionalStrengthTraining,
    HKWorkoutActivityType.traditionalStrengthTraining,
    HKWorkoutActivityType.crossTraining,
  ];
  let muscleWorkouts: HKWorkout[] = [];
  try {
    const workoutsToday = await queryWorkoutSamples({
      from: dateFrom,
      to: dateTo,
      energyUnit: UnitOfEnergy.Kilocalories,
    });
    muscleWorkouts = workoutsToday.filter((w) =>
      strengthWorkoutTypes.includes(
        w.workoutActivityType as HKWorkoutActivityType
      )
    );
  } catch (error) {
    console.warn("Could not query workouts:", error);
  }

  // 8. Enhanced muscular load calculation
  let musclePoints = 0;
  for (const workout of muscleWorkouts) {
    let workoutMusclePoints = 0;

    // Priority 1: Total weight lifted (if available)
    if (
      workout.metadata?.TotalWeightLifted &&
      typeof workout.metadata.TotalWeightLifted === "number"
    ) {
      // Use user parameter instead of hardcoded value
      const weightMultiplier = MUSCLE_PTS_PER_KCAL * 2;
      workoutMusclePoints = workout.metadata.TotalWeightLifted * weightMultiplier;
    }
    // Priority 2: Energy burned with muscle multiplier
    else if (workout.totalEnergyBurned) {
      const energy =
        typeof workout.totalEnergyBurned === "object"
          ? workout.totalEnergyBurned.quantity
          : workout.totalEnergyBurned;
      // Higher multiplier for strength training calories vs cardio
      workoutMusclePoints = energy * (MUSCLE_PTS_PER_KCAL * 2);
    }
    // Priority 3: Duration-based with intensity factor
    else if (typeof workout.duration === "number" && workout.duration > 0) {
      const durationMinutes = workout.duration / 60;
      // Base points plus intensity bonus for strength training
      workoutMusclePoints = durationMinutes * (MUSCLE_PTS_PER_MIN * 1.5);
    }

    musclePoints += workoutMusclePoints;
    console.log(
      `Strength workout: ${workoutMusclePoints.toFixed(1)} muscle points (duration: ${workout.duration ? (workout.duration / 60).toFixed(0) : 'N/A'} min)`
    );
  }

  const totalLoad = cardioPoints + musclePoints;

  // Improved logarithmic scaling with better calibration
  // Use a combination approach: log for base scaling + exponential for diminishing returns
  const baseStrain = Math.log(Math.max(1, totalLoad + 1)) * 3.2;
  const exponentialComponent = MAX_STRAIN * (1 - Math.exp(-SCALE_FACTOR * totalLoad * 0.7));

  // Blend the two approaches for more realistic scaling
  let strainScore = Math.min(baseStrain, exponentialComponent);

  // Enhanced debug logging with zone analysis
  console.log(`🏋️ Strain calculation for ${date.toDateString()}:`, {
    heartRateSamples: heartRateSamples.length,
    zoneMinutes,
    zoneDistribution: {
      zone1: `${zoneMinutes[0]} min (${ZONE_WEIGHTS[0]}x)`,
      zone2: `${zoneMinutes[1]} min (${ZONE_WEIGHTS[1]}x)`,
      zone3: `${zoneMinutes[2]} min (${ZONE_WEIGHTS[2]}x)`,
      zone4: `${zoneMinutes[3]} min (${ZONE_WEIGHTS[3]}x)`,
      zone5: `${zoneMinutes[4]} min (${ZONE_WEIGHTS[4]}x)`,
    },
    cardioPoints,
    muscleWorkouts: muscleWorkouts.length,
    musclePoints,
    totalLoad,
    baseStrain: baseStrain.toFixed(1),
    exponentialStrain: exponentialComponent.toFixed(1),
    finalStrain: strainScore.toFixed(1),
    restingHR,
    maxHR,
    zonesThresholds: zonesThresholds.map(z => Math.round(z)),
    scalingMethod: "hybrid",
  });

  // 10. Validation and final adjustments
  strainScore = Math.max(0, Math.min(MAX_STRAIN, strainScore));
  strainScore = Math.round(strainScore * 10) / 10;

  // Add calibration guidance with configurable thresholds
  if (totalLoad > 0) {
    let expectedRange = "Unknown";
    const highIntensityMinutes = zoneMinutes[3] + zoneMinutes[4];
    const moderateIntensityMinutes = zoneMinutes[2];
    const totalActiveMinutes = zoneMinutes.reduce((sum, minutes) => sum + minutes, 0);

    // Use configurable guidance thresholds
    const guidanceThresholds = userParams?.strainGuidanceThresholds || {
      highIntensityMinutes: 20,
      moderateIntensityMinutes: 30,
      totalActiveMinutes: 60,
      lightActivityThreshold: 30,
    };

    if (highIntensityMinutes > guidanceThresholds.highIntensityMinutes ||
        (highIntensityMinutes > 10 && moderateIntensityMinutes > guidanceThresholds.moderateIntensityMinutes)) {
      expectedRange = "14-17 (High)";
    } else if (moderateIntensityMinutes > 20 || totalActiveMinutes > guidanceThresholds.totalActiveMinutes) {
      expectedRange = "10-13 (Moderate)";
    } else if (totalActiveMinutes > guidanceThresholds.lightActivityThreshold) {
      expectedRange = "6-9 (Light-Moderate)";
    } else {
      expectedRange = "0-6 (Light)";
    }

    console.log(
      `Expected strain range: ${expectedRange}, Actual: ${strainScore.toFixed(1)}`,
      {
        totalActiveMinutes,
        highIntensityMinutes,
        moderateIntensityMinutes,
        analysis: totalActiveMinutes > 60 ? "Long duration activity" :
                  highIntensityMinutes > 0 ? "Some high intensity" : "Low-moderate intensity"
      }
    );
  }

  return strainScore;
}

/**
 * Calculate strain score with personalized user parameters
 * This function provides a convenient way to calculate strain with user-specific defaults
 */
export async function calculatePersonalizedStrain(
  date: Date,
  userParams?: UserParams
): Promise<number> {
  // Determine user-specific defaults based on fitness level and personal data
  const getFitnessDefaults = (level: string) => {
    switch (level) {
      case "elite":
        return {
          STRAIN_SCALE_FACTOR: 0.006,
          HEART_RATE_ZONE_WEIGHTS: [1, 2, 4, 7, 10],
          ACTIVITY_THRESHOLD_PERCENTAGE: 0.08,
          MUSCLE_POINTS_PER_KCAL: 0.04,
          MUSCLE_POINTS_PER_MINUTE_DURATION: 0.4,
        };
      case "advanced":
        return {
          STRAIN_SCALE_FACTOR: 0.007,
          HEART_RATE_ZONE_WEIGHTS: [1, 2, 4, 6, 9],
          ACTIVITY_THRESHOLD_PERCENTAGE: 0.09,
          MUSCLE_POINTS_PER_KCAL: 0.035,
          MUSCLE_POINTS_PER_MINUTE_DURATION: 0.35,
        };
      case "intermediate":
        return {
          STRAIN_SCALE_FACTOR: 0.008,
          HEART_RATE_ZONE_WEIGHTS: [1, 2, 4, 6, 8],
          ACTIVITY_THRESHOLD_PERCENTAGE: 0.1,
          MUSCLE_POINTS_PER_KCAL: 0.03,
          MUSCLE_POINTS_PER_MINUTE_DURATION: 0.3,
        };
      case "beginner":
      default:
        return {
          STRAIN_SCALE_FACTOR: 0.009,
          HEART_RATE_ZONE_WEIGHTS: [1, 2, 3, 5, 7],
          ACTIVITY_THRESHOLD_PERCENTAGE: 0.12,
          MUSCLE_POINTS_PER_KCAL: 0.025,
          MUSCLE_POINTS_PER_MINUTE_DURATION: 0.25,
        };
    }
  };

  // Calculate max HR if not provided
  let maxHR = userParams?.maxHeartRate;
  if (!maxHR && userParams?.age) {
    // Use configurable formula for max HR calculation
    const formula = userParams?.maxHrFormula || 'tanaka';

    if (formula === 'tanaka') {
      // Tanaka formula: 208 - (0.7 × age) - more accurate than 220-age
      const coefficient = userParams?.maxHrAgeCoefficient || 0.7;
      const constant = userParams?.maxHrConstant || 208;
      maxHR = Math.round(constant - coefficient * userParams.age);
    } else {
      // Classic formula: 220 - age
      const coefficient = userParams?.maxHrAgeCoefficient || 1.0;
      const constant = userParams?.maxHrConstant || 220;
      maxHR = Math.round(constant - coefficient * userParams.age);
    }
  }

  const fitnessDefaults = getFitnessDefaults(
    userParams?.fitnessLevel || "intermediate"
  );

  const strainDefaults: StrainCalculationDefaults = {
    RESTING_HEART_RATE: userParams?.restingHeartRate,
    MAX_HEART_RATE: maxHR,
    ...fitnessDefaults,
  };

  return calculateDayStrain(date, strainDefaults, userParams);
}

/**
 * Get strain metrics with enhanced user parameters
 * Returns both the strain score and breakdown for analysis
 */
export async function getStrainMetrics(
  date: Date,
  userParams?: UserParams
): Promise<{
  strainScore: number;
  category: string;
  recommendation: string;
  breakdown?: {
    cardioLoad: number;
    muscleLoad: number;
    totalLoad: number;
  };
}> {
  const strainScore = await calculatePersonalizedStrain(date, userParams);

  // Categorize strain level
  let category: string;
  let recommendation: string;

  if (strainScore >= 18) {
    category = "All-Out";
    recommendation = "Maximum effort achieved. Prioritize recovery tomorrow.";
  } else if (strainScore >= 14) {
    category = "High";
    recommendation = "Intense training load. Good for fitness gains.";
  } else if (strainScore >= 10) {
    category = "Moderate";
    recommendation = "Solid training day. Sustainable effort level.";
  } else if (strainScore >= 6) {
    category = "Light-Moderate";
    recommendation = "Light activity. Room for more intensity if recovered.";
  } else {
    category = "Light";
    recommendation =
      "Minimal strain. Consider active recovery or light training.";
  }

  return {
    strainScore,
    category,
    recommendation,
  };
}
