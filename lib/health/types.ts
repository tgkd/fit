import {
    QuantitySample,
    WorkoutSample,
    WorkoutActivityType,
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

// Interface for raw workout data from HealthKit
export interface HealthKitWorkout {
  uuid: string;
  workoutActivityType: number;
  startDate: string;
  endDate: string;
  totalEnergyBurned?: {
    quantity: number;
  };
}

export interface WorkoutStats {
  exerciseMins: number;
  standHours: number;
  moveKcal: number;
  rawCalories: readonly QuantitySample[];
  workouts: readonly WorkoutSample[];
}

export interface SleepStageData {
  name: string;
  duration: number; // in minutes
  percentage: number;
  color: string;
}

export interface SleepAnalysis {
  // Performance metrics (0-100 scores)
  hoursVsNeeded: number;
  sleepConsistency: number;
  sleepEfficiency: number;
  sleepStress: number; // Sleep quality score (0-100, higher = better restfulness)
  overallPerformance: number; // Overall sleep performance score

  // Sleep duration data
  totalSleepTime: string; // "7:12" formatted
  totalSleepHours: number; // 7.2 numeric value
  timeInBed: string; // "7:54" formatted

  // Sleep stage breakdown
  stages: {
    awake: SleepStageData;
    light: SleepStageData;
    deep: SleepStageData;
    rem: SleepStageData;
  };

  // Restorative sleep (deep + REM)
  restorativeSleep: {
    duration: string; // "3:22" formatted
    minutes: number; // 202 numeric value
  };

  // Historical data
  dailySleepDurations: { date: string; duration: number }[];
}

export interface HeartStressStats {
  restingHeartRate: number | null;
  hrv7DayAvg: number;
  hrvMostRecent: number;
  hrvValues: number[];
  stressLevel: number; // 0-3 scale: 0=no stress, 1=low, 2=moderate, 3=high
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
  workouts: Array<{
    type: WorkoutActivityType;
    id: string;
    startDate: Date;
    endDate: Date;
  }>;
}

// Period averages interfaces for historical data
export interface PeriodAverages<T> {
  last14Days: T;
  last30Days: T;
}

export interface SleepAverages {
  duration: number; // hours
  efficiency: number; // percentage 0-100
  performance: number; // percentage 0-100
  consistency: number; // percentage 0-100
}

export interface StressAverages {
  level: number; // 0-100 stress level (historical average calculation)
  hrvAverage: number; // ms
  restingHeartRate: number; // bpm
}

export interface RecoveryAverages {
  score: number; // 0-100 recovery score
}

// Combined interface that matches current HealthData
export interface HealthData
  extends GeneralStats,
    WorkoutStats,
    HeartStressStats {
  sleep: SleepAnalysis;
  recoveryScore: number;
  strainScore: number;
  stressDetails: StressMetrics | null;
  stressChartDisplayData?: StressChartDisplayData;
  sleepAverages: PeriodAverages<SleepAverages>;
  stressAverages: PeriodAverages<StressAverages>;
  recoveryAverages?: PeriodAverages<RecoveryAverages>;
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

// System defaults for health calculations (medical/scientific standards)
export interface SystemDefaults {
  RESTING_HEART_RATE: number;
  RESPIRATORY_RATE: number;
  SLEEP_EFFICIENCY: number;
  DEFAULT_STRESS_LEVEL: number;
  HRV_BASELINE: number;

  // Nutritional defaults for recovery calculation
  DAILY_WATER_INTAKE: number; // ml
  DAILY_ALCOHOL_DRINKS: number; // number of drinks
  DAILY_CALORIES_CONSUMED: number; // kcal

  // Recovery calculation thresholds
  NORMATIVE_HRV: number; // ms - fallback HRV baseline
  WATER_TARGET: number; // ml - daily hydration target
  CALORIE_TARGET: number; // kcal - minimum daily calories
  STRAIN_LOW_THRESHOLD: number; // kcal - low strain threshold
  STRAIN_HIGH_THRESHOLD: number; // kcal - high strain threshold
  RESPIRATORY_BASELINE: number; // breaths/min - ideal respiratory rate
  ALCOHOL_PENALTY_PER_DRINK: number; // points deducted per drink

  // Strain calculation defaults
  MAX_HEART_RATE: number;
  STRAIN_LOG_SCALE_FACTOR: number;
  HEART_RATE_ZONE_WEIGHTS: number[];
  MUSCLE_POINTS_PER_KCAL: number;
  MUSCLE_POINTS_PER_MINUTE_DURATION: number;
  HRR_ZONE_LOWER_BOUND_PERCENTAGES: number[];
  MIN_HRR_FALLBACK_ADJUSTMENT: number;
  ACTIVITY_THRESHOLD_PERCENTAGE: number;
}

// User profile for personalized health calculations
export interface UserProfile {
  age: number;
  weight: number; // kg
  height: number; // cm
  fitnessLevel: "beginner" | "intermediate" | "advanced" | "elite";
  restingHeartRate: number;
  maxHeartRate: number;
  baselineHRV: number;
  baselineRHR: number;
  dailyWaterTarget: number; // ml
  dailyCalorieTarget: number;
  sleepEfficiency: number;

  // Recovery-specific configuration
  alcoholPenaltyPerDrink: number; // points deducted per alcoholic drink
  waterIntakePerKg: number; // ml per kg body weight for hydration target
  bmrActivityMultipliers: {
    beginner: number;
    intermediate: number;
    advanced: number;
    elite: number;
  };
  caloricDeficitPercentage: number; // percentage (e.g., 0.85 for 15% deficit)
  strainThresholds: {
    beginner: { low: number; high: number };
    intermediate: { low: number; high: number };
    advanced: { low: number; high: number };
    elite: { low: number; high: number };
  };

  // Age and fitness adjustments
  hrvAgeDeclineRate: number; // HRV decline per year above 25
  rhrAgeIncreaseRate: number; // RHR increase per year above 30
  fitnessRhrAdjustments: {
    beginner: number;
    intermediate: number;
    advanced: number;
    elite: number;
  };

  // Weight-based alcohol sensitivity
  alcoholWeightSensitivity: {
    baseWeight: number; // kg (reference weight for baseline penalty)
    minMultiplier: number; // minimum weight factor
    maxMultiplier: number; // maximum weight factor
  };

  // Heart rate calculation parameters
  maxHrFormula: "classic" | "tanaka"; // 220-age vs 208-(0.7*age)
  maxHrAgeCoefficient: number; // coefficient for age in max HR calculation
  maxHrConstant: number; // base constant for max HR formula

  // Strain calculation guidance thresholds
  strainGuidanceThresholds: {
    highIntensityMinutes: number;
    moderateIntensityMinutes: number;
    totalActiveMinutes: number;
    lightActivityThreshold: number;
  };

  // Recovery calculation constants
  hrvDataMinimumSamples: number; // minimum HRV samples for reliable baseline
  hrBaselineAgeReference: number; // reference age for RHR baseline (e.g., 30)
  hrBaselineValue: number; // baseline RHR for reference age
  hrvBaslineValue: number; // baseline HRV for age calculations
  maxAlcoholForZeroScore: number; // number of drinks that results in 0% alcohol score
  respiratoryPenaltyForMissing: number; // percentage cap when respiratory data missing
  waterIntakeAssumption: number; // percentage of target assumed when no data (e.g., 0.8)
  bmrGenderAdjustment: number; // BMR adjustment for gender (+5 for males, -161 for females)
}

export interface SleepNeed {
  baselineHours: number;
  strainHours: number;
  sleepDebtHours: number;
  napHours: number;
  totalNeedHours: number;
}

export interface SleepCluster {
  start: Date;
  end: Date;
  asleepMs: number;
  timeInBedMs: number;
  isMainSleep: boolean;
}

export interface SleepPerformanceMetrics {
  hoursVsNeeded: number; // Percentage of sleep vs needed (0–100)
  sleepConsistency: number; // Consistency score (0–100)
  sleepEfficiency: number; // Sleep efficiency percentage (0–100)
  sleepStress: number; // Sleep quality score (0–100, higher = better restfulness)
  overallScore: number; // Overall sleep performance (0–100)
  sleepNeed: SleepNeed;
  mainCluster: SleepCluster;
}

// Strain Statistics Interfaces
export interface DailyStrainData {
  date: Date;
  strainScore: number;
  category: string;
  breakdown: {
    cardioLoad: number;
    muscleLoad: number;
    cardioWorkoutPoints: number;
    totalLoad: number;
  };
  workouts: {
    strength: WorkoutSample[];
    cardio: WorkoutSample[];
  };
  metrics: {
    totalWorkoutTime: number; // total workout minutes
    totalCalories: number; // total calories burned
    avgHeartRate: number; // average heart rate during activity
    zoneMinutes: number[]; // time spent in each HR zone [zone1, zone2, zone3, zone4, zone5]
    workoutCount: number; // total number of workouts
  };
}

export interface StrainPeriodStats {
  periodDays: number; // number of days in the period
  startDate: Date;
  endDate: Date;
  dailyData: DailyStrainData[];
  aggregations: {
    avgStrainScore: number;
    maxStrainScore: number;
    minStrainScore: number;
    totalWorkoutTime: number; // total workout minutes across all days
    totalCalories: number; // total calories burned across all days
    workoutsByType: Record<string, number>; // count of workouts by type
    strainByCategory: Record<string, number>; // count of days in each strain category
    avgHeartRateZoneDistribution: number[]; // average time per zone across period
    recoveryDays: number; // days with strain < 6
    highStrainDays: number; // days with strain >= 14
    workoutDays: number; // days with at least one workout
  };
  trends: {
    strainTrend: 'increasing' | 'decreasing' | 'stable';
    fitnessProgress: number; // -1 to 1 scale (negative = declining, positive = improving)
    workloadConsistency: number; // 0-1 scale (1 = very consistent)
    averageRestDaysBetweenHighStrain: number; // average days between high strain sessions
  };
}

export interface StrainPeriodPresets {
  last14Days: DateRange;
  last30Days: DateRange;
  thisWeek: DateRange;
  lastWeek: DateRange;
  thisMonth: DateRange;
  lastMonth: DateRange;
}


