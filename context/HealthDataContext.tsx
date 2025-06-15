import React, { createContext, ReactNode, useEffect, useState } from "react";

import {
  calculateRecoveryScore,
  getAllHealthStats,
  isHealthKitAvailable,
  HealthData as ModularHealthData,
  WriteHealthDataOptions as ModularWriteHealthDataOptions,
} from "@/lib/health";

// Default values for health calculations when data is missing
export const HEALTH_DEFAULTS = {
  RESPIRATORY_RATE: 15,           // Default breaths per minute
  RESTING_HEART_RATE: 60,         // Default resting heart rate
  SLEEP_EFFICIENCY: 85,           // Default sleep efficiency percentage
  PRIOR_STRAIN: 50,               // Default prior day strain
  DEFAULT_STRESS_LEVEL: 2,        // Default stress level when data missing
  HRV_BASELINE: 45                // Default HRV baseline when no data
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

  // SleepStats
  sleepHours: 0,
  sleepPerformance: 0,
  sleepConsistency: 0,
  sleepEfficiency: 0,
  dailySleepDurations: [],
  sleep: [],
  metrics: {
    hoursVsNeeded: 0,
    sleepConsistency: 0,
    sleepEfficiency: 0,
    highSleepStress: 0,
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

  // HeartStressStats
  restingHeartRate: null,
  hrv7DayAvg: 0,
  hrvMostRecent: 0,
  hrvValues: [],
  recoveryScore: 0,
  strainScore: 0,
  stressLevel: 0,
  bloodOxygen: null,

  stressDetails: null
};

export const HealthDataContext = createContext<{
  data: HealthData;
  refresh: () => Promise<void>;
}>({
  data: defaultData,
  refresh: async () => {},
});

const USE_FAKE_DATA = false;

export const HealthDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<HealthData>(defaultData);

  const initData = async () => {
    if (USE_FAKE_DATA || !isHealthKitAvailable) {
      console.log("Using fake data");
      setData(generateFakeHealthData());
    } else {
      try {
        const fetchedData = await getAllHealthStats(HEALTH_DEFAULTS);
        setData(fetchedData);
      } catch (error) {
        console.error("getAllHealthStats failed:", error);
        setData(generateFakeHealthData());
      }
    }
  };

  useEffect(() => {
    initData();
  }, []);

  return (
    <HealthDataContext.Provider value={{ data, refresh: initData }}>
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

    // SleepStats
    sleepHours: 7.5,
    sleepPerformance: 94,
    sleepConsistency: 85,
    sleepEfficiency: 92,
    dailySleepDurations: [
      { date: "2025-01-14", duration: 7.5 },
      { date: "2025-01-13", duration: 8.0 },
    ],
    sleep: [],
    metrics: {
      hoursVsNeeded: 81,
      sleepConsistency: 90,
      sleepEfficiency: 92,
      highSleepStress: 0,
    },
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

    // HeartStressStats
    restingHeartRate: fakeRHR,
    hrv7DayAvg: 45.7,
    hrvMostRecent: 50,
    hrvValues: fakeHrvValues,
    recoveryScore: calculateRecoveryScore(
      fakeHrvValues,
      fakeRHR,
      HEALTH_DEFAULTS.RESPIRATORY_RATE,
      92, // sleep efficiency
      HEALTH_DEFAULTS.PRIOR_STRAIN
    ),
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
  };
}
