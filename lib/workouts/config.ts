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

export const localizedWorkoutName = (type: WorkoutActivityType): string => {
  switch (type) {
    case WorkoutActivityType.tennis:
      return i18n.t('workouts.tennis');
    case WorkoutActivityType.running:
      return i18n.t('workouts.running');
    case WorkoutActivityType.cycling:
      return i18n.t('workouts.cycling');
    case WorkoutActivityType.swimming:
      return i18n.t('workouts.swimming');
    case WorkoutActivityType.functionalStrengthTraining:
      return i18n.t('workouts.functionalStrengthTraining');
    case WorkoutActivityType.yoga:
      return i18n.t('workouts.yoga');
    case WorkoutActivityType.soccer:
      return i18n.t('workouts.soccer');
  }
  return type.toString();
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
      ...baseMetrics,
    ],
  },
  [WorkoutActivityType.cycling]: {
    metrics: [
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
      ...baseMetrics,
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
      ...baseMetrics,
    ],
  },
};

// Default config for unlisted workout types
export const getWorkoutConfig = (type: WorkoutActivityType): WorkoutConfig => {
  return workoutConfigs[type] || {
    metrics: baseMetrics,
  };
};
