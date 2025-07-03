import {
  getDateOfBirthAsync,
  getMostRecentQuantitySample,
  QuantitySample,
  queryQuantitySamples,
  queryWorkoutSamples,
  WorkoutActivityType,
  WorkoutSample,
} from "@kingstinct/react-native-healthkit";
import { endOfDay, startOfDay } from "date-fns";

import {
  DailyStrainData,
  DateRange,
  StrainPeriodPresets,
  StrainPeriodStats,
  SystemDefaults,
  UserProfile
} from "./types";

export const MAX_STRAIN = 21;

const strengthWorkoutTypes = [
  WorkoutActivityType.functionalStrengthTraining,
  WorkoutActivityType.traditionalStrengthTraining,
  WorkoutActivityType.crossTraining,
];

const cardioWorkoutTypes = [
  WorkoutActivityType.walking,
  WorkoutActivityType.running,
  WorkoutActivityType.cycling,
  WorkoutActivityType.swimming,
  WorkoutActivityType.hiking,
  WorkoutActivityType.elliptical,
  WorkoutActivityType.stairClimbing,
];

export async function calculateDayStrain(
  date: Date,
  defaults: SystemDefaults,
  userProfile: UserProfile
): Promise<number> {
  // Delegate to the core strain calculation function
  // This maintains backward compatibility while using the new centralized logic
  const result = await calculateStrainCore(date, defaults, userProfile);
  return result.strainScore;
}

/**
 * Internal function that performs the core strain calculation logic
 * This is the single source of truth for strain calculation
 */
async function calculateStrainCore(
  date: Date,
  defaults: SystemDefaults,
  userProfile: UserProfile,
  heartRateSamples?: QuantitySample[],
  muscleWorkouts?: WorkoutSample[],
  cardioWorkouts?: WorkoutSample[]
): Promise<{
  strainScore: number;
  breakdown: {
    cardioLoad: number;
    muscleLoad: number;
    cardioWorkoutPoints: number;
    totalLoad: number;
  };
}> {
  const {
    RESTING_HEART_RATE: DEFAULT_RESTING_HR,
    MAX_HEART_RATE: DEFAULT_MAX_HR,
    STRAIN_LOG_SCALE_FACTOR: SCALE_FACTOR,
    HEART_RATE_ZONE_WEIGHTS: ZONE_WEIGHTS,
    MUSCLE_POINTS_PER_KCAL: MUSCLE_PTS_PER_KCAL,
    MUSCLE_POINTS_PER_MINUTE_DURATION: MUSCLE_PTS_PER_MIN,
    HRR_ZONE_LOWER_BOUND_PERCENTAGES: HRR_ZONE_BOUNDS,
    MIN_HRR_FALLBACK_ADJUSTMENT: MIN_HRR_ADJUST,
    ACTIVITY_THRESHOLD_PERCENTAGE: ACTIVITY_THRESHOLD_PCT,
  } = defaults;

  // Ensure zone bounds are in decimal format (0.5, 0.6, etc.) not percentages (50, 60, etc.)
  const normalizedZoneBounds = HRR_ZONE_BOUNDS.map((bound) => {
    if (typeof bound !== 'number' || !isFinite(bound)) {
      console.warn(`Invalid zone bound type: ${bound}, using fallback`);
      return 0.5; // Fallback to moderate intensity
    }
    if (bound > 1 && bound <= 100) return bound / 100;
    if (bound <= 1 && bound >= 0) return bound;
    console.warn(`Invalid zone bound value: ${bound}, using fallback`);
    return 0.5; // Fallback to moderate intensity
  });

  // 1. Define the time range for the day
  const dateFrom = startOfDay(date);
  const dateTo = endOfDay(date);

  // 2. Get heart rate samples (if not provided)
  let hrSamples = heartRateSamples;
  if (!hrSamples) {
    try {
      hrSamples = (await queryQuantitySamples(
        "HKQuantityTypeIdentifierHeartRate",
        {
          filter: { startDate: dateFrom, endDate: dateTo },
          unit: "count/min",
        }
      )) as QuantitySample[];
    } catch (error) {
      console.warn("Could not query heart rate samples:", error);
      hrSamples = [];
    }
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
  hrSamples.forEach((sample) => {
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
    restingHR + normalizedZoneBounds[0] * HRR,
    restingHR + normalizedZoneBounds[1] * HRR,
    restingHR + normalizedZoneBounds[2] * HRR,
    restingHR + normalizedZoneBounds[3] * HRR,
    restingHR + normalizedZoneBounds[4] * HRR,
  ];

  // Adaptive zone adjustment: If most HR data is below Zone 1, adjust zones downward
  if (hrSamples.length > 0 && observedMaxHRInSamples > 0) {
    const hrValues = hrSamples
      .map((s) => s.quantity)
      .filter((q) => typeof q === "number") as number[];
    const avgHR = hrValues.reduce((sum, hr) => sum + hr, 0) / hrValues.length;

    // If average HR is below Zone 1 threshold, create more realistic zones
    if (avgHR < zonesThresholds[0]) {
      const adaptiveMaxHR = Math.max(observedMaxHRInSamples + 10, avgHR + 30);
      const adaptiveHRR = Math.max(1, adaptiveMaxHR - restingHR);

      zonesThresholds = [
        restingHR + normalizedZoneBounds[0] * adaptiveHRR,
        restingHR + normalizedZoneBounds[1] * adaptiveHRR,
        restingHR + normalizedZoneBounds[2] * adaptiveHRR,
        restingHR + normalizedZoneBounds[3] * adaptiveHRR,
        restingHR + normalizedZoneBounds[4] * adaptiveHRR,
      ];
    }
  }

  // 5. Calculate time in each zone using continuous zone accumulation
  const activityThreshold = restingHR + HRR * ACTIVITY_THRESHOLD_PCT;
  let zoneMinutes = [0, 0, 0, 0, 0];

  if (hrSamples.length > 0) {
    // Process all samples above activity threshold continuously
    const activeSamples = hrSamples.filter(
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
  let cardioLoad = 0;
  for (let z = 0; z < ZONE_WEIGHTS.length; z++) {
    const zoneTime = zoneMinutes[z] || 0;
    const zoneWeight = ZONE_WEIGHTS[z];
    const zonePoints = zoneTime * zoneWeight;
    cardioLoad += zonePoints;
  }

  // 7. Get workouts if not provided
  let strengthWorkouts = muscleWorkouts;
  let cardioWorkoutsList = cardioWorkouts;

  if (!strengthWorkouts || !cardioWorkoutsList) {
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

      strengthWorkouts = (workoutsToday as WorkoutSample[]).filter((w) =>
        strengthWorkoutTypes.includes(
          w.workoutActivityType as WorkoutActivityType
        )
      );

      cardioWorkoutsList = (workoutsToday as WorkoutSample[]).filter((w) =>
        cardioWorkoutTypes.includes(w.workoutActivityType as WorkoutActivityType)
      );
    } catch (error) {
      console.warn("Could not query workouts:", error);
      strengthWorkouts = [];
      cardioWorkoutsList = [];
    }
  }

  // 8. Enhanced muscular load calculation
  let muscleLoad = 0;
  for (const workout of strengthWorkouts) {
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

    muscleLoad += workoutMusclePoints;
  }

  // 8b. Calculate cardio workout points (walking, running, etc.)
  let cardioWorkoutPoints = 0;
  for (const workout of cardioWorkoutsList) {
    let workoutCardioPoints = 0;

    // For cardio workouts, prioritize energy burned or duration
    if (workout.totalEnergyBurned) {
      const energy =
        typeof workout.totalEnergyBurned === "object"
          ? workout.totalEnergyBurned.quantity
          : workout.totalEnergyBurned;
      // Cardio workouts get standard energy multiplier (not doubled like strength)
      workoutCardioPoints = energy * MUSCLE_PTS_PER_KCAL;
    } else if (typeof workout.duration === "number" && workout.duration > 0) {
      const durationMinutes = workout.duration / 60;
      // Walking and light cardio get moderate points per minute
      const cardioMultiplier =
        workout.workoutActivityType === WorkoutActivityType.walking
          ? MUSCLE_PTS_PER_MIN * 0.8 // Walking gets 80% of standard rate
          : MUSCLE_PTS_PER_MIN * 1.2; // Other cardio gets 120% of standard rate
      workoutCardioPoints = durationMinutes * cardioMultiplier;
    }

    cardioWorkoutPoints += workoutCardioPoints;
  }

  const totalLoad = cardioLoad + muscleLoad + cardioWorkoutPoints;

  // Improved scaling for more realistic strain scores
  // Use a combination of linear and logarithmic scaling
  const linearComponent = Math.min(15, totalLoad * 0.01); // Direct linear scaling up to 15
  const logComponent = Math.log(Math.max(1, totalLoad + 1)) * 2.5; // Logarithmic scaling
  const exponentialComponent =
    MAX_STRAIN * (1 - Math.exp(-SCALE_FACTOR * totalLoad * 0.001)); // Adjusted exponential

  // Use the maximum of the three approaches for better scaling
  let strainScore = Math.max(
    linearComponent,
    Math.max(logComponent, exponentialComponent)
  );

  // 10. Validation and final adjustments
  strainScore = Math.max(0, Math.min(MAX_STRAIN, strainScore));
  strainScore = Math.round(strainScore * 10) / 10;

  return {
    strainScore,
    breakdown: {
      cardioLoad,
      muscleLoad,
      cardioWorkoutPoints,
      totalLoad,
    },
  };
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
          STRAIN_LOG_SCALE_FACTOR: 0.8, // Reduced from 0.006
          HEART_RATE_ZONE_WEIGHTS: [1, 2, 4, 7, 10],
          ACTIVITY_THRESHOLD_PERCENTAGE: 0.08,
          MUSCLE_POINTS_PER_KCAL: 0.4, // Increased from 0.04
          MUSCLE_POINTS_PER_MINUTE_DURATION: 4.0, // Increased from 0.4
        };
      case "advanced":
        return {
          STRAIN_LOG_SCALE_FACTOR: 1.0, // Increased from 0.007
          HEART_RATE_ZONE_WEIGHTS: [1, 2, 4, 6, 9],
          ACTIVITY_THRESHOLD_PERCENTAGE: 0.09,
          MUSCLE_POINTS_PER_KCAL: 0.35, // Increased from 0.035
          MUSCLE_POINTS_PER_MINUTE_DURATION: 3.5, // Increased from 0.35
        };
      case "intermediate":
        return {
          STRAIN_LOG_SCALE_FACTOR: 1.2, // Significantly increased from 0.015
          HEART_RATE_ZONE_WEIGHTS: [1, 2, 4, 6, 8],
          ACTIVITY_THRESHOLD_PERCENTAGE: 0.1,
          MUSCLE_POINTS_PER_KCAL: 0.3, // Significantly increased from 0.05
          MUSCLE_POINTS_PER_MINUTE_DURATION: 3.0, // Significantly increased from 0.4
        };
      case "beginner":
      default:
        return {
          STRAIN_LOG_SCALE_FACTOR: 1.5, // Significantly increased from 0.009
          HEART_RATE_ZONE_WEIGHTS: [1, 2, 3, 5, 7],
          ACTIVITY_THRESHOLD_PERCENTAGE: 0.12,
          MUSCLE_POINTS_PER_KCAL: 0.25, // Significantly increased from 0.025
          MUSCLE_POINTS_PER_MINUTE_DURATION: 2.5, // Significantly increased from 0.25
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
  const strainScore = await calculatePersonalizedStrain(
    date,
    defaults,
    userProfile
  );

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

/**
 * Calculate detailed strain data for a single day including breakdown and metrics
 */
export async function calculateDailyStrainData(
  date: Date,
  defaults: SystemDefaults,
  userProfile: UserProfile
): Promise<DailyStrainData> {
  const dateFrom = startOfDay(date);
  const dateTo = endOfDay(date);

  // Get heart rate data and workouts
  let heartRateSamples: QuantitySample[] = [];
  let muscleWorkouts: WorkoutSample[] = [];
  let cardioWorkouts: WorkoutSample[] = [];

  try {
    const [hrSamples, workoutSamples] = await Promise.all([
      queryQuantitySamples("HKQuantityTypeIdentifierHeartRate", {
        filter: { startDate: dateFrom, endDate: dateTo },
        unit: "count/min",
      }),
      queryWorkoutSamples({
        filter: { startDate: dateFrom, endDate: dateTo },
        energyUnit: "kcal",
        distanceUnit: "m",
        ascending: false,
        limit: 100,
      }),
    ]);

    heartRateSamples = hrSamples as QuantitySample[];
    const allWorkouts = workoutSamples as WorkoutSample[];

    muscleWorkouts = allWorkouts.filter((w) =>
      strengthWorkoutTypes.includes(w.workoutActivityType as WorkoutActivityType)
    );
    cardioWorkouts = allWorkouts.filter((w) =>
      cardioWorkoutTypes.includes(w.workoutActivityType as WorkoutActivityType)
    );
  } catch (error) {
    console.warn("Could not query health data for strain calculation:", error);
  }

  // Calculate strain score and breakdown using core function
  const coreResult = await calculateStrainCore(
    date,
    defaults,
    userProfile,
    heartRateSamples,
    muscleWorkouts,
    cardioWorkouts
  );

  const strainScore = coreResult.strainScore;

  // Get strain category
  const { category } = await getStrainMetrics(date, defaults, userProfile);

  // Calculate detailed breakdown (enhanced version with more details)
  const breakdown = await calculateStrainBreakdown(
    heartRateSamples,
    muscleWorkouts,
    cardioWorkouts,
    defaults,
    userProfile
  );

  // Calculate metrics
  const metrics = calculateDailyMetrics(
    heartRateSamples,
    muscleWorkouts,
    cardioWorkouts,
    defaults
  );

  return {
    date,
    strainScore,
    category,
    breakdown,
    workouts: {
      strength: muscleWorkouts,
      cardio: cardioWorkouts,
    },
    metrics,
  };
}

/**
 * Calculate strain statistics for a period of days
 */
export async function calculateStrainPeriodStats(
  dateRange: DateRange,
  defaults: SystemDefaults,
  userProfile: UserProfile
): Promise<StrainPeriodStats> {
  const startDate = new Date(dateRange.from);
  const endDate = new Date(dateRange.to);

  // Generate array of dates in the range
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate strain data for each day
  const dailyDataPromises = dates.map(date =>
    calculateDailyStrainData(date, defaults, userProfile)
  );

  let dailyData: DailyStrainData[] = [];
  try {
    dailyData = await Promise.all(dailyDataPromises);
  } catch (error) {
    console.error("Error calculating daily strain data:", error);
    // Continue with partial data if some days failed
    const settledResults = await Promise.allSettled(dailyDataPromises);
    dailyData = settledResults
      .filter((result): result is PromiseFulfilledResult<DailyStrainData> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  // Calculate aggregations
  const aggregations = calculateStrainAggregations(dailyData);

  // Calculate trends
  const trends = calculateStrainTrends(dailyData);

  return {
    periodDays: dates.length,
    startDate,
    endDate,
    dailyData,
    aggregations,
    trends,
  };
}

/**
 * Calculate detailed strain breakdown for a day
 */
async function calculateStrainBreakdown(
  heartRateSamples: QuantitySample[],
  muscleWorkouts: WorkoutSample[],
  cardioWorkouts: WorkoutSample[],
  defaults: SystemDefaults,
  userProfile: UserProfile
): Promise<DailyStrainData['breakdown']> {
  const {
    HEART_RATE_ZONE_WEIGHTS: ZONE_WEIGHTS,
    MUSCLE_POINTS_PER_KCAL: MUSCLE_PTS_PER_KCAL,
    MUSCLE_POINTS_PER_MINUTE_DURATION: MUSCLE_PTS_PER_MIN,
    RESTING_HEART_RATE: DEFAULT_RESTING_HR,
    MAX_HEART_RATE: DEFAULT_MAX_HR,
    HRR_ZONE_LOWER_BOUND_PERCENTAGES: HRR_ZONE_BOUNDS,
    ACTIVITY_THRESHOLD_PERCENTAGE: ACTIVITY_THRESHOLD_PCT,
  } = defaults;

  // Calculate cardio load from heart rate zones
  let cardioLoad = 0;
  if (heartRateSamples.length > 0) {
    // Simplified zone calculation for breakdown
    const restingHR = userProfile.restingHeartRate || DEFAULT_RESTING_HR;
    const maxHR = userProfile.maxHeartRate || DEFAULT_MAX_HR;
    const HRR = Math.max(1, maxHR - restingHR);
    const activityThreshold = restingHR + HRR * ACTIVITY_THRESHOLD_PCT;

    const normalizedZoneBounds = HRR_ZONE_BOUNDS.map((bound) =>
      bound > 1 ? bound / 100 : bound
    );

    const zonesThresholds = [
      restingHR + normalizedZoneBounds[0] * HRR,
      restingHR + normalizedZoneBounds[1] * HRR,
      restingHR + normalizedZoneBounds[2] * HRR,
      restingHR + normalizedZoneBounds[3] * HRR,
      restingHR + normalizedZoneBounds[4] * HRR,
    ];

    const activeSamples = heartRateSamples.filter(
      (sample) =>
        typeof sample.quantity === "number" &&
        sample.quantity > activityThreshold
    );

    const zoneMinutes = [0, 0, 0, 0, 0];
    activeSamples.forEach((sample) => {
      const hr = typeof sample.quantity === "number" ? sample.quantity : 0;
      const startTime = new Date(sample.startDate);
      const endTime = new Date(sample.endDate);
      const durationMinutes = Math.max(
        1,
        (endTime.getTime() - startTime.getTime()) / (1000 * 60)
      );

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

    for (let z = 0; z < ZONE_WEIGHTS.length; z++) {
      const zoneTime = zoneMinutes[z] || 0;
      const zoneWeight = ZONE_WEIGHTS[z];
      cardioLoad += zoneTime * zoneWeight;
    }
  }

  // Calculate muscle load
  let muscleLoad = 0;
  for (const workout of muscleWorkouts) {
    if (
      workout.metadata?.TotalWeightLifted &&
      typeof workout.metadata.TotalWeightLifted === "number"
    ) {
      muscleLoad += workout.metadata.TotalWeightLifted * MUSCLE_PTS_PER_KCAL * 2;
    } else if (workout.totalEnergyBurned) {
      const energy =
        typeof workout.totalEnergyBurned === "object"
          ? workout.totalEnergyBurned.quantity
          : workout.totalEnergyBurned;
      muscleLoad += energy * MUSCLE_PTS_PER_KCAL * 2;
    } else if (typeof workout.duration === "number" && workout.duration > 0) {
      const durationMinutes = workout.duration / 60;
      muscleLoad += durationMinutes * MUSCLE_PTS_PER_MIN * 1.5;
    }
  }

  // Calculate cardio workout points
  let cardioWorkoutPoints = 0;
  for (const workout of cardioWorkouts) {
    if (workout.totalEnergyBurned) {
      const energy =
        typeof workout.totalEnergyBurned === "object"
          ? workout.totalEnergyBurned.quantity
          : workout.totalEnergyBurned;
      cardioWorkoutPoints += energy * MUSCLE_PTS_PER_KCAL;
    } else if (typeof workout.duration === "number" && workout.duration > 0) {
      const durationMinutes = workout.duration / 60;
      const cardioMultiplier =
        workout.workoutActivityType === WorkoutActivityType.walking
          ? MUSCLE_PTS_PER_MIN * 0.8
          : MUSCLE_PTS_PER_MIN * 1.2;
      cardioWorkoutPoints += durationMinutes * cardioMultiplier;
    }
  }

  return {
    cardioLoad,
    muscleLoad,
    cardioWorkoutPoints,
    totalLoad: cardioLoad + muscleLoad + cardioWorkoutPoints,
  };
}

/**
 * Calculate daily metrics from health data
 */
function calculateDailyMetrics(
  heartRateSamples: QuantitySample[],
  muscleWorkouts: WorkoutSample[],
  cardioWorkouts: WorkoutSample[],
  defaults: SystemDefaults
): DailyStrainData['metrics'] {
  const allWorkouts = [...muscleWorkouts, ...cardioWorkouts];

  // Calculate total workout time
  const totalWorkoutTime = allWorkouts.reduce((total, workout) => {
    return total + (typeof workout.duration === "number" ? workout.duration / 60 : 0);
  }, 0);

  // Calculate total calories
  const totalCalories = allWorkouts.reduce((total, workout) => {
    if (workout.totalEnergyBurned) {
      const energy =
        typeof workout.totalEnergyBurned === "object"
          ? workout.totalEnergyBurned.quantity
          : workout.totalEnergyBurned;
      return total + energy;
    }
    return total;
  }, 0);

  // Calculate average heart rate during activity
  let avgHeartRate = 0;
  if (heartRateSamples.length > 0) {
    const hrValues = heartRateSamples
      .map((s) => s.quantity)
      .filter((q) => typeof q === "number") as number[];

    if (hrValues.length > 0) {
      avgHeartRate = hrValues.reduce((sum, hr) => sum + hr, 0) / hrValues.length;
    }
  }

  // Simplified zone minutes calculation
  const zoneMinutes = [0, 0, 0, 0, 0]; // Will be calculated properly in breakdown

  return {
    totalWorkoutTime: Math.round(totalWorkoutTime),
    totalCalories: Math.round(totalCalories),
    avgHeartRate: Math.round(avgHeartRate),
    zoneMinutes,
    workoutCount: allWorkouts.length,
  };
}

/**
 * Calculate aggregations across daily strain data
 */
function calculateStrainAggregations(dailyData: DailyStrainData[]): StrainPeriodStats['aggregations'] {
  if (dailyData.length === 0) {
    return {
      avgStrainScore: 0,
      maxStrainScore: 0,
      minStrainScore: 0,
      totalWorkoutTime: 0,
      totalCalories: 0,
      workoutsByType: {},
      strainByCategory: {},
      avgHeartRateZoneDistribution: [0, 0, 0, 0, 0],
      recoveryDays: 0,
      highStrainDays: 0,
      workoutDays: 0,
    };
  }

  const strainScores = dailyData.map(d => d.strainScore);
  const avgStrainScore = strainScores.reduce((sum, score) => sum + score, 0) / strainScores.length;
  const maxStrainScore = Math.max(...strainScores);
  const minStrainScore = Math.min(...strainScores);

  const totalWorkoutTime = dailyData.reduce((sum, d) => sum + d.metrics.totalWorkoutTime, 0);
  const totalCalories = dailyData.reduce((sum, d) => sum + d.metrics.totalCalories, 0);

  // Count workouts by type
  const workoutsByType: Record<string, number> = {};
  dailyData.forEach(d => {
    [...d.workouts.strength, ...d.workouts.cardio].forEach(workout => {
      const activityType = WorkoutActivityType[workout.workoutActivityType] || 'unknown';
      workoutsByType[activityType] = (workoutsByType[activityType] || 0) + 1;
    });
  });

  // Count days by strain category
  const strainByCategory: Record<string, number> = {};
  dailyData.forEach(d => {
    strainByCategory[d.category] = (strainByCategory[d.category] || 0) + 1;
  });

  // Calculate average zone distribution
  const totalZoneMinutes = [0, 0, 0, 0, 0];
  dailyData.forEach(d => {
    d.metrics.zoneMinutes.forEach((minutes, idx) => {
      totalZoneMinutes[idx] += minutes;
    });
  });
  const avgHeartRateZoneDistribution = totalZoneMinutes.map(total => total / dailyData.length);

  const recoveryDays = dailyData.filter(d => d.strainScore < 6).length;
  const highStrainDays = dailyData.filter(d => d.strainScore >= 14).length;
  const workoutDays = dailyData.filter(d => d.metrics.workoutCount > 0).length;

  return {
    avgStrainScore: Math.round(avgStrainScore * 10) / 10,
    maxStrainScore,
    minStrainScore,
    totalWorkoutTime,
    totalCalories,
    workoutsByType,
    strainByCategory,
    avgHeartRateZoneDistribution,
    recoveryDays,
    highStrainDays,
    workoutDays,
  };
}

/**
 * Calculate trends from daily strain data
 */
function calculateStrainTrends(dailyData: DailyStrainData[]): StrainPeriodStats['trends'] {
  if (dailyData.length < 2) {
    return {
      strainTrend: 'stable',
      fitnessProgress: 0,
      workloadConsistency: 0,
      averageRestDaysBetweenHighStrain: 0,
    };
  }

  // Calculate strain trend using linear regression
  const strainScores = dailyData.map(d => d.strainScore);
  const n = strainScores.length;
  const xSum = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ..., n-1
  const ySum = strainScores.reduce((sum, score) => sum + score, 0);
  const xySum = strainScores.reduce((sum, score, idx) => sum + score * idx, 0);
  const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices

  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);

  let strainTrend: 'increasing' | 'decreasing' | 'stable';
  if (Math.abs(slope) < 0.1) {
    strainTrend = 'stable';
  } else if (slope > 0) {
    strainTrend = 'increasing';
  } else {
    strainTrend = 'decreasing';
  }

  // Fitness progress based on strain trend and workout consistency
  const fitnessProgress = Math.max(-1, Math.min(1, slope * 10));

  // Workload consistency based on coefficient of variation
  const avgStrain = ySum / n;
  const variance = strainScores.reduce((sum, score) => sum + Math.pow(score - avgStrain, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = avgStrain > 0 ? stdDev / avgStrain : 1;
  const workloadConsistency = Math.max(0, 1 - coefficientOfVariation);

  // Calculate average rest days between high strain sessions
  const highStrainIndices = dailyData
    .map((d, idx) => d.strainScore >= 14 ? idx : -1)
    .filter(idx => idx !== -1);

  let averageRestDaysBetweenHighStrain = 0;
  if (highStrainIndices.length > 1) {
    const restDays = [];
    for (let i = 1; i < highStrainIndices.length; i++) {
      restDays.push(highStrainIndices[i] - highStrainIndices[i - 1] - 1);
    }
    averageRestDaysBetweenHighStrain = restDays.reduce((sum, days) => sum + days, 0) / restDays.length;
  }

  return {
    strainTrend,
    fitnessProgress: Math.round(fitnessProgress * 100) / 100,
    workloadConsistency: Math.round(workloadConsistency * 100) / 100,
    averageRestDaysBetweenHighStrain: Math.round(averageRestDaysBetweenHighStrain * 10) / 10,
  };
}

/**
 * Get predefined date range presets for strain analysis
 */
export function getStrainPeriodPresets(): StrainPeriodPresets {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Last 14 days
  const last14Days = new Date(today);
  last14Days.setDate(today.getDate() - 13);

  // Last 30 days
  const last30Days = new Date(today);
  last30Days.setDate(today.getDate() - 29);

  // This week (Monday to Sunday)
  const thisWeekStart = new Date(today);
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  thisWeekStart.setDate(today.getDate() - daysToMonday);

  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);

  // Last week
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);

  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekEnd.getDate() - 6);

  // This month
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Last month
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  return {
    last14Days: { from: last14Days, to: today },
    last30Days: { from: last30Days, to: today },
    thisWeek: { from: thisWeekStart, to: thisWeekEnd },
    lastWeek: { from: lastWeekStart, to: lastWeekEnd },
    thisMonth: { from: thisMonthStart, to: thisMonthEnd },
    lastMonth: { from: lastMonthStart, to: lastMonthEnd },
  };
}

/**
 * Quick function to get strain stats for the last 14 days
 */
export async function getLast14DaysStrainStats(
  defaults: SystemDefaults,
  userProfile: UserProfile
): Promise<StrainPeriodStats> {
  const presets = getStrainPeriodPresets();
  return calculateStrainPeriodStats(presets.last14Days, defaults, userProfile);
}

/**
 * Quick function to get strain stats for the last 30 days
 */
export async function getLast30DaysStrainStats(
  defaults: SystemDefaults,
  userProfile: UserProfile
): Promise<StrainPeriodStats> {
  const presets = getStrainPeriodPresets();
  return calculateStrainPeriodStats(presets.last30Days, defaults, userProfile);
}
