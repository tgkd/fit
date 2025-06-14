// Shared utility functions for health modules

export const getCurrentDateRanges = () => {
  const now = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return {
    now,
    startOfToday,
    oneDayAgo,
    oneWeekAgo,
  };
};

/** Normalize value v between [min, max] → 0–100 */
export const normalize = (v: number, min: number, max: number): number => {
  if (max === min) return 100;
  return ((v - min) / (max - min)) * 100;
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
