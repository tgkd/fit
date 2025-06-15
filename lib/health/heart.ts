import {
  HKQuantityTypeIdentifier,
  queryQuantitySamples,
} from "@kingstinct/react-native-healthkit";
import { differenceInMinutes, endOfDay, startOfDay } from "date-fns";

import { bucketBy, mean } from "@/utils/dates";

export interface DailyHeartMetrics {
  date: string;
  avgBpm: number;
  restingBpm: number;
  minBpm: number;
  maxBpm: number;
  timeInZone: number[];
}

export async function fetchDailyHeartMetrics(
  day: Date,
  ageYears: number | null
): Promise<DailyHeartMetrics[]> {
  const start = startOfDay(day);
  const end = endOfDay(day);

  const hrSamples = await queryQuantitySamples(
    HKQuantityTypeIdentifier.heartRate,
    {
      from: start,
      to: end,
      unit: "count/min",
      limit: 1000,
    }
  );

  const groups = bucketBy(hrSamples, "hour");

  const hrMax = 220 - (ageYears ?? 30);
  const zoneBounds = [0.5, 0.6, 0.7, 0.8, 1].map((p) => p * hrMax);

  return Object.entries(groups).map(([date, arr]) => {
    const bpm = arr.map((s) => s.quantity);
    const avg = mean(bpm);
    const min = Math.min(...bpm);
    const max = Math.max(...bpm);

    const resting =
      arr.find((s) => s.metadata?.HKAverageMETs === 0)?.quantity ??
      bpm[Math.floor(bpm.length * 0.05)];

    const zoneMinutes = new Array(5).fill(0);
    arr.forEach((s) => {
      const zone = zoneBounds.findIndex((b) => s.quantity < b);
      const mins = differenceInMinutes(s.endDate, s.startDate);
      zoneMinutes[Math.max(zone, 0)] += mins;
    });

    return {
      date,
      avgBpm: +avg.toFixed(1),
      restingBpm: +resting.toFixed(1),
      minBpm: min,
      maxBpm: max,
      timeInZone: zoneMinutes,
    };
  });
}
