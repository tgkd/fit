import {
  isHealthDataAvailableAsync,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { getAllHealthStats } from "@/lib/health";
import { readPermissions } from "@/lib/health/permissions";
import { HealthData, SystemDefaults, UserProfile } from "@/lib/health/types";
import i18n from "@/lib/i18n";
import {
  getSystemDefaults,
  getUserProfile,
  initializeHealthSettings,
  updateSystemDefaults,
  updateUserProfile,
} from "@/lib/storage/healthSettings";

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
    // SleepAnalysis
    hoursVsNeeded: 0,
    sleepConsistency: 0,
    sleepEfficiency: 0,
    sleepStress: 0,
    overallPerformance: 0,
    totalSleepTime: "",
    totalSleepHours: 0,
    timeInBed: "",
    stages: {
      awake: { name: "Awake", percentage: 0, duration: 0, color: "#8B8B8B" },
      light: { name: "Light", percentage: 0, duration: 0, color: "#7BA7D9" },
      deep: {
        name: "SWS (Deep)",
        percentage: 0,
        duration: 0,
        color: "#D97BB6",
      },
      rem: { name: "REM", percentage: 0, duration: 0, color: "#9B7AD9" },
    },
    restorativeSleep: {
      duration: "",
      minutes: 0,
    },
    dailySleepDurations: [],
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
  userParams: UserProfile;
  systemDefaults: SystemDefaults;
  refresh: () => Promise<void>;
  setDate: (date: Date) => void;
  setPreviousDate: () => void;
  setNextDate: () => void;
  setToday: () => void;
  isToday: () => boolean;
  formatDate: (date: Date) => string;
  updateUserParams: (params: Partial<UserProfile>) => void;
  updateSystemDefaults: (defaults: Partial<SystemDefaults>) => void;
}>({
  data: defaultData,
  date: new Date(),
  loading: false,
  userParams: getUserProfile(),
  systemDefaults: getSystemDefaults(),
  refresh: async () => {},
  setDate: (date: Date) => {},
  setPreviousDate: () => {},
  setNextDate: () => {},
  setToday: () => {},
  isToday: () => false,
  formatDate: (date: Date) => "",
  updateUserParams: (params: Partial<UserProfile>) => {},
  updateSystemDefaults: (defaults: Partial<SystemDefaults>) => {},
});

const USE_FAKE_DATA = false;

export const HealthDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<HealthData>(defaultData);
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(false);
  const [userParams, setUserParams] = useState<UserProfile>(() =>
    getUserProfile()
  );
  const [systemDefaults, setSystemDefaults] = useState<SystemDefaults>(() =>
    getSystemDefaults()
  );
  const [isHealthKitAvailable, setIsHealthKitAvailable] =
    useState<boolean>(false);

  useEffect(() => {
    const checkHealthKitAvailability = async () => {
      try {
        const available = await isHealthDataAvailableAsync();
        setIsHealthKitAvailable(available);
        if (available) {
          await requestAuthorization([], readPermissions);
        } else {
          console.warn("HealthKit is not available on this device");
        }
      } catch (error) {
        console.error("Error checking HealthKit availability:", error);
        setIsHealthKitAvailable(false);
      }
    };

    checkHealthKitAvailability();
    initializeHealthSettings();
  }, []);

  const initData = useCallback(async () => {
    setLoading(true);

    try {
      if (USE_FAKE_DATA || !isHealthKitAvailable) {
        console.log("Using fake data");
        setData(generateFakeHealthData());
      } else {
        console.log("Fetching real health data...");
        const fetchedData = await getAllHealthStats(
          date,
          systemDefaults,
          userParams
        );
        setData(fetchedData);
      }
    } catch (error) {
      console.error("getAllHealthStats failed:", error);
      console.log("Falling back to fake data");
      setData(generateFakeHealthData());
    } finally {
      setLoading(false);
    }
  }, [date, userParams, systemDefaults, isHealthKitAvailable]);

  useEffect(() => {
    if (isHealthKitAvailable) {
      initData();
    }
  }, [initData, isHealthKitAvailable]);

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

  const updateUserParamsWithPersistence = useCallback(
    (params: Partial<UserProfile>) => {
      updateUserProfile(params);
      const updatedParams = getUserProfile();
      setUserParams(updatedParams);
    },
    []
  );

  const updateSystemDefaultsWithPersistence = useCallback(
    (defaults: Partial<SystemDefaults>) => {
      updateSystemDefaults(defaults);
      const updatedDefaults = getSystemDefaults();
      setSystemDefaults(updatedDefaults);
    },
    []
  );

  return (
    <HealthDataContext.Provider
      value={{
        data,
        date,
        loading,
        userParams,
        systemDefaults,
        refresh: initData,
        setDate,
        setPreviousDate,
        setNextDate,
        setToday,
        isToday,
        formatDate,
        updateUserParams: updateUserParamsWithPersistence,
        updateSystemDefaults: updateSystemDefaultsWithPersistence,
      }}
    >
      {children}
    </HealthDataContext.Provider>
  );
};

// Custom hook for easier context usage
export const useHealthData = () => {
  const context = useContext(HealthDataContext);
  if (!context) {
    throw new Error("useHealthData must be used within a HealthDataProvider");
  }
  return context;
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
    workouts: [
      {
        uuid: "fake-workout-1",
        workoutActivityType: 37, // Running
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().getTime() + 30 * 60 * 1000).toISOString(), // 30 mins later
        totalEnergyBurned: { quantity: 250 },
      },
      {
        uuid: "fake-workout-2", 
        workoutActivityType: 13, // Cycling
        startDate: new Date(new Date().getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        endDate: new Date(new Date().getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        totalEnergyBurned: { quantity: 180 },
      },
    ],

    sleep: {
      hoursVsNeeded: 81,
      sleepConsistency: 85,
      sleepEfficiency: 92,
      sleepStress: 15,
      overallPerformance: 94,
      totalSleepTime: "7:12",
      totalSleepHours: 7.5,
      timeInBed: "7:54",
      stages: {
        awake: { name: "Awake", percentage: 8, duration: 42, color: "#8B8B8B" },
        light: {
          name: "Light",
          percentage: 50,
          duration: 230,
          color: "#7BA7D9",
        },
        deep: {
          name: "SWS (Deep)",
          percentage: 25,
          duration: 121,
          color: "#D97BB6",
        },
        rem: { name: "REM", percentage: 17, duration: 81, color: "#9B7AD9" },
      },
      restorativeSleep: {
        duration: "3:22",
        minutes: 202,
      },
      dailySleepDurations: [
        { date: "2025-01-14", duration: 7.5 },
        { date: "2025-01-13", duration: 8.0 },
      ],
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
