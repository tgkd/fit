import React, { use } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LastNightSleepDetails } from "@/components/charts/LastNightSleepDetails";
import { SleepMetricsList } from "@/components/charts/SleepMetricsList";
import { SleepPerformanceChart } from "@/components/charts/SleepPerformanceChart";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { HealthDataContext } from "@/context/HealthDataContext";
import i18n from "@/lib/i18n";

export default function SleepScreen() {
  const { data } = use(HealthDataContext);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollView}
      showsVerticalScrollIndicator={false}
    >
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <ThemedText style={styles.header}>{i18n.t("sleep.today")}</ThemedText>
        <Card style={styles.header}>
          <SleepPerformanceChart
            percentage={data.sleepPerformance}
            size={220}
          />
        </Card>
        <Card>
          <SleepMetricsList metrics={data.metrics} />
        </Card>

        <Card>
          <LastNightSleepDetails lastNight={data.lastNight} />
        </Card>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    rowGap: 16,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    textAlign: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
    opacity: 0.8,
  },
});
