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
    sleep: "#005BBB", // Darker blue for better contrast
    recovery: "#2BA349", // Darker green
    strain: "#4CAF50", // Darker orange
    stress: "#CC2F26", // Darker red
    chartBackground: "#F2F2F7", // iOS light gray background for charts
    primary: "#007AFF", // iOS blue
    positive: "#00C853", // Green for positive trends
    negative: "#F57C00", // Orange for negative trends
    neutral: "#8E8E93", // Gray for neutral trends
    // Beautiful sleep trends palette
    sleepCurrent: "#023047", // Dark blue for current values
    sleep14Days: "#219EBC", // Medium blue for 14-day averages
    sleep30Days: "#8ECAE6", // Light blue for 30-day averages
    sleepAccent: "#FFB703", // Yellow for highlights
    sleepWarm: "#FB8500", // Orange for emphasis
  },
  sleep: {
    awake: "#4A4A4A", // Darker gray for better contrast
    light: "#5B9BD5", // Darker blue
    deep: "#C1185A", // Darker pink
    rem: "#7B1FA2", // Darker purple
    performance: {
      excellent: "#00C853", // Darker green
      good: "#F9A825", // Darker yellow
      poor: "#F57C00", // Darker orange
    },
  },
  hrv: {
    excellent: "#00C853", // Darker green
    good: "#F9A825", // Darker yellow
    poor: "#F57C00", // Darker orange
    veryPoor: "#D32F2F", // Darker red
  },
};
