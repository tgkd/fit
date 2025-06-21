import type { QuantitySample } from "@kingstinct/react-native-healthkit";
import { queryQuantitySamples } from "@kingstinct/react-native-healthkit/lib/commonjs/index.ios.js";
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
    "HKQuantityTypeIdentifierHeartRate",
    {
      filter: { startDate: start, endDate: end },
      unit: "count/min",
      limit: 1000,
    }
  );

  const groups = bucketBy(hrSamples, "hour");

  const hrMax = 220 - (ageYears ?? 30);
  const zoneBounds = [0.5, 0.6, 0.7, 0.8, 1].map((p) => p * hrMax);

  return Object.entries(groups).map(([date, arr]) => {
    const samples = arr as QuantitySample[];
    const bpm = samples.map((s: QuantitySample) => s.quantity);
    const avg = mean(bpm);
    const min = Math.min(...bpm);
    const max = Math.max(...bpm);

    const resting =
      samples.find((s: QuantitySample) => s.metadata?.HKAverageMETs === 0)
        ?.quantity ?? bpm[Math.floor(bpm.length * 0.05)];

    const zoneMinutes = new Array(5).fill(0);
    samples.forEach((s: QuantitySample) => {
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

/*
OUTPUT EXAMPLE:
Heart Metrics: [{"avgBpm": 109.7, "date": "11:00", "maxBpm": 123, "minBpm": 86, "restingBpm": 115, "timeInZone": [0, 0, 0, 0, 0]}, {"avgBpm": 108.5, "date": "10:00", "maxBpm": 126, "minBpm": 71, "restingBpm": 116, "timeInZone": [0, 0, 0, 0, 0]}, {"avgBpm": 107.2, "date": "08:00", "maxBpm": 126, "minBpm": 86, "restingBpm": 105, "timeInZone": [0, 0, 0, 0, 0]}, {"avgBpm": 109, "date": "07:00", "maxBpm": 119, "minBpm": 97, "restingBpm": 114, "timeInZone": [0, 0, 0, 0, 0]}]
*/
