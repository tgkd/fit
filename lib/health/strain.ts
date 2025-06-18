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

interface StrainCalculationDefaults {
  RESTING_HEART_RATE?: number;
  MAX_HEART_RATE?: number;
  STRAIN_LOG_SCALE_FACTOR?: number;
  HEART_RATE_ZONE_WEIGHTS?: number[];
  MUSCLE_POINTS_PER_KCAL?: number;
  MUSCLE_POINTS_PER_MINUTE_DURATION?: number;
  HRR_ZONE_LOWER_BOUND_PERCENTAGES?: number[];
  MIN_HRR_FALLBACK_ADJUSTMENT?: number;
}

/**
 * Calculate the "Day Strain" score (0–21) for a given day using HealthKit data.
 * Combines cardiovascular load (from heart rate zones) and muscular load (from strength workouts).
 */
export async function calculateDayStrain(
  date: Date,
  defaults?: StrainCalculationDefaults
): Promise<number> {
  // Configurable constants with fallbacks
  const DEFAULT_RESTING_HR = defaults?.RESTING_HEART_RATE ?? 60;
  const DEFAULT_MAX_HR = defaults?.MAX_HEART_RATE ?? 190;
  const LOG_SCALE_FACTOR = defaults?.STRAIN_LOG_SCALE_FACTOR ?? 3;
  const ZONE_WEIGHTS = defaults?.HEART_RATE_ZONE_WEIGHTS ?? [0.5, 1, 2, 3, 4];
  const MUSCLE_PTS_PER_KCAL = defaults?.MUSCLE_POINTS_PER_KCAL ?? 0.02;
  const MUSCLE_PTS_PER_MIN = defaults?.MUSCLE_POINTS_PER_MINUTE_DURATION ?? 0.3;
  const HRR_ZONE_BOUNDS = defaults?.HRR_ZONE_LOWER_BOUND_PERCENTAGES ?? [
    0.6, 0.7, 0.8, 0.85, 0.95,
  ];
  const MIN_HRR_ADJUST = defaults?.MIN_HRR_FALLBACK_ADJUSTMENT ?? 30;

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

  // 5. Calculate time in each zone from heart rate samples
  // Only count heart rates that indicate sustained activity
  const activityThreshold = restingHR + (HRR * 0.3); // Increased threshold to 30% HRR
  let zoneMinutes = [0, 0, 0, 0, 0];

  if (heartRateSamples.length > 0) {
    // Filter for elevated heart rates that indicate actual activity
    const activitySamples = heartRateSamples.filter(sample =>
      typeof sample.quantity === "number" && sample.quantity > activityThreshold
    );

    console.log(`Found ${activitySamples.length} activity samples above ${activityThreshold.toFixed(0)} BPM`);

    // Group samples into activity sessions (consecutive samples within 10 minutes)
    const activitySessions: { start: Date; end: Date; avgHR: number }[] = [];

    activitySamples.sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    let currentSession: { samples: typeof activitySamples; start: Date; end: Date } | null = null;

    for (const sample of activitySamples) {
      const sampleTime = new Date(sample.startDate);

      if (!currentSession ||
          sampleTime.getTime() - currentSession.end.getTime() > 10 * 60 * 1000) {
        // Start new session
        if (currentSession && currentSession.samples.length >= 3) {
          // Only count sessions with at least 3 samples (some sustained activity)
          const avgHR = currentSession.samples.reduce((sum, s) =>
            sum + (typeof s.quantity === "number" ? s.quantity : 0), 0) / currentSession.samples.length;
          const duration = Math.min(60, // Cap at 60 minutes per session
            (currentSession.end.getTime() - currentSession.start.getTime()) / (1000 * 60));

          if (duration >= 2) { // Minimum 2 minutes of activity
            activitySessions.push({
              start: currentSession.start,
              end: currentSession.end,
              avgHR
            });
          }
        }

        currentSession = {
          samples: [sample],
          start: sampleTime,
          end: sampleTime
        };
      } else {
        // Add to current session
        currentSession.samples.push(sample);
        currentSession.end = sampleTime;
      }
    }

    // Process final session
    if (currentSession && currentSession.samples.length >= 3) {
      const avgHR = currentSession.samples.reduce((sum, s) =>
        sum + (typeof s.quantity === "number" ? s.quantity : 0), 0) / currentSession.samples.length;
      const duration = Math.min(60,
        (currentSession.end.getTime() - currentSession.start.getTime()) / (1000 * 60));

      if (duration >= 2) {
        activitySessions.push({
          start: currentSession.start,
          end: currentSession.end,
          avgHR
        });
      }
    }

    console.log(`Processed ${activitySessions.length} activity sessions`);

    // Calculate zone minutes from activity sessions
    for (const session of activitySessions) {
      const hr = session.avgHR;
      const duration = (session.end.getTime() - session.start.getTime()) / (1000 * 60);

      let zoneIdx = -1;
      if (hr >= zonesThresholds[4]) zoneIdx = 4;
      else if (hr >= zonesThresholds[3]) zoneIdx = 3;
      else if (hr >= zonesThresholds[2]) zoneIdx = 2;
      else if (hr >= zonesThresholds[1]) zoneIdx = 1;
      else if (hr >= zonesThresholds[0]) zoneIdx = 0;

      if (zoneIdx >= 0) {
        zoneMinutes[zoneIdx] += duration;
        console.log(`Session: ${duration.toFixed(1)}min at ${hr.toFixed(0)} BPM (Zone ${zoneIdx + 1})`);
      }
    }
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

  // 8. Compute muscular load points
  let musclePoints = 0;
  for (const workout of muscleWorkouts) {
    if (
      workout.metadata &&
      typeof workout.metadata.TotalWeightLifted === "number"
    ) {
      musclePoints += workout.metadata.TotalWeightLifted;
    } else if (workout.totalEnergyBurned) {
      const energy =
        typeof workout.totalEnergyBurned === "object" &&
        typeof workout.totalEnergyBurned.quantity === "number"
          ? workout.totalEnergyBurned.quantity
          : typeof workout.totalEnergyBurned === "number"
          ? workout.totalEnergyBurned
          : 0;
      musclePoints += energy * MUSCLE_PTS_PER_KCAL;
    } else if (typeof workout.duration === "number" && workout.duration > 0) {
      musclePoints += (workout.duration / 60) * MUSCLE_PTS_PER_MIN;
    }
  }

  // 9. Combine cardio and muscle points, apply logarithmic strain scaling
  const totalLoad = cardioPoints + musclePoints;
  const strainScoreRaw = Math.log(Math.max(1, totalLoad + 1));
  let strainScore = LOG_SCALE_FACTOR * strainScoreRaw;

  // Debug logging to understand calculation
  console.log(`🏋️ Strain calculation for ${date.toDateString()}:`, {
    heartRateSamples: heartRateSamples.length,
    zoneMinutes,
    cardioPoints,
    muscleWorkouts: muscleWorkouts.length,
    musclePoints,
    totalLoad,
    strainScoreRaw,
    beforeCapping: strainScore,
    restingHR,
    maxHR,
    zonesThresholds,
  });

  // 10. Cap the strain score to the 0–21 range and round for clarity
  strainScore = Math.max(0, Math.min(21, strainScore));
  strainScore = Math.round(strainScore * 10) / 10;

  return strainScore;
}
