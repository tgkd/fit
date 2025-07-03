import type {
    QuantitySample,
    QueryStatisticsResponse,
} from "@kingstinct/react-native-healthkit";
import {
    getDateOfBirthAsync,
    getMostRecentQuantitySample,
    queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit";

import { GeneralStats } from "./types";
import { getCurrentDateRanges, getDateRanges } from "./utils";

/**
 * Fetch general user statistics for a specific date
 * - Age (from date of birth)
 * - Weight (most recent)
 * - Steps (for the specific date)
 */
export const fetchGeneralStats = async (
  targetDate: Date
): Promise<GeneralStats> => {
  // Get age from date of birth
  const dob = await getDateOfBirthAsync();
  const currentDate = new Date();
  let age: number | null = null;
  
  if (dob) {
    const ageMs = currentDate.getTime() - dob.getTime();
    if (ageMs > 0) {
      const calculatedAge = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
      // Validate age is reasonable (between 0 and 120)
      if (calculatedAge >= 0 && calculatedAge <= 120) {
        age = calculatedAge;
      } else {
        console.warn(`Calculated age ${calculatedAge} is outside valid range, setting to null`);
      }
    } else {
      console.warn('Date of birth is in the future, setting age to null');
    }
  }

  // Get most recent weight
  const weightSample: QuantitySample | undefined =
    await getMostRecentQuantitySample("HKQuantityTypeIdentifierBodyMass", "kg");
  const weightInKg = weightSample?.quantity ?? null;

  // Get steps for the target date
  let startDate: Date, endDate: Date;
  if (targetDate) {
    const ranges = getDateRanges(targetDate);
    startDate = ranges.startOfTargetDay;
    endDate = ranges.endOfTargetDay;
  } else {
    const ranges = getCurrentDateRanges();
    startDate = ranges.startOfToday;
    endDate = ranges.now;
  }

  const stepsStat: QueryStatisticsResponse = await queryStatisticsForQuantity(
    "HKQuantityTypeIdentifierStepCount",
    ["cumulativeSum"],
    {
      filter: { startDate, endDate },
      unit: "count",
    }
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
