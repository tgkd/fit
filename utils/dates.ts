import { formatISO, startOfDay } from "date-fns";

export function bucketBy<T extends { startDate: Date }>(
  samples: readonly T[],
  by: "hour" | "day" | "month" | "year"
): Record<string, T[]> {
  return samples.reduce<Record<string, T[]>>((acc, s) => {
    let key: string;
    switch (by) {
      case "hour":
        // Format the key to represent the hour only, e.g., "09:00"
        const hours = s.startDate.getHours();
        key = `${String(hours).padStart(2, '0')}:00`;
        break;
      case "day":
        key = formatISO(startOfDay(s.startDate), { representation: "date" });
        break;
      case "month":
        key = formatISO(s.startDate, { representation: "date" }).slice(0, 7);
        break;
      case "year":
        key = formatISO(s.startDate, { representation: "date" }).slice(0, 4);
        break;
      default:
        throw new Error(`Unsupported bucket type: ${by}`);
    }
    (acc[key] ??= []).push(s);
    return acc;
  }, {});
}

/** Mean of numeric array (guarded). */
export const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

/** Population standard deviation (guarded). */
export const sd = (xs: number[]): number => {
  const m = mean(xs);
  return xs.length ? Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) : 0;
};
