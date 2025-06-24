import { MMKV } from "react-native-mmkv";

import { SystemDefaults, UserProfile } from "@/lib/health/types";

// Create dedicated MMKV instance for health settings
export const healthSettingsStorage = new MMKV({
  id: "health-settings",
});

// Storage keys
export const STORAGE_KEYS = {
  SYSTEM_DEFAULTS: "system-defaults",
  USER_PROFILE: "user-profile",
  SETTINGS_INITIALIZED: "settings-initialized",
} as const;

// Default values - these will be the fallback when storage is empty
export const DEFAULT_SYSTEM_DEFAULTS: SystemDefaults = {
  RESPIRATORY_RATE: 15, // Default breaths per minute
  RESTING_HEART_RATE: 60, // Default resting heart rate
  SLEEP_EFFICIENCY: 85, // Default sleep efficiency percentage
  DEFAULT_STRESS_LEVEL: 2, // Default stress level when data missing
  HRV_BASELINE: 45, // Default HRV baseline when no data
  DAILY_WATER_INTAKE: 2000, // ml - default daily water intake
  DAILY_ALCOHOL_DRINKS: 0, // number of drinks - default no alcohol
  DAILY_CALORIES_CONSUMED: 2000, // kcal - default daily calories
  NORMATIVE_HRV: 45, // ms - fallback HRV baseline for adults
  WATER_TARGET: 2500, // ml - daily hydration target
  CALORIE_TARGET: 1800, // kcal - minimum daily calories
  STRAIN_LOW_THRESHOLD: 500, // kcal - low strain threshold
  STRAIN_HIGH_THRESHOLD: 1000, // kcal - high strain threshold
  RESPIRATORY_BASELINE: 16, // breaths/min - ideal respiratory rate
  ALCOHOL_PENALTY_PER_DRINK: 50, // points deducted per alcoholic drink
  MAX_HEART_RATE: 190,
  STRAIN_LOG_SCALE_FACTOR: 1.5,
  HEART_RATE_ZONE_WEIGHTS: [1, 2, 3, 4, 5],
  MUSCLE_POINTS_PER_KCAL: 0.5,
  MUSCLE_POINTS_PER_MINUTE_DURATION: 1.0,
  HRR_ZONE_LOWER_BOUND_PERCENTAGES: [0.5, 0.6, 0.7, 0.8, 0.9], // Fixed: should be decimals, not percentages
  MIN_HRR_FALLBACK_ADJUSTMENT: 40, // Increased from 0.1 to a reasonable BPM value
  ACTIVITY_THRESHOLD_PERCENTAGE: 0.1,
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  // Basic user profile
  age: 30,
  weight: 70, // kg
  height: 175, // cm
  fitnessLevel: "intermediate",
  restingHeartRate: 60,
  maxHeartRate: 185,
  baselineHRV: 45,
  baselineRHR: 60,
  dailyWaterTarget: 2500,
  dailyCalorieTarget: 2000,
  sleepEfficiency: 85,

  // Heart rate parameters
  maxHrFormula: "tanaka", // More accurate than classic formula
  maxHrAgeCoefficient: 0.7,
  maxHrConstant: 208,

  // Recovery configuration
  alcoholPenaltyPerDrink: 50,
  waterIntakePerKg: 35, // ml per kg body weight
  caloricDeficitPercentage: 0.85, // 15% deficit for weight management

  // BMR activity multipliers
  bmrActivityMultipliers: {
    beginner: 1.2,
    intermediate: 1.375,
    advanced: 1.55,
    elite: 1.725,
  },

  // Strain thresholds by fitness level
  strainThresholds: {
    beginner: { low: 400, high: 800 },
    intermediate: { low: 500, high: 1000 },
    advanced: { low: 600, high: 1200 },
    elite: { low: 700, high: 1400 },
  },

  // Age and fitness adjustments
  hrvAgeDeclineRate: 0.5, // HRV decline per year above 25
  rhrAgeIncreaseRate: 0.2, // RHR increase per year above 30
  fitnessRhrAdjustments: {
    beginner: 0,
    intermediate: -5,
    advanced: -10,
    elite: -15,
  },

  // Weight-based alcohol sensitivity
  alcoholWeightSensitivity: {
    baseWeight: 70, // kg (reference weight for baseline penalty)
    minMultiplier: 0.5,
    maxMultiplier: 1.5,
  },

  // Strain calculation guidance thresholds
  strainGuidanceThresholds: {
    highIntensityMinutes: 20,
    moderateIntensityMinutes: 30,
    totalActiveMinutes: 60,
    lightActivityThreshold: 30,
  },

  // Recovery calculation constants
  hrvDataMinimumSamples: 7,
  hrBaselineAgeReference: 30,
  hrBaselineValue: 60,
  hrvBaslineValue: 60,
  maxAlcoholForZeroScore: 2,
  respiratoryPenaltyForMissing: 75,
  waterIntakeAssumption: 0.8,
  bmrGenderAdjustment: 5, // +5 for males, -161 for females
};

// Utility functions to get/set complex objects
export const getSystemDefaults = (): SystemDefaults => {
  const stored = healthSettingsStorage.getString(STORAGE_KEYS.SYSTEM_DEFAULTS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn(
        "Failed to parse stored system defaults, using fallback:",
        error
      );
    }
  }
  return DEFAULT_SYSTEM_DEFAULTS;
};

export const setSystemDefaults = (defaults: SystemDefaults): void => {
  healthSettingsStorage.set(
    STORAGE_KEYS.SYSTEM_DEFAULTS,
    JSON.stringify(defaults)
  );
};

export const getUserProfile = (): UserProfile => {
  const stored = healthSettingsStorage.getString(STORAGE_KEYS.USER_PROFILE);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn(
        "Failed to parse stored user profile, using fallback:",
        error
      );
    }
  }
  return DEFAULT_USER_PROFILE;
};

export const setUserProfile = (profile: UserProfile): void => {
  healthSettingsStorage.set(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
};

export const updateUserProfile = (updates: Partial<UserProfile>): void => {
  const currentProfile = getUserProfile();
  const updatedProfile = { ...currentProfile, ...updates };
  setUserProfile(updatedProfile);
};

export const updateSystemDefaults = (
  updates: Partial<SystemDefaults>
): void => {
  const currentDefaults = getSystemDefaults();
  const updatedDefaults = { ...currentDefaults, ...updates };
  setSystemDefaults(updatedDefaults);
};

// Initialize storage with default values on first run
export const initializeHealthSettings = (): void => {
  const isInitialized = healthSettingsStorage.getBoolean(
    STORAGE_KEYS.SETTINGS_INITIALIZED
  );

  if (!isInitialized) {
    console.log("Initializing health settings with default values...");
    setSystemDefaults(DEFAULT_SYSTEM_DEFAULTS);
    setUserProfile(DEFAULT_USER_PROFILE);
    healthSettingsStorage.set(STORAGE_KEYS.SETTINGS_INITIALIZED, true);
  }
};
