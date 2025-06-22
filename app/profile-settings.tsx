import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { NumberInput } from "@/components/ui/forms/NumberInput";
import { useHealthData } from "@/context/HealthDataContext";
import i18n from "@/lib/i18n";

export default function ProfileSettingsModal() {
  const { userParams, updateUserParams } = useHealthData();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title">{i18n.t("settings.profile.title")}</ThemedText>
        <ThemedText type="secondary">
          {i18n.t("settings.profile.subtitle")}
        </ThemedText>

        <Card>
          <NumberInput
            label={i18n.t("settings.profile.age")}
            value={userParams.age}
            onValueChange={(value) => updateUserParams({ age: value })}
            min={18}
            max={100}
            unit={i18n.t("settings.units.years")}
          />

          <NumberInput
            label={i18n.t("settings.profile.weight")}
            value={userParams.weight}
            onValueChange={(value) => updateUserParams({ weight: value })}
            min={40}
            max={200}
            unit={i18n.t("settings.units.kg")}
          />

          <NumberInput
            label={i18n.t("settings.profile.height")}
            value={userParams.height}
            onValueChange={(value) => updateUserParams({ height: value })}
            min={120}
            max={220}
            unit={i18n.t("settings.units.cm")}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 46,
    rowGap: 16,
  },
});
