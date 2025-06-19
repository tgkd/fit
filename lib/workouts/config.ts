import { HKWorkoutActivityType } from "@kingstinct/react-native-healthkit";
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
  type: HKWorkoutActivityType;
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
    label: i18n.t('workouts.hours'),
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

export const localizedWorkoutName = (type: HKWorkoutActivityType): string => {
  switch (type) {
    case HKWorkoutActivityType.tennis:
      return i18n.t('workouts.tennis');
    case HKWorkoutActivityType.running:
      return i18n.t('workouts.running');
    case HKWorkoutActivityType.cycling:
      return i18n.t('workouts.cycling');
    case HKWorkoutActivityType.swimming:
      return i18n.t('workouts.swimming');
    case HKWorkoutActivityType.functionalStrengthTraining:
      return i18n.t('workouts.functionalStrengthTraining');
    case HKWorkoutActivityType.yoga:
      return i18n.t('workouts.yoga');
    case HKWorkoutActivityType.soccer:
      return i18n.t('workouts.soccer');
  }
  return type.toString();
};

// Workout-specific configurations
export const workoutConfigs: Partial<Record<HKWorkoutActivityType, WorkoutConfig>> = {
  [HKWorkoutActivityType.tennis]: {
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
  [HKWorkoutActivityType.running]: {
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
  [HKWorkoutActivityType.cycling]: {
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
  [HKWorkoutActivityType.swimming]: {
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
  [HKWorkoutActivityType.functionalStrengthTraining]: {
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
  [HKWorkoutActivityType.yoga]: {
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
  [HKWorkoutActivityType.soccer]: {
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
export const getWorkoutConfig = (type: HKWorkoutActivityType): WorkoutConfig => {
  return workoutConfigs[type] || {
    metrics: baseMetrics,
  };
};