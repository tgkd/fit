import {
    getDateOfBirth,
    getMostRecentQuantitySample,
    HKQuantityTypeIdentifier,
    HKStatisticsOptions,
    queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit";
import { GeneralStats } from "./types";
import { getCurrentDateRanges } from "./utils";

/**
 * Fetch general user statistics
 * - Age (from date of birth)
 * - Weight (most recent)
 * - Steps (today's total)
 */
export const fetchGeneralStats = async (): Promise<GeneralStats> => {
  const { now, startOfToday } = getCurrentDateRanges();

  // Get age from date of birth
  const dob = await getDateOfBirth();
  const age = dob ? now.getFullYear() - dob.getFullYear() : null;

  // Get most recent weight
  const weightSample = await getMostRecentQuantitySample(
    HKQuantityTypeIdentifier.bodyMass,
    "kg"
  );
  const weightInKg = weightSample?.quantity ?? null;

  // Get today's steps
  const stepsStat = await queryStatisticsForQuantity(
    HKQuantityTypeIdentifier.stepCount,
    [HKStatisticsOptions.cumulativeSum],
    startOfToday,
    now
  );
  const steps = stepsStat?.sumQuantity?.quantity || 0;

  return {
    age,
    weightInKg,
    steps,
  };
};

/**
 * Calculate move (active calories) - Apple Ring calculation
 * Note: Uses HealthKit's activeEnergyBurned which already excludes basal calories
 * This matches Apple's Move ring exactly
 */
export const calculateMove = (activeEnergyKcal: number): number => {
  return parseFloat(activeEnergyKcal.toFixed(0));
};
