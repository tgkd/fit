import i18n from "@/lib/i18n";
import { Stack } from "expo-router";

export default function WorkoutsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: i18n.t("workouts.title"),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
      />
    </Stack>
  );
}
