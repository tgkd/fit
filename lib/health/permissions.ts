import {
  isHealthDataAvailable,
  requestAuthorization,
  type ObjectTypeIdentifier,
} from "@kingstinct/react-native-healthkit";
import { Platform } from "react-native";

export const readPermissions: ObjectTypeIdentifier[] = [
  'HKQuantityTypeIdentifierHeartRate',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierOxygenSaturation',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierHeight',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKQuantityTypeIdentifierRespiratoryRate',
  'HKCharacteristicTypeIdentifierDateOfBirth',
  'HKCharacteristicTypeIdentifierBiologicalSex',
  'HKCharacteristicTypeIdentifierBloodType',
  'HKQuantityTypeIdentifierVO2Max',
  'HKQuantityTypeIdentifierWorkoutEffortScore',
  'HKWorkoutTypeIdentifier',
  // Add new permissions for Apple Ring data
  'HKQuantityTypeIdentifierAppleExerciseTime',
  'HKQuantityTypeIdentifierAppleStandTime',
  'HKCategoryTypeIdentifierAppleStandHour',
];

export const isHealthKitAvailable = Platform.OS === "ios";
let healthKitInitialized = false;

export const initializeHealthKit = async (): Promise<boolean> => {
  if (isHealthKitAvailable && !healthKitInitialized) {
    try {
      const isAvailable = await isHealthDataAvailable();

      if (isAvailable) {
        await requestAuthorization([], readPermissions);
        healthKitInitialized = true;
        return true;
      }
    } catch (error) {
      console.log("[ERROR] Cannot grant HealthKit permissions!", error);
      return false;
    }
  } else if (!isHealthKitAvailable) {
    console.log("HealthKit not available on this platform");
    return false;
  }

  return healthKitInitialized;
};

export const isHealthKitInitialized = (): boolean => {
  return healthKitInitialized;
};
