import React, { createContext, ReactNode, useEffect, useState } from "react";
import AppleHealthKit, {
  HealthKitPermissions,
  HealthPermission,
  HealthValue,
} from "react-native-health";

export interface HealthData {
    sleepHours: number;
    sleepPerformance: number;
    sleepConsistency: number;
    recoveryScore: number;
    strainScore: number;
    restingHeartRate: number;
    steps: number;
    caloriesBurned: number;
    bloodOxygen: number;
    stressLevel: number;
    hrvValues: number[];
}

const defaultData: HealthData = {
    sleepHours: 0,
    sleepPerformance: 0,
    sleepConsistency: 0,
    recoveryScore: 0,
    strainScore: 0,
    restingHeartRate: 0,
    steps: 0,
    caloriesBurned: 0,
    bloodOxygen: 0,
    stressLevel: 0,
    hrvValues: [],
};

export const HealthDataContext = createContext<{
    data: HealthData;
    refresh: () => Promise<void>;
}>({
    data: defaultData,
    refresh: async () => {},
});

const permissions: HealthKitPermissions = {
    permissions: {
        read: [
            HealthPermission.SleepAnalysis,
            HealthPermission.RestingHeartRate,
            HealthPermission.StepCount,
            HealthPermission.ActiveEnergyBurned,
            HealthPermission.OxygenSaturation,
            HealthPermission.HeartRateVariability,
        ],
        write: [],
    },
};

export const HealthDataProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<HealthData>(defaultData);
    const [calculated, setCalculated] = useState<boolean>(false);

    useEffect(() => {
        fetchBaseData().then(setData);
    }, []);

    const refresh = async () => {
        try {
            const newData = await fetchBaseData();
            setData(newData);
        } catch (error) {
            console.error("Error refreshing health data", error);
        }
    };

    return (
        <HealthDataContext.Provider value={{ data, refresh }}>
            {children}
        </HealthDataContext.Provider>
    );
};

async function fetchBaseData() {
    return new Promise<HealthData>((resolve, reject) => {
        AppleHealthKit.initHealthKit(permissions, (error?: string) => {
            if (error) {
                console.error("HealthKit init error", error);
                return reject(error);
            }

            const fetchAllData = async () => {
                try {
                    const todayISO = new Date().toISOString();
                    const todayStartDateISO = new Date().toISOString().split("T")[0];
                    const sevenDaysAgoISO = new Date(
                        Date.now() - 7 * 24 * 60 * 60 * 1000
                    ).toISOString();
                    const twentyFourHoursAgoISO = new Date(
                        Date.now() - 24 * 3600 * 1000
                    ).toISOString();

                    // Sleep
                    const sleepOptions = {
                        startDate: sevenDaysAgoISO,
                        endDate: todayISO,
                    };
                    const sleep = await new Promise<HealthValue[]>((res, rej) => {
                        AppleHealthKit.getSleepSamples(sleepOptions, (err, results) => {
                            if (err) return rej(err);
                            res(results);
                        });
                    });
                    const totalSleep = sleep.reduce(
                        (sum: number, s: HealthValue) =>
                            sum +
                            (new Date(s.endDate).getTime() -
                                new Date(s.startDate).getTime()) /
                                1000 /
                                3600,
                        0
                    );

                    // Steps
                    const stepOptions = {
                        startDate: todayStartDateISO, // Get steps for today
                        // endDate: todayISO, // endDate is optional for getStepCount for "today"
                    };
                    const steps = await new Promise<HealthValue>((res, rej) => {
                        AppleHealthKit.getStepCount(stepOptions, (err, result) => {
                            if (err) return rej(err);
                            res(result);
                        });
                    });

                    // Heart Rate
                    const hrOptions = {
                        startDate: twentyFourHoursAgoISO,
                        endDate: todayISO,
                    };
                    const hr = await new Promise<HealthValue[]>((res, rej) => {
                        AppleHealthKit.getRestingHeartRateSamples(
                            hrOptions,
                            (err, results) => {
                                if (err) return rej(err);
                                res(results);
                            }
                        );
                    });
                    const restingHR = hr.length ? hr[0].value : 0;

                    // Calories
                    const calorieOptions = {
                        startDate: todayStartDateISO,
                        endDate: todayISO,
                    };
                    const calories = await new Promise<HealthValue[]>((res, rej) => {
                        AppleHealthKit.getActiveEnergyBurned(
                            calorieOptions,
                            (err, results) => {
                                if (err) return rej(err);
                                // getActiveEnergyBurned returns an array, sum them up for the day
                                res(results);
                            }
                        );
                    });
                    const totalCaloriesBurned = calories.reduce(
                        (sum, record) => sum + record.value,
                        0
                    );

                    // SpO2
                    const spo2Options = {
                        startDate: twentyFourHoursAgoISO,
                        endDate: todayISO,
                    };
                    const spo2 = await new Promise<HealthValue[]>((res, rej) => {
                        AppleHealthKit.getOxygenSaturationSamples(
                            spo2Options,
                            (err, results) => {
                                if (err) return rej(err);
                                res(results);
                            }
                        );
                    });
                    const latestSpO2 = spo2.length ? spo2[0].value : 0;

                    // HRV
                    const hrvOptions = {
                        startDate: sevenDaysAgoISO, // Fetch for past 7 days for consistency/recovery
                        endDate: todayISO,
                    };
                    const hrvSamples = await new Promise<HealthValue[]>((res, rej) => {
                        AppleHealthKit.getHeartRateVariabilitySamples(
                            hrvOptions,
                            (err, results) => {
                                if (err) return rej(err);
                                res(results);
                            }
                        );
                    });
                    const hrvValues = hrvSamples.map((s) => s.value);

                    const sleepSamplesForConsistency = sleep.map(
                        (s) => new Date(s.startDate)
                    );
                    const sleepConsistency = calculateSleepConsistency(
                        sleepSamplesForConsistency
                    );
                    const recoveryScore = calculateRecoveryScore(hrvValues);
                    const strainScore = calculateStrainScore(totalCaloriesBurned);
                    const stressLevel = calculateStressLevelFromHRV(hrvValues);

                    resolve({
                        sleepHours: parseFloat(totalSleep.toFixed(2)),
                        sleepPerformance: Math.min(100, (totalSleep / 8) * 100),
                        sleepConsistency,
                        recoveryScore,
                        strainScore: strainScore,
                        restingHeartRate: restingHR,
                        steps: steps.value,
                        caloriesBurned: totalCaloriesBurned,
                        bloodOxygen: latestSpO2,
                        stressLevel,
                        hrvValues,
                    });
                } catch (fetchError) {
                    console.error("HealthKit data fetch error", fetchError);
                    reject(fetchError);
                }
            };

            fetchAllData();
        });
    });
}

const calculateStrainScore = (activeCalories: number): number => {
    const strain = (activeCalories / 1000) * 100;
    return Math.min(100, parseFloat(strain.toFixed(1)));
};

const calculateStressLevelFromHRV = (hrvData: number[]): number => {
    if (hrvData.length === 0) return 0;
    const recovery = calculateRecoveryScore(hrvData);
    return parseFloat((100 - recovery).toFixed(1));
};

//////////////////////////////////////
// 1. Sleep Efficiency
// total asleep time ÷ time in bed × 100
//////////////////////////////////////
function calculateSleepEfficiency(samples: SleepSample[]): number {
    let totalInBed = 0;
    let totalAsleep = 0;

    for (const s of samples) {
        const inBedSec = (s.inBedEnd.getTime() - s.inBedStart.getTime()) / 1000;
        const asleepSec = (s.asleepEnd.getTime() - s.asleepStart.getTime()) / 1000;
        totalInBed += inBedSec;
        totalAsleep += asleepSec;
    }

    if (totalInBed === 0) return 0;
    return parseFloat(((totalAsleep / totalInBed) * 100).toFixed(1));
}

//////////////////////////////////////
// 2. Sleep Consistency
// 100 − normalized SD of bedtimes across days
//////////////////////////////////////
function calculateSleepConsistency(bedTimes: Date[]): number {
    const msSinceMidnight = bedTimes.map((d) => {
        return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    });
    const mean = msSinceMidnight.reduce((a, b) => a + b, 0) / msSinceMidnight.length;
    const variance =
        msSinceMidnight.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) /
        msSinceMidnight.length;
    const sd = Math.sqrt(variance);

    // assume a maximum tolerable SD of 3 hours (10 800 s) maps to consistency=0%
    const maxSd = 3 * 3600;
    const consistency = Math.max(0, 100 - (sd / maxSd) * 100);
    return parseFloat(consistency.toFixed(1));
}

//////////////////////////////////////
// 3. Recovery Score (HRV normalization)
// map HRV (SDNN) into 0–100 scale by observed min/max
//////////////////////////////////////
function calculateRecoveryScore(hrvValues: number[]): number {
    if (hrvValues.length === 0) return 0;
    const minHRV = Math.min(...hrvValues);
    const maxHRV = Math.max(...hrvValues);
    const latest = hrvValues[hrvValues.length - 1];
    if (maxHRV === minHRV) return 100;
    const score = ((latest - minHRV) / (maxHRV - minHRV)) * 100;
    return parseFloat(score.toFixed(1));
}

//////////////////////////////////////
// 4. Training Load (Strain)
// sum of (METs × duration_hours) or simply energy burned
//////////////////////////////////////
function calculateTrainingLoad(activities: ActivitySample[]): number {
    let load = 0;
    activities.forEach((a) => {
        const hours = (a.end.getTime() - a.start.getTime()) / (1000 * 3600);
        load += a.mets * hours;
    });
    return parseFloat(load.toFixed(1));
}

//////////////////////////////////////
// 5. Stress Index
// inverse of HRV: higher when HRV low
//////////////////////////////////////
function calculateStressIndex(hrvValues: number[]): number {
    if (hrvValues.length === 0) return 0;
    // e.g., stress = 100 − recoveryScore
    const recovery = calculateRecoveryScore(hrvValues);
    return parseFloat((100 - recovery).toFixed(1));
}

//////////////////////////////////////
// 6. Pearson Correlation
// between two metrics, e.g., sleep vs. stress
//////////////////////////////////////
function pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let num = 0,
        denX = 0,
        denY = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }
    const denom = Math.sqrt(denX * denY);
    return denom === 0 ? 0 : parseFloat((num / denom).toFixed(3));
}

interface SleepSample {
    inBedStart: Date;
    inBedEnd: Date;
    asleepStart: Date;
    asleepEnd: Date;
}

interface ActivitySample {
    start: Date;
    end: Date;
    mets: number;
    energyBurned: number;
}

function calculateSecondary(hd: HealthData) {
    const sleepSamples: SleepSample[] = hdToSleepSample(hd);
    const hrvValues: number[] = hd.hrvValues;
    const activities: ActivitySample[] = hdToActivitySamples(hd);

    console.log("Sleep Efficiency:", calculateSleepEfficiency(sleepSamples), "%");

    const bedTimes = sleepSamples.map((s) => s.inBedStart);
    console.log("Sleep Consistency:", calculateSleepConsistency(bedTimes), "%");

    console.log("Recovery Score:", calculateRecoveryScore(hrvValues), "/100");
    console.log("Stress Index:", calculateStressIndex(hrvValues), "/100");

    console.log("Training Load:", calculateTrainingLoad(activities), "MET·h");

    // Correlate sleep hours vs. stress index across days:
    const dailySleep = sleepSamples.map(
        (s) => (s.asleepEnd.getTime() - s.asleepStart.getTime()) / 1000 / 3600
    );
    const dailyStress = hrvValues.map((_) => calculateStressIndex(hrvValues));
    console.log("Sleep-Stress Correlation:", pearsonCorrelation(dailySleep, dailyStress));
}

function hdToSleepSample(hd: HealthData): SleepSample {
    return {
        inBedStart: new Date(hd.startDate),
        inBedEnd: new Date(hd.endDate),
        asleepStart: new Date(hd.startDate),
        asleepEnd: new Date(hd.endDate),
    };
}
