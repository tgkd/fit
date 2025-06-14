import {
    HKCategorySample,
    HKCategoryTypeIdentifier,
    HKQuantitySample,
    HKQuantityTypeIdentifier,
} from "@kingstinct/react-native-healthkit";

// Shared interfaces for all health modules
export interface DateRange {
  from: Date;
  to: Date;
}

export interface GeneralStats {
  age: number | null;
  weightInKg: number | null;
  steps: number;
}

export interface WorkoutStats {
  exerciseMins: number;
  standHours: number;
  moveKcal: number;
  rawCalories: readonly HKQuantitySample<HKQuantityTypeIdentifier.activeEnergyBurned>[];
}

export interface SleepStats {
  sleepHours: number;
  sleepPerformance: number;
  sleepConsistency: number;
  sleepEfficiency: number;
  dailySleepDurations: { date: string; duration: number }[];
  sleep: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[];
}

export interface HeartStressStats {
  restingHeartRate: number | null;
  hrv7DayAvg: number;
  hrvMostRecent: number;
  hrvValues: number[];
  recoveryScore: number;
  strainScore: number;
  stressLevel: number;
  bloodOxygen: { value: number; date: Date | null } | null;
}

// Combined interface that matches current HealthData
export interface HealthData extends GeneralStats, WorkoutStats, SleepStats, HeartStressStats {}

// Activity and heart rate interfaces from healthStats.ts
export interface ActivitySample {
  start: Date;
  end: Date;
  mets: number;
}

export interface HeartRateSample {
  timestamp: Date;
  value: number; // bpm
}

export interface SleepSample {
  inBedStart: Date;
  inBedEnd: Date;
  asleepStart: Date;
  asleepEnd: Date;
}

// Write data interfaces (from current context)
export interface WriteHealthDataOptions {
  steps?: number;
  weight?: number; // in kg
  height?: number; // in cm
  heartRate?: number; // bpm
  bodyFatPercentage?: number; // percentage
  activeEnergyBurned?: number; // calories
  waterIntake?: number; // ml
  mindfulSession?: {
    duration: number; // minutes
    startDate?: Date;
  };
  workout?: {
    type: string;
    duration: number; // minutes
    energyBurned?: number; // calories
    distance?: number; // meters
    startDate?: Date;
  };
}
