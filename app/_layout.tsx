import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HealthDataProvider } from "@/context/HealthDataContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import "@/lib/i18n"; // Initialize i18n

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    "Hikasami-Regular": require("../assets/fonts/Hikasami-Regular.ttf"),
    "Hikasami-Medium": require("../assets/fonts/Hikasami-Medium.ttf"),
    "Hikasami-SemiBold": require("../assets/fonts/Hikasami-SemiBold.ttf"),
    "Hikasami-Bold": require("../assets/fonts/Hikasami-Bold.ttf"),
    "Disket-Mono-Regular": require("../assets/fonts/Disket-Mono-Regular.ttf"),
    "Disket-Mono-Bold": require("../assets/fonts/Disket-Mono-Bold.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <SafeAreaProvider>
      <HealthDataProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
            <Stack.Screen
              name="hrv"
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </HealthDataProvider>
    </SafeAreaProvider>
  );
}
