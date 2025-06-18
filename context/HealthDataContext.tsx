import React, { createContext, ReactNode, useCallback, useEffect, useState } from "react";

import { getAllHealthStats } from "@/lib/health";
import { isHealthKitAvailable } from "@/lib/health/permissions";
import {
  HealthData as ModularHealthData,
  WriteHealthDataOptions as ModularWriteHealthDataOptions,
} from "@/lib/health/types";
import i18n from "@/lib/i18n";

// Default values for health calculations when data is missing
export const HEALTH_DEFAULTS = {
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
};

// Use the modular HealthData interface
export type HealthData = ModularHealthData;
export type WriteHealthDataOptions = ModularWriteHealthDataOptions;

const defaultData: HealthData = {
  // GeneralStats
  age: null,
  weightInKg: null,
  steps: 0,

  // WorkoutStats
  exerciseMins: 0,
  standHours: 0,
  moveKcal: 0,
  rawCalories: [],
  workouts: [],

  sleep: {
    // SleepStats
    sleepHours: 0,
    sleepPerformance: 0,
    sleepConsistency: 0,
    sleepEfficiency: 0,
    dailySleepDurations: [],
    metrics: {
      hoursVsNeeded: 0,
      sleepConsistency: 0,
      sleepEfficiency: 0,
      sleepStress: 0,
    },
    lastNight: {
      totalSleepTime: "",
      averageSleepTime: "",
      timeInBed: "",
      stages: {
        awake: { percentage: 0, duration: 0, color: "#8B8B8B" },
        light: { percentage: 0, duration: 0, color: "#7BA7D9" },
        deep: { percentage: 0, duration: 0, color: "#D97BB6" },
        rem: { percentage: 0, duration: 0, color: "#9B7AD9" },
      },
      restorativeSleep: {
        duration: "",
        averageDuration: "",
      },
    },
  },

  // HeartStressStats
  restingHeartRate: null,
  hrv7DayAvg: 0,
  hrvMostRecent: 0,
  hrvValues: [],
  recoveryScore: 0,
  strainScore: 0,
  stressLevel: 0,
  bloodOxygen: null,

  stressDetails: null,

  // Period averages
  sleepAverages: {
    last14Days: {
      duration: 0,
      efficiency: 0,
      performance: 0,
      consistency: 0,
    },
    last30Days: {
      duration: 0,
      efficiency: 0,
      performance: 0,
      consistency: 0,
    },
  },
  stressAverages: {
    last14Days: {
      level: 0,
      hrvAverage: 0,
      restingHeartRate: 0,
    },
    last30Days: {
      level: 0,
      hrvAverage: 0,
      restingHeartRate: 0,
    },
  },
  recoveryAverages: {
    last14Days: {
      score: 0,
    },
    last30Days: {
      score: 0,
    },
  },
};

export const HealthDataContext = createContext<{
  data: HealthData;
  date: Date;
  loading: boolean;
  refresh: () => Promise<void>;
  setDate: (date: Date) => void;
  setPreviousDate: () => void;
  setNextDate: () => void;
  setToday: () => void;
  isToday: () => boolean;
  formatDate: (date: Date) => string;
}>({
  data: defaultData,
  date: new Date(),
  loading: false,
  refresh: async () => {},
  setDate: (date: Date) => {},
  setPreviousDate: () => {},
  setNextDate: () => {},
  setToday: () => {},
  isToday: () => false,
  formatDate: (date: Date) => "",
});

const USE_FAKE_DATA = false;

export const HealthDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<HealthData>(defaultData);
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(false);

  const initData = useCallback(async () => {
    setLoading(true);
    try {
      if (USE_FAKE_DATA || !isHealthKitAvailable) {
        console.log("Using fake data");
        setData(generateFakeHealthData());
      } else {
        console.log(`Fetching health data for: ${date.toDateString()}`);
        const fetchedData = await getAllHealthStats(date, HEALTH_DEFAULTS);
        setData(fetchedData);
      }
    } catch (error) {
      console.error("getAllHealthStats failed:", error);
      setData(generateFakeHealthData());
    } finally {
      setLoading(false);
    }
  }, [date]);

  const setPreviousDate = () => {
    const previousDate = new Date(date);
    previousDate.setDate(previousDate.getDate() - 1);
    setDate(previousDate);
  };

  const setNextDate = () => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    setDate(nextDate);
  };

  const setToday = () => {
    setDate(new Date());
  };

  const isToday = () => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatDate = (targetDate: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (targetDate.toDateString() === today.toDateString()) {
      return i18n.t("home.today");
    } else if (targetDate.toDateString() === yesterday.toDateString()) {
      return i18n.t("home.yesterday");
    } else {
      return targetDate.toLocaleDateString();
    }
  };

  useEffect(() => {
    initData();
  }, [initData]);

  return (
    <HealthDataContext.Provider
      value={{
        data,
        date,
        loading,
        refresh: initData,
        setDate,
        setPreviousDate,
        setNextDate,
        setToday,
        isToday,
        formatDate
      }}
    >
      {children}
    </HealthDataContext.Provider>
  );
};

// --- FAKE DATA GENERATOR (For Development) ---

function generateFakeHealthData(): HealthData {
  console.log("Generating fake data...");
  const fakeAge = 30;
  const fakeWeight = 75;
  const fakeRHR = 60;
  const fakeHrvValues = [40, 42, 48, 45, 43, 52, 50];

  return {
    // GeneralStats
    age: fakeAge,
    weightInKg: fakeWeight,
    steps: 8500,

    // WorkoutStats
    exerciseMins: 45,
    standHours: 10,
    moveKcal: 500,
    rawCalories: [],
    workouts: [],

    sleep: {
      sleepHours: 7.5,
      sleepPerformance: 94,
      sleepConsistency: 85,
      sleepEfficiency: 92,
      dailySleepDurations: [
        { date: "2025-01-14", duration: 7.5 },
        { date: "2025-01-13", duration: 8.0 },
      ],
      lastNight: {
        totalSleepTime: "7:12",
        averageSleepTime: "7:23",
        timeInBed: "7:54",
        stages: {
          awake: { percentage: 8, duration: 42, color: "#8B8B8B" },
          light: { percentage: 50, duration: 230, color: "#7BA7D9" },
          deep: { percentage: 25, duration: 121, color: "#D97BB6" },
          rem: { percentage: 17, duration: 81, color: "#9B7AD9" },
        },
        restorativeSleep: {
          duration: "3:22",
          averageDuration: "3:26",
        },
      },
      metrics: {
        hoursVsNeeded: 81,
        sleepConsistency: 90,
        sleepEfficiency: 92,
        sleepStress: 15, // Inverted stress percentage
      },
    },

    // HeartStressStats
    restingHeartRate: fakeRHR,
    hrv7DayAvg: 45.7,
    hrvMostRecent: 50,
    hrvValues: fakeHrvValues,
    recoveryScore: 93, // Use static value for fake data
    strainScore: 65,
    stressLevel: 25,
    bloodOxygen: { value: 0.98, date: new Date() },

    stressDetails: {
      baselineHRV: 47.2,
      baselineRHR: 58.5,
      totalDayStress: 1.2,
      sleepStress: 0.8,
      nonActivityStress: 1.4,
      hourlyStress: Array.from({ length: 12 }, (_, i) => ({
        hourStart: new Date(new Date().setHours(i, 0, 0, 0)),
        stress: Math.random() * 2.5, // Random stress between 0-2.5
      })),
    },

    // Period averages with fake data
    sleepAverages: {
      last14Days: {
        duration: 7.4,
        efficiency: 88,
        performance: 86,
        consistency: 82,
      },
      last30Days: {
        duration: 7.6,
        efficiency: 90,
        performance: 88,
        consistency: 85,
      },
    },
    stressAverages: {
      last14Days: {
        level: 22,
        hrvAverage: 46.8,
        restingHeartRate: 59.2,
      },
      last30Days: {
        level: 25,
        hrvAverage: 45.5,
        restingHeartRate: 60.1,
      },
    },
    recoveryAverages: {
      last14Days: {
        score: 91,
      },
      last30Days: {
        score: 89,
      },
    },
  };
}
