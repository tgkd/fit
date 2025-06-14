import React, { createContext, ReactNode, useEffect, useState } from "react";

import {
  calculateRecoveryScore,
  getAllHealthStats,
  isHealthKitAvailable,
  HealthData as ModularHealthData,
  WriteHealthDataOptions as ModularWriteHealthDataOptions,
} from "@/lib/health";

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

  // HeartStressStats
  restingHeartRate: null,
  hrv7DayAvg: 0,
  hrvMostRecent: 0,
  hrvValues: [],
  recoveryScore: 0,
  strainScore: 0,
  stressLevel: 0,
  bloodOxygen: null,
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
        const fetchedData = await getAllHealthStats();
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

    // HeartStressStats
    restingHeartRate: fakeRHR,
    hrv7DayAvg: 45.7,
    hrvMostRecent: 50,
    hrvValues: fakeHrvValues,
    recoveryScore: calculateRecoveryScore(
      fakeHrvValues,
      fakeRHR,
      15, // respiratory rate
      92, // sleep efficiency
      50  // prior strain
    ),
    strainScore: 65,
    stressLevel: 25,
    bloodOxygen: { value: 0.98, date: new Date() },
  };
}
