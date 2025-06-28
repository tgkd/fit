import { WorkoutActivityType } from "@kingstinct/react-native-healthkit";
import i18n from "../i18n";

export interface WorkoutMetric {
  key: string;
  label: string;
  getValue: (data: WorkoutData) => string;
  unit?: string;
  isAlwaysVisible?: boolean;
}

export interface WorkoutData {
  id: string;
  type: WorkoutActivityType;
  duration: number; // in minutes
  date: Date;
  calories: number;
  distance?: number; // in km
  averageHeartRate?: number | null;
  maxHeartRate?: number | null;
  minHeartRate?: number | null;
  averagePace?: number; // in minutes per km
  heartRateSamples?: {
    timestamp: Date;
    value: number;
  }[];
}

export interface WorkoutConfig {
  metrics: WorkoutMetric[];
}

// Helper functions for metric calculations
const formatPace = (paceMinutesPerKm: number): string => {
  const minutes = Math.floor(paceMinutesPerKm);
  const seconds = Math.round((paceMinutesPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatHeartRateRange = (min?: number | null, max?: number | null): string => {
  if (min && max) {
    return `${Math.round(min)}-${Math.round(max)}`;
  }
  return 'N/A';
};

const formatDistance = (km?: number): string => {
  if (!km) return '0.00';
  return km.toFixed(2);
};

const formatDurationHMS = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.round((minutes % 1) * 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Base metrics available for all workouts
const baseMetrics: WorkoutMetric[] = [
  {
    key: 'duration',
    label: i18n.t('workouts.duration'),
    getValue: (data) => formatDurationHMS(data.duration),
    isAlwaysVisible: true,
  },
  {
    key: 'calories',
    label: i18n.t('workouts.activeCal'),
    getValue: (data) => Math.round(data.calories).toString(),
    isAlwaysVisible: true,
  },
];

export const localizedWorkoutName = (type: WorkoutActivityType): string => {
  switch (type) {
    case WorkoutActivityType.americanFootball:
      return i18n.t('workouts.americanFootball');
    case WorkoutActivityType.archery:
      return i18n.t('workouts.archery');
    case WorkoutActivityType.australianFootball:
      return i18n.t('workouts.australianFootball');
    case WorkoutActivityType.badminton:
      return i18n.t('workouts.badminton');
    case WorkoutActivityType.baseball:
      return i18n.t('workouts.baseball');
    case WorkoutActivityType.basketball:
      return i18n.t('workouts.basketball');
    case WorkoutActivityType.bowling:
      return i18n.t('workouts.bowling');
    case WorkoutActivityType.boxing:
      return i18n.t('workouts.boxing');
    case WorkoutActivityType.climbing:
      return i18n.t('workouts.climbing');
    case WorkoutActivityType.cricket:
      return i18n.t('workouts.cricket');
    case WorkoutActivityType.crossTraining:
      return i18n.t('workouts.crossTraining');
    case WorkoutActivityType.curling:
      return i18n.t('workouts.curling');
    case WorkoutActivityType.cycling:
      return i18n.t('workouts.cycling');
    case WorkoutActivityType.dance:
      return i18n.t('workouts.dance');
    case WorkoutActivityType.danceInspiredTraining:
      return i18n.t('workouts.danceInspiredTraining');
    case WorkoutActivityType.elliptical:
      return i18n.t('workouts.elliptical');
    case WorkoutActivityType.equestrianSports:
      return i18n.t('workouts.equestrianSports');
    case WorkoutActivityType.fencing:
      return i18n.t('workouts.fencing');
    case WorkoutActivityType.fishing:
      return i18n.t('workouts.fishing');
    case WorkoutActivityType.functionalStrengthTraining:
      return i18n.t('workouts.functionalStrengthTraining');
    case WorkoutActivityType.golf:
      return i18n.t('workouts.golf');
    case WorkoutActivityType.gymnastics:
      return i18n.t('workouts.gymnastics');
    case WorkoutActivityType.handball:
      return i18n.t('workouts.handball');
    case WorkoutActivityType.hiking:
      return i18n.t('workouts.hiking');
    case WorkoutActivityType.hockey:
      return i18n.t('workouts.hockey');
    case WorkoutActivityType.hunting:
      return i18n.t('workouts.hunting');
    case WorkoutActivityType.lacrosse:
      return i18n.t('workouts.lacrosse');
    case WorkoutActivityType.martialArts:
      return i18n.t('workouts.martialArts');
    case WorkoutActivityType.mindAndBody:
      return i18n.t('workouts.mindAndBody');
    case WorkoutActivityType.mixedMetabolicCardioTraining:
      return i18n.t('workouts.mixedMetabolicCardioTraining');
    case WorkoutActivityType.paddleSports:
      return i18n.t('workouts.paddleSports');
    case WorkoutActivityType.play:
      return i18n.t('workouts.play');
    case WorkoutActivityType.preparationAndRecovery:
      return i18n.t('workouts.preparationAndRecovery');
    case WorkoutActivityType.racquetball:
      return i18n.t('workouts.racquetball');
    case WorkoutActivityType.rowing:
      return i18n.t('workouts.rowing');
    case WorkoutActivityType.rugby:
      return i18n.t('workouts.rugby');
    case WorkoutActivityType.running:
      return i18n.t('workouts.running');
    case WorkoutActivityType.sailing:
      return i18n.t('workouts.sailing');
    case WorkoutActivityType.skatingSports:
      return i18n.t('workouts.skatingSports');
    case WorkoutActivityType.snowSports:
      return i18n.t('workouts.snowSports');
    case WorkoutActivityType.soccer:
      return i18n.t('workouts.soccer');
    case WorkoutActivityType.softball:
      return i18n.t('workouts.softball');
    case WorkoutActivityType.squash:
      return i18n.t('workouts.squash');
    case WorkoutActivityType.stairClimbing:
      return i18n.t('workouts.stairClimbing');
    case WorkoutActivityType.surfingSports:
      return i18n.t('workouts.surfingSports');
    case WorkoutActivityType.swimming:
      return i18n.t('workouts.swimming');
    case WorkoutActivityType.tableTennis:
      return i18n.t('workouts.tableTennis');
    case WorkoutActivityType.tennis:
      return i18n.t('workouts.tennis');
    case WorkoutActivityType.trackAndField:
      return i18n.t('workouts.trackAndField');
    case WorkoutActivityType.traditionalStrengthTraining:
      return i18n.t('workouts.traditionalStrengthTraining');
    case WorkoutActivityType.volleyball:
      return i18n.t('workouts.volleyball');
    case WorkoutActivityType.walking:
      return i18n.t('workouts.walking');
    case WorkoutActivityType.waterFitness:
      return i18n.t('workouts.waterFitness');
    case WorkoutActivityType.waterPolo:
      return i18n.t('workouts.waterPolo');
    case WorkoutActivityType.waterSports:
      return i18n.t('workouts.waterSports');
    case WorkoutActivityType.wrestling:
      return i18n.t('workouts.wrestling');
    case WorkoutActivityType.yoga:
      return i18n.t('workouts.yoga');
    case WorkoutActivityType.barre:
      return i18n.t('workouts.barre');
    case WorkoutActivityType.coreTraining:
      return i18n.t('workouts.coreTraining');
    case WorkoutActivityType.crossCountrySkiing:
      return i18n.t('workouts.crossCountrySkiing');
    case WorkoutActivityType.downhillSkiing:
      return i18n.t('workouts.downhillSkiing');
    case WorkoutActivityType.flexibility:
      return i18n.t('workouts.flexibility');
    case WorkoutActivityType.highIntensityIntervalTraining:
      return i18n.t('workouts.highIntensityIntervalTraining');
    case WorkoutActivityType.jumpRope:
      return i18n.t('workouts.jumpRope');
    case WorkoutActivityType.kickboxing:
      return i18n.t('workouts.kickboxing');
    case WorkoutActivityType.pilates:
      return i18n.t('workouts.pilates');
    case WorkoutActivityType.snowboarding:
      return i18n.t('workouts.snowboarding');
    case WorkoutActivityType.stairs:
      return i18n.t('workouts.stairs');
    case WorkoutActivityType.stepTraining:
      return i18n.t('workouts.stepTraining');
    case WorkoutActivityType.wheelchairWalkPace:
      return i18n.t('workouts.wheelchairWalkPace');
    case WorkoutActivityType.wheelchairRunPace:
      return i18n.t('workouts.wheelchairRunPace');
    case WorkoutActivityType.taiChi:
      return i18n.t('workouts.taiChi');
    case WorkoutActivityType.mixedCardio:
      return i18n.t('workouts.mixedCardio');
    case WorkoutActivityType.handCycling:
      return i18n.t('workouts.handCycling');
    case WorkoutActivityType.discSports:
      return i18n.t('workouts.discSports');
    case WorkoutActivityType.fitnessGaming:
      return i18n.t('workouts.fitnessGaming');
    case WorkoutActivityType.cardioDance:
      return i18n.t('workouts.cardioDance');
    case WorkoutActivityType.socialDance:
      return i18n.t('workouts.socialDance');
    case WorkoutActivityType.pickleball:
      return i18n.t('workouts.pickleball');
    case WorkoutActivityType.cooldown:
      return i18n.t('workouts.cooldown');
    case WorkoutActivityType.swimBikeRun:
      return i18n.t('workouts.swimBikeRun');
    case WorkoutActivityType.transition:
      return i18n.t('workouts.transition');
    case WorkoutActivityType.underwaterDiving:
      return i18n.t('workouts.underwaterDiving');
    case WorkoutActivityType.other:
      return i18n.t('workouts.other');
    default:
      return i18n.t('workouts.other');
  }
};

// Workout-specific configurations
export const workoutConfigs: Partial<Record<WorkoutActivityType, WorkoutConfig>> = {
  [WorkoutActivityType.tennis]: {
    metrics: [
      ...baseMetrics,
      {
        key: 'heartRate',
        label: i18n.t('workouts.heartRateRange'),
        getValue: (data) => formatHeartRateRange(data.minHeartRate, data.maxHeartRate),
        unit: i18n.t('workouts.bpm'),
      },
      {
        key: 'avgHeartRate',
        label: i18n.t('workouts.avgHeartRate'),
        getValue: (data) => data.averageHeartRate ? Math.round(data.averageHeartRate).toString() : 'N/A',
        unit: i18n.t('workouts.bpm'),
      },
    ],
  },
  [WorkoutActivityType.running]: {
    metrics: [
      ...baseMetrics,
      {
        key: 'distance',
        label: i18n.t('workouts.distance'),
        getValue: (data) => formatDistance(data.distance),
        unit: i18n.t('workouts.km'),
      },
      {
        key: 'pace',
        label: i18n.t('workouts.pace'),
        getValue: (data) => data.averagePace ? formatPace(data.averagePace) : 'N/A',
        unit: i18n.t('workouts.km'),
      },
    ],
  },
  [WorkoutActivityType.cycling]: {
    metrics: [
      ...baseMetrics,
      {
        key: 'distance',
        label: i18n.t('workouts.distance'),
        getValue: (data) => formatDistance(data.distance),
        unit: i18n.t('workouts.km'),
      },
      {
        key: 'pace',
        label: i18n.t('workouts.pace'),
        getValue: (data) => data.averagePace ? formatPace(data.averagePace) : 'N/A',
        unit: i18n.t('workouts.km'),
      },
    ],
  },
  [WorkoutActivityType.swimming]: {
    metrics: [
      {
        key: 'distance',
        label: i18n.t('workouts.distance'),
        getValue: (data) => data.distance ? `${(data.distance * 1000).toFixed(0)}` : '0',
        unit: i18n.t('workouts.m'),
      },
      {
        key: 'pace',
        label: i18n.t('workouts.pace'),
        getValue: (data) => data.averagePace ? formatPace(data.averagePace) : 'N/A',
        unit: i18n.t('workouts.m'),
      },
      ...baseMetrics,
    ],
  },
  [WorkoutActivityType.functionalStrengthTraining]: {
    metrics: [
      ...baseMetrics,
      {
        key: 'avgHeartRate',
        label: i18n.t('workouts.avgHeartRate'),
        getValue: (data) => data.averageHeartRate ? Math.round(data.averageHeartRate).toString() : 'N/A',
        unit: i18n.t('workouts.bpm'),
      },
      {
        key: 'heartRate',
        label: i18n.t('workouts.heartRateRange'),
        getValue: (data) => formatHeartRateRange(data.minHeartRate, data.maxHeartRate),
        unit: i18n.t('workouts.bpm'),
      },
    ],
  },
  [WorkoutActivityType.yoga]: {
    metrics: [
      ...baseMetrics,
      {
        key: 'avgHeartRate',
        label: i18n.t('workouts.avgHeartRate'),
        getValue: (data) => data.averageHeartRate ? Math.round(data.averageHeartRate).toString() : 'N/A',
        unit: i18n.t('workouts.bpm'),
      },
    ],
  },
  [WorkoutActivityType.soccer]: {
    metrics: [
      ...baseMetrics,
      {
        key: 'distance',
        label: i18n.t('workouts.distance'),
        getValue: (data) => formatDistance(data.distance),
        unit: i18n.t('workouts.km'),
      },
      {
        key: 'avgHeartRate',
        label: i18n.t('workouts.avgHeartRate'),
        getValue: (data) => data.averageHeartRate ? Math.round(data.averageHeartRate).toString() : 'N/A',
        unit: i18n.t('workouts.bpm'),
      },
    ],
  },
};

// Default config for unlisted workout types
export const getWorkoutConfig = (type: WorkoutActivityType): WorkoutConfig => {
  return workoutConfigs[type] || {
    metrics: baseMetrics,
  };
};
