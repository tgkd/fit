import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import i18n from "@/lib/i18n";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <ThemedText type="title">{i18n.t("settings.title")}</ThemedText>
          <ThemedText type="secondary">{i18n.t("settings.subtitle")}</ThemedText>
        </Card>

        <TouchableOpacity onPress={() => router.push("/profile-settings" as any)}>
          <Card>
            <ThemedText type="title">{i18n.t("settings.profile.title")}</ThemedText>
            <ThemedText type="secondary" size="sm" style={styles.subtitle}>
              {i18n.t("settings.profile.subtitle")}
            </ThemedText>
          </Card>
        </TouchableOpacity>

        <Card>
          <ThemedText type="title">{i18n.t("settings.healthDataTitle")}</ThemedText>
          <ThemedText type="secondary">{i18n.t("settings.healthDataSubtitle")}</ThemedText>
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
  subtitle: {
    marginTop: 4,
  },
});
