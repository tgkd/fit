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

export interface SleepMetrics {
  hoursVsNeeded: number;
  sleepConsistency: number;
  sleepEfficiency: number;
  highSleepStress: number;
}

export interface SleepStage {
  type: "awake" | "light" | "deep" | "rem";
  duration: number; // in minutes
  percentage: number;
  color: string;
}

export interface LastNightSleep {
  totalSleepTime: string; // "7:12"
  averageSleepTime: string; // "7:23"
  timeInBed: string; // "7:54"
  stages: {
    awake: { percentage: number; duration: number; color: string };
    light: { percentage: number; duration: number; color: string };
    deep: { percentage: number; duration: number; color: string };
    rem: { percentage: number; duration: number; color: string };
  };
  restorativeSleep: {
    duration: string; // "3:22"
    averageDuration: string; // "3:26"
  };
}

export interface SleepPerformanceData {
  overallScore: number; // 89% like in the image
  lastNight: LastNightSleep;
  recommendation: string;
}

export interface SleepStats {
  sleepHours: number;
  sleepPerformance: number;
  sleepConsistency: number;
  sleepEfficiency: number;
  dailySleepDurations: { date: string; duration: number }[];
  sleep: readonly HKCategorySample<HKCategoryTypeIdentifier.sleepAnalysis>[];
  // New detailed sleep data
  metrics: SleepMetrics;
  lastNight: LastNightSleep;
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

export interface StressMetrics {
  baselineHRV: number; // ms, 14-day average HRV
  baselineRHR: number; // bpm, 14-day average resting HR
  totalDayStress: number; // 0–3 scale
  sleepStress: number; // 0–3 scale
  nonActivityStress: number; // 0–3 scale
  hourlyStress: {
    // detail per hour
    hourStart: Date;
    stress: number;
  }[];
}

export interface HourlyHeartData {
  hourStart: Date;
  hr: number;
  hrv: number;
}

export interface TimeInterval {
  start: Date;
  end: Date;
}

// For StressMonitorCard data
export interface StressChartDataPoint {
  time: number; // Can be an index or a timestamp for x-axis
  stress: number;
  timestamp: string | Date; // For display on x-axis
}

export interface StressChartDisplayData {
  chartPlotData: StressChartDataPoint[];
  currentStressForVisualization: number;
  yDomainForVisualization: [number, number];
  xAxisDataType: "hourly" | "daily";
  lastUpdatedDisplay: string;
}

// Combined interface that matches current HealthData
export interface HealthData
  extends GeneralStats,
    WorkoutStats,
    SleepStats,
    HeartStressStats {
  stressDetails: StressMetrics | null;
  stressChartDisplayData?: StressChartDisplayData; // Added
}

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
