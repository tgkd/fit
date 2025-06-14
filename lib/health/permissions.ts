import {
  HKCategoryTypeIdentifier,
  HKCharacteristicTypeIdentifier,
  HKQuantityTypeIdentifier,
  HKWorkoutTypeIdentifier,
  isHealthDataAvailable,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";
import { Platform } from "react-native";

export const readPermissions = [
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
  HKQuantityTypeIdentifier.respiratoryRate,
  HKCharacteristicTypeIdentifier.dateOfBirth,
  HKCharacteristicTypeIdentifier.biologicalSex,
  HKCharacteristicTypeIdentifier.bloodType,
  HKQuantityTypeIdentifier.vo2Max,
  HKQuantityTypeIdentifier.workoutEffortScore,
  HKWorkoutTypeIdentifier,
];

export const isHealthKitAvailable = Platform.OS === "ios";
let healthKitInitialized = false;

export const initializeHealthKit = async (): Promise<boolean> => {
  if (isHealthKitAvailable && !healthKitInitialized) {
    try {
      const isAvailable = await isHealthDataAvailable();

      if (isAvailable) {
        await requestAuthorization(readPermissions, []);
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
