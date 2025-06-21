import type {
  QuantitySample,
  QueryStatisticsResponse,
} from "@kingstinct/react-native-healthkit";
import {
  getDateOfBirthAsync,
  getMostRecentQuantitySample,
  queryStatisticsForQuantity,
} from "@kingstinct/react-native-healthkit/lib/commonjs/index.ios.js";

import { GeneralStats } from "./types";
import { getCurrentDateRanges, getDateRanges } from "./utils";

/**
 * Fetch general user statistics for a specific date
 * - Age (from date of birth)
 * - Weight (most recent)
 * - Steps (for the specific date)
 */
export const fetchGeneralStats = async (
  targetDate?: Date
): Promise<GeneralStats> => {
  // Get age from date of birth
  const dob = await getDateOfBirthAsync();
  const currentDate = new Date();
  const age = dob ? currentDate.getFullYear() - dob.getFullYear() : null;

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
