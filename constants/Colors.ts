/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    groupedBackground: '#F2F2F7', // iOS light gray background
    secondaryBackground: '#EFEFF4', // iOS secondary background
    tint: '#007AFF', // iOS blue
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#007AFF',
    cardBackground: '#FFFFFF', // iOS white card background
    cardBorder: '#D1D1D6', // iOS light gray border
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    groupedBackground: '#1C1C1E', // iOS dark gray background
    secondaryBackground: '#2C2C2E', // iOS dark secondary background
    tint: '#0A84FF', // iOS blue (dark mode)
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#0A84FF',
    cardBackground: '#1C1C1E', // iOS dark card background
    cardBorder: '#3A3A3C', // iOS dark gray border
  },
  charts: {
    sleep: '#32ADE6', // iOS blue variant
    recovery: '#34C759', // iOS green
    strain: '#FF3B30', // iOS red
    stress: '#FF9500', // iOS orange
    chartBackground: '#1C1C1E', // iOS dark gray
  },
};
