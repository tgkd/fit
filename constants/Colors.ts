/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#007AFF"; // iOS blue
const tintColorDark = "#0A84FF"; // iOS blue dark mode

export const Colors = {
  light: {
    text: "#000000",
    textSecondary: "#3C3C43",
    background: "#FFFFFF",
    groupedBackground: "#F2F2F7", // iOS light gray background
    secondaryBackground: "#EFEFF4", // iOS secondary background
    tint: "#007AFF", // iOS blue
    icon: "#8E8E93",
    tabIconDefault: "#8E8E93",
    tabIconSelected: "#007AFF",
    cardBackground: "#FFFFFF", // iOS white card background
    cardBorder: "#D1D1D6", // iOS light gray border
    accent: tintColorLight,
    link: tintColorLight,
    border: "#D1D1D6", // iOS light gray border
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#EBEBF5",
    background: "#000000",
    groupedBackground: "#1C1C1E", // iOS dark gray background
    secondaryBackground: "#2C2C2E", // iOS dark secondary background
    tint: "#0A84FF", // iOS blue (dark mode)
    icon: "#8E8E93",
    tabIconDefault: "#8E8E93",
    tabIconSelected: "#0A84FF",
    cardBackground: "#1C1C1E", // iOS dark card background
    cardBorder: "#3A3A3C", // iOS dark gray border
    accent: tintColorDark,
    link: tintColorDark,
    border: "#3A3A3C", // iOS dark gray border
  },
  charts: {
    sleep: "#007AFF", // iOS blue
    recovery: "#34C759", // iOS green
    strain: "#FF9500", // iOS orange
    stress: "#FF3B30", // iOS red
    chartBackground: "#F2F2F7", // iOS light gray background for charts
  },
  sleep: {
    awake: "#666666",
    light: "#A8C5E5",
    deep: "#E91E63",
    rem: "#9C27B0",
    performance: {
      excellent: "#00E676",
      good: "#FFEB3B",
      poor: "#FF9800",
    },
  },
  hrv: {
    excellent: "#00E676", // Green
    good: "#FFEB3B", // Yellow
    poor: "#FF9800", // Orange
    veryPoor: "#F44336", // Red
  },
};
