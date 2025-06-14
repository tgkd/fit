import React, { use } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LastNightSleepDetails } from "@/components/charts/LastNightSleepDetails";
import { SleepMetricsList } from "@/components/charts/SleepMetricsList";
import { SleepPerformanceChart } from "@/components/charts/SleepPerformanceChart";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { HealthDataContext } from "@/context/HealthDataContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import i18n from "@/lib/i18n";

export default function SleepScreen() {
  const { data } = use(HealthDataContext);
  const backgroundColor = useThemeColor({}, "background");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText>{i18n.t("sleep.today")}</ThemedText>
        </View>
        <View style={styles.header}>
          <SleepPerformanceChart
            percentage={data.sleepPerformance}
            size={220}
          />
        </View>
        <Card>
          <SleepMetricsList metrics={data.metrics} />
          <ThemedText>{i18n.t("sleep.performanceMessage")}</ThemedText>
        </Card>

        <Card>
          <LastNightSleepDetails lastNight={data.lastNight} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: "center",
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
    opacity: 0.8,
  },
});
