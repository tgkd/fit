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
    "AlegreyaSC-Regular": require("../assets/fonts/AlegreyaSC-Regular.ttf"),
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
              name="profile-settings"
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="stress"
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="sleep"
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
