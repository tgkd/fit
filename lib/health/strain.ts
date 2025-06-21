import {
  QuantitySample,
  WorkoutActivityType,
  WorkoutSample,
} from "@kingstinct/react-native-healthkit";
import {
  getDateOfBirthAsync,
  getMostRecentQuantitySample,
  queryQuantitySamples,
  queryWorkoutSamples,
} from "@kingstinct/react-native-healthkit/lib/commonjs/index.ios.js";
import { endOfDay, startOfDay } from "date-fns";

import { SystemDefaults, UserProfile } from "./types";

export const MAX_STRAIN = 21;

export async function calculateDayStrain(
  date: Date,
  defaults: SystemDefaults,
  userProfile: UserProfile
): Promise<number> {
  // Configurable constants - all required, no fallbacks
  const DEFAULT_RESTING_HR = defaults.RESTING_HEART_RATE;
  const DEFAULT_MAX_HR = defaults.MAX_HEART_RATE;
  const SCALE_FACTOR = defaults.STRAIN_LOG_SCALE_FACTOR;
  const ZONE_WEIGHTS = defaults.HEART_RATE_ZONE_WEIGHTS;
  const MUSCLE_PTS_PER_KCAL = defaults.MUSCLE_POINTS_PER_KCAL;
  const MUSCLE_PTS_PER_MIN = defaults.MUSCLE_POINTS_PER_MINUTE_DURATION;
  const HRR_ZONE_BOUNDS = defaults.HRR_ZONE_LOWER_BOUND_PERCENTAGES;
  const MIN_HRR_ADJUST = defaults.MIN_HRR_FALLBACK_ADJUSTMENT;
  const ACTIVITY_THRESHOLD_PCT = defaults.ACTIVITY_THRESHOLD_PERCENTAGE;

  // 1. Define the time range for the day
  const dateFrom = startOfDay(date);
  const dateTo = endOfDay(date);

  // 2. Query heart rate samples for the day
  let heartRateSamples: QuantitySample[] = [];
  try {
    heartRateSamples = (await queryQuantitySamples(
      "HKQuantityTypeIdentifierHeartRate",
      {
        filter: { startDate: dateFrom, endDate: dateTo },
        unit: "count/min",
      }
    )) as QuantitySample[];
  } catch (error) {
    console.warn("Could not query heart rate samples:", error);
  }

  // 3. Determine user’s resting and max HR for zone calculations
  let restingHR = DEFAULT_RESTING_HR;
  try {
    const restingSample = await getMostRecentQuantitySample(
      "HKQuantityTypeIdentifierRestingHeartRate",
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
    const birthDateISO = await getDateOfBirthAsync();
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

  // Use a more realistic max HR - prefer observed data when available
  // If observed max is significantly lower than theoretical, use a conservative estimate
  if (observedMaxHRInSamples > 0) {
    // If observed max is much lower than theoretical, it suggests lighter activity
    // Use observed max + reasonable buffer instead of theoretical max
    const theoreticalMax = maxHR;
    const observedWithBuffer = observedMaxHRInSamples + 20; // Add 20 BPM buffer

    if (observedMaxHRInSamples < theoreticalMax * 0.7) {
      // If observed is less than 70% of theoretical, use observed + buffer
      maxHR = Math.min(theoreticalMax, observedWithBuffer);
    } else if (observedMaxHRInSamples > maxHR) {
      maxHR = observedMaxHRInSamples;
    }
  }

  if (maxHR <= restingHR) {
    maxHR = restingHR + MIN_HRR_ADJUST;
  }

  // 4. Define heart rate zone thresholds using Heart Rate Reserve (HRR) method
  const HRR = Math.max(1, maxHR - restingHR);
  let zonesThresholds = [
    restingHR + HRR_ZONE_BOUNDS[0] * HRR,
    restingHR + HRR_ZONE_BOUNDS[1] * HRR,
    restingHR + HRR_ZONE_BOUNDS[2] * HRR,
    restingHR + HRR_ZONE_BOUNDS[3] * HRR,
    restingHR + HRR_ZONE_BOUNDS[4] * HRR,
  ];

  // Adaptive zone adjustment: If most HR data is below Zone 1, adjust zones downward
  if (heartRateSamples.length > 0 && observedMaxHRInSamples > 0) {
    const hrValues = heartRateSamples.map(s => s.quantity).filter(q => typeof q === 'number') as number[];
    const avgHR = hrValues.reduce((sum, hr) => sum + hr, 0) / hrValues.length;

    // If average HR is below Zone 1 threshold, create more realistic zones
    if (avgHR < zonesThresholds[0]) {
      const adaptiveMaxHR = Math.max(observedMaxHRInSamples + 10, avgHR + 30);
      const adaptiveHRR = Math.max(1, adaptiveMaxHR - restingHR);

      zonesThresholds = [
        restingHR + HRR_ZONE_BOUNDS[0] * adaptiveHRR,
        restingHR + HRR_ZONE_BOUNDS[1] * adaptiveHRR,
        restingHR + HRR_ZONE_BOUNDS[2] * adaptiveHRR,
        restingHR + HRR_ZONE_BOUNDS[3] * adaptiveHRR,
        restingHR + HRR_ZONE_BOUNDS[4] * adaptiveHRR,
      ];
    }
  }

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
    const zoneTime = zoneMinutes[z] || 0;
    const zoneWeight = ZONE_WEIGHTS[z];
    const zonePoints = zoneTime * zoneWeight;
    cardioPoints += zonePoints;
  }

  // 7. Query strength-type workouts for the day
  const strengthWorkoutTypes = [
    WorkoutActivityType.functionalStrengthTraining,
    WorkoutActivityType.traditionalStrengthTraining,
    WorkoutActivityType.crossTraining,
  ];
  let muscleWorkouts: WorkoutSample[] = [];

  try {
    const workoutsToday = await queryWorkoutSamples({
      filter: {
        startDate: dateFrom,
        endDate: dateTo,
      },
      energyUnit: "kcal",
      distanceUnit: "m",
      ascending: false,
      limit: 100,
    });

    muscleWorkouts = (workoutsToday as WorkoutSample[]).filter((w) =>
      strengthWorkoutTypes.includes(
        w.workoutActivityType as WorkoutActivityType
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
      const weightMultiplier = MUSCLE_PTS_PER_KCAL * 2;
      workoutMusclePoints =
        workout.metadata.TotalWeightLifted * weightMultiplier;
    }
    // Priority 2: Energy burned with muscle multiplier
    else if (workout.totalEnergyBurned) {
      const energy =
        typeof workout.totalEnergyBurned === "object"
          ? workout.totalEnergyBurned.quantity
          : workout.totalEnergyBurned;
      const energyMultiplier = MUSCLE_PTS_PER_KCAL * 2;
      workoutMusclePoints = energy * energyMultiplier;
    }
    // Priority 3: Duration-based with intensity factor
    else if (typeof workout.duration === "number" && workout.duration > 0) {
      const durationMinutes = workout.duration / 60;
      const durationMultiplier = MUSCLE_PTS_PER_MIN * 1.5;
      workoutMusclePoints = durationMinutes * durationMultiplier;
    }

    musclePoints += workoutMusclePoints;
  }

  const totalLoad = cardioPoints + musclePoints;

  // Improved logarithmic scaling with better calibration
  const baseStrain = Math.log(Math.max(1, totalLoad + 1)) * 3.2;
  const exponentialComponent =
    MAX_STRAIN * (1 - Math.exp(-SCALE_FACTOR * totalLoad * 0.7));

  // Blend the two approaches for more realistic scaling
  let strainScore = Math.min(baseStrain, exponentialComponent);

  // 10. Validation and final adjustments
  strainScore = Math.max(0, Math.min(MAX_STRAIN, strainScore));
  strainScore = Math.round(strainScore * 10) / 10;

  return strainScore;
}

/**
 * Calculate strain score with personalized user parameters
 * This function provides a convenient way to calculate strain with user-specific defaults
 */
export async function calculatePersonalizedStrain(
  date: Date,
  defaults: SystemDefaults,
  userProfile: UserProfile
): Promise<number> {
  // Determine user-specific defaults based on fitness level and personal data
  const getFitnessDefaults = (level: string) => {
    switch (level) {
      case "elite":
        return {
          STRAIN_LOG_SCALE_FACTOR: 0.006,
          HEART_RATE_ZONE_WEIGHTS: [1, 2, 4, 7, 10],
          ACTIVITY_THRESHOLD_PERCENTAGE: 0.08,
          MUSCLE_POINTS_PER_KCAL: 0.04,
          MUSCLE_POINTS_PER_MINUTE_DURATION: 0.4,
        };
      case "advanced":
        return {
          STRAIN_LOG_SCALE_FACTOR: 0.007,
          HEART_RATE_ZONE_WEIGHTS: [1, 2, 4, 6, 9],
          ACTIVITY_THRESHOLD_PERCENTAGE: 0.09,
          MUSCLE_POINTS_PER_KCAL: 0.035,
          MUSCLE_POINTS_PER_MINUTE_DURATION: 0.35,
        };
      case "intermediate":
        return {
          STRAIN_LOG_SCALE_FACTOR: 0.015, // Increased for better scaling
          HEART_RATE_ZONE_WEIGHTS: [1, 2, 4, 6, 8],
          ACTIVITY_THRESHOLD_PERCENTAGE: 0.1,
          MUSCLE_POINTS_PER_KCAL: 0.05, // Increased muscle point value
          MUSCLE_POINTS_PER_MINUTE_DURATION: 0.4, // Increased duration value
        };
      case "beginner":
      default:
        return {
          STRAIN_LOG_SCALE_FACTOR: 0.009,
          HEART_RATE_ZONE_WEIGHTS: [1, 2, 3, 5, 7],
          ACTIVITY_THRESHOLD_PERCENTAGE: 0.12,
          MUSCLE_POINTS_PER_KCAL: 0.025,
          MUSCLE_POINTS_PER_MINUTE_DURATION: 0.25,
        };
    }
  };

  // Calculate max HR if not provided
  let maxHR = userProfile.maxHeartRate;
  if (!maxHR && userProfile.age) {
    // Use configurable formula for max HR calculation
    const formula = userProfile.maxHrFormula;

    if (formula === "tanaka") {
      // Tanaka formula: 208 - (0.7 × age) - more accurate than 220-age
      const coefficient = userProfile.maxHrAgeCoefficient;
      const constant = userProfile.maxHrConstant;
      maxHR = Math.round(constant - coefficient * userProfile.age);
    } else {
      // Classic formula: 220 - age
      const coefficient = userProfile.maxHrAgeCoefficient;
      const constant = userProfile.maxHrConstant;
      maxHR = Math.round(constant - coefficient * userProfile.age);
    }
  }

  const fitnessDefaults = getFitnessDefaults(userProfile.fitnessLevel);

  const strainDefaults: SystemDefaults = {
    ...defaults, // Use all existing defaults
    RESTING_HEART_RATE: userProfile.restingHeartRate,
    MAX_HEART_RATE: maxHR,
    ...fitnessDefaults,
  };

  return calculateDayStrain(date, strainDefaults, userProfile);
}

/**
 * Get strain metrics with enhanced user parameters
 * Returns both the strain score and breakdown for analysis
 */
export async function getStrainMetrics(
  date: Date,
  defaults: SystemDefaults,
  userProfile: UserProfile
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
  const strainScore = await calculatePersonalizedStrain(date, defaults, userProfile);

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
