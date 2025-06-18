// Shared utility functions for health modules
import { endOfDay, format, startOfDay, subDays, subWeeks } from "date-fns";

/**
 * Get date ranges relative to a specific target date
 * This is the date-aware version for historical data queries
 */
export const getDateRanges = (targetDate: Date) => {
  const now = new Date(targetDate);
  const startOfTargetDay = startOfDay(now);
  const endOfTargetDay = endOfDay(now);
  const oneDayAgo = subDays(now, 1);
  const oneWeekAgo = subWeeks(now, 1);

  return {
    now,
    startOfTargetDay,
    endOfTargetDay,
    oneDayAgo,
    oneWeekAgo,
  };
};

/**
 * Get current date ranges (for backward compatibility)
 */
export const getCurrentDateRanges = () => {
  const ranges = getDateRanges(new Date());
  return {
    now: ranges.now,
    startOfToday: ranges.startOfTargetDay,
    oneDayAgo: ranges.oneDayAgo,
    oneWeekAgo: ranges.oneWeekAgo,
  };
};

/** Get date ranges for longer periods */
export const getExtendedDateRanges = (targetDate?: Date) => {
  const now = targetDate ? new Date(targetDate) : new Date();
  const startOfTargetDay = startOfDay(now);
  const endOfTargetDay = endOfDay(now);
  const fourteenDaysAgo = subDays(now, 14);
  const oneMonthAgo = subDays(now, 30);

  return {
    now,
    startOfToday: startOfTargetDay,
    startOfTargetDay,
    endOfTargetDay,
    fourteenDaysAgo,
    oneMonthAgo,
  };
};

/** Format hour for display (e.g., "4 AM", "5 PM") */
export const formatHourDisplay = (date: Date): string => {
  return format(date, "h a");
};

/** Format date for display (e.g., "Jun 15", "Dec 3") */
export const formatDateDisplay = (date: Date): string => {
  return format(date, "MMM d");
};

/** Format time for display (e.g., "3:45 PM") */
export const formatTimeDisplay = (date: Date): string => {
  return format(date, "h:mm a");
};

/** Create hour start date for a given hour (0-23) */
export const createHourStart = (baseDate: Date, hour: number): Date => {
  const hourStart = startOfDay(baseDate);
  hourStart.setHours(hour);
  return hourStart;
};

/** Normalize value v between [min, max] → 0–100, clamped */
export const normalize = (v: number, min: number, max: number): number => {
  if (max === min) return 100;
  const normalized = ((v - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
};

/** Normalize value v between [min, max] → 0–1, clamped */
export const normalizeTo01 = (v: number, min: number, max: number): number => {
  if (max === min) return 1;
  const normalized = (v - min) / (max - min);
  return Math.max(0, Math.min(1, normalized));
};

/** Convert 0-1 value to percentage */
export const toPercentage = (value: number): number => {
  return Math.max(0, Math.min(100, value * 100));
};

/** Convert milliseconds to hours */
export const msToHours = (ms: number): number => {
  return ms / (1000 * 60 * 60);
};

/** Convert milliseconds to minutes */
export const msToMinutes = (ms: number): number => {
  return ms / (1000 * 60);
};

/** Calculate duration between two dates in minutes */
export const getDurationMinutes = (start: Date, end: Date): number => {
  return (end.getTime() - start.getTime()) / (1000 * 60);
};

/** Calculate duration between two dates in hours */
export const getDurationHours = (start: Date, end: Date): number => {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

/** Round number to specified decimal places */
export const roundTo = (num: number, decimals: number): number => {
  return parseFloat(num.toFixed(decimals));
};

/**
 * Calculate maximum heart rate using Tanaka formula (more accurate than 220-age)
 */
export const calculateHRMax = (age: number | null): number => {
  if (!age || age <= 0) return 190; // Default fallback
  return Math.round(207 - 0.7 * age);
};

/**
 * Get date range for specified number of days from a target date
 */
export const getDateRange = (days: number, targetDate?: Date): { from: Date; to: Date } => {
  const to = targetDate ? new Date(targetDate) : new Date();
  const from = subDays(to, days - 1); // Include target day
  return { from: startOfDay(from), to };
};

/**
 * Generate array of dates between start and end dates (inclusive)
 */
export const getDatesArray = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

/**
 * Calculate average of an array of numbers, filtering out null/undefined values
 */
export const calculateAverage = (values: (number | null | undefined)[]): number => {
  const validValues = values.filter((v): v is number => v != null && !isNaN(v));
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
};
