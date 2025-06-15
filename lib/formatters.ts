import { getLocales } from "expo-localization";

// Get user's locale, fallback to 'en-US'
const getUserLocale = (): string => {
  const locales = getLocales();
  return locales[0]?.languageTag ?? 'en-US';
};

/**
 * Format date for workout display
 * Returns day as string and month as abbreviated uppercase
 */
export const formatDateForWorkout = (date: Date) => {
  const locale = getUserLocale();
  const day = date.getDate().toString();
  const month = date.toLocaleDateString(locale, { month: 'short' }).toUpperCase();
  return { day, month };
};

/**
 * Format duration in minutes to readable format with user locale
 * Returns format like "1h 30m" or "45m" in user's locale
 */
export const formatDuration = (minutes: number): string => {
  const locale = getUserLocale();
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  try {
    // Use Intl.RelativeTimeFormat for locale-aware unit formatting
    const rtf = new Intl.RelativeTimeFormat(locale, {
      numeric: 'always',
      style: 'narrow'
    });

    if (hours > 0) {
      // Format hours and minutes separately and combine
      const hoursText = rtf.formatToParts(hours, 'hour')
        .find(part => part.type === 'literal')?.value || 'h';
      const minsText = rtf.formatToParts(mins, 'minute')
        .find(part => part.type === 'literal')?.value || 'm';

      return `${hours}${hoursText} ${mins}${minsText}`;
    } else {
      const minsText = rtf.formatToParts(mins, 'minute')
        .find(part => part.type === 'literal')?.value || 'm';
      return `${mins}${minsText}`;
    }
  } catch (error) {
    // Fallback to simple format if Intl.RelativeTimeFormat fails
    const hourUnit = getLocalizedTimeUnit(locale, 'hour');
    const minuteUnit = getLocalizedTimeUnit(locale, 'minute');
    return hours > 0 ? `${hours}${hourUnit} ${mins}${minuteUnit}` : `${mins}${minuteUnit}`;
  }
};

/**
 * Get localized time unit abbreviation
 */
const getLocalizedTimeUnit = (locale: string, unit: 'hour' | 'minute'): string => {
  const abbreviations: Record<string, Record<string, string>> = {
    'en': { hour: 'h', minute: 'm' },
    'ru': { hour: 'ч', minute: 'м' },
    'ja': { hour: '時間', minute: '分' },
    'de': { hour: 'Std', minute: 'Min' },
    'fr': { hour: 'h', minute: 'min' },
    'es': { hour: 'h', minute: 'min' },
    'it': { hour: 'h', minute: 'min' },
    'pt': { hour: 'h', minute: 'min' },
    'zh': { hour: '小时', minute: '分' },
    'ko': { hour: '시간', minute: '분' },
  };

  const languageCode = locale.split('-')[0];
  return abbreviations[languageCode]?.[unit] || abbreviations['en'][unit];
};

/**
 * Format duration in minutes to HH:MM format
 * Returns format like "1:30" or "0:45"
 */
export const formatDurationHHMM = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}:${mins.toString().padStart(2, "0")}`;
};

/**
 * Format date with day label for charts
 * Returns format like "Jan 15" using user's locale
 */
export const formatDateForChart = (date: Date): string => {
  const locale = getUserLocale();
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
};

/**
 * Format full date for workout details
 * Returns format like "Monday, January 15, 2024" using user's locale
 */
export const formatFullDate = (date: Date): string => {
  const locale = getUserLocale();
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format time for workout details
 * Returns format like "14:30" or "2:30 PM" based on user's locale
 */
export const formatTime = (date: Date): string => {
  const locale = getUserLocale();
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format number to percentage with locale-specific formatting
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  const locale = getUserLocale();
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

/**
 * Format number with locale-specific formatting
 */
export const formatNumber = (value: number, decimals: number = 0): string => {
  const locale = getUserLocale();
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format calories with locale-specific number formatting
 */
export const formatCalories = (calories: number): string => {
  const locale = getUserLocale();
  return new Intl.NumberFormat(locale).format(Math.round(calories));
};