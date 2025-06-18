import { bucketBy, mean, sd } from "@/utils/dates";
import { queryQuantitySamples } from "@kingstinct/react-native-healthkit";
import { sub } from "date-fns";

export interface BaselineVitals {
  hrMean: number;
  hrSd: number;
  hrvMean: number;
  hrvSd: number;
}

export async function getBaselineVitals(): Promise<BaselineVitals> {
  const end = new Date();
  const start = sub(end, { days: 14 });

  const hrSamples = await queryQuantitySamples(
    "HKQuantityTypeIdentifierHeartRate",
    {
      filter: { startDate: start, endDate: end },
    }
  );

  const restfulHr: number[] = [];
  Object.values(bucketBy(hrSamples, "day")).forEach((arr) => {
    arr.sort((a, b) => a.quantity - b.quantity);
    restfulHr.push(
      ...arr
        .slice(0, Math.max(1, Math.floor(arr.length * 0.2)))
        .map((s) => s.quantity)
    );
  });

  /* -------- HRV (overnight SDNN) -------------------------------------- */
  const hrvSamples = await queryQuantitySamples(
    "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
    {
      filter: { startDate: start, endDate: end },
    }
  );

  return {
    hrMean: mean(restfulHr),
    hrSd: sd(restfulHr) || 1,
    hrvMean: mean(hrvSamples.map((s) => s.quantity)),
    hrvSd: sd(hrvSamples.map((s) => s.quantity)) || 1,
  };
}
