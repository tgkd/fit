import i18n from "@/lib/i18n";
import { Stack } from "expo-router";

export default function WorkoutsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: i18n.t("workouts.title"),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          // Dynamic title will be set in the component
        }}
      />
    </Stack>
  );
}
