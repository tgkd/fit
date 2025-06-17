import React, { use } from "react";
import { StyleSheet } from "react-native";

import { LastNightSleepDetails } from "@/components/charts/LastNightSleepDetails";
import { SleepPerformanceChart } from "@/components/charts/SleepPerformanceChart";
import { SleepMetricsList } from "@/components/sleep/SleepMetricsList";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { ThemedScrollView } from "@/components/ui/ThemedScrollView";
import { HealthDataContext } from "@/context/HealthDataContext";
import i18n from "@/lib/i18n";

export default function SleepScreen() {
  const { data } = use(HealthDataContext);

  console.log("Sleep data:", data.sleep);

  return (
    <ThemedScrollView paddingTop={16}>
      <ThemedText type="defaultSemiBold" size="md" textAlign="center">
        {i18n.t("sleep.today")}
      </ThemedText>

      <Card style={styles.chartCard}>
        <SleepPerformanceChart
          percentage={data.sleep.sleepPerformance}
          size={220}
        />
      </Card>
      <Card>
        <SleepMetricsList metrics={data.sleep.metrics} />
      </Card>
      <Card>
        <LastNightSleepDetails lastNight={data.sleep.lastNight} />
      </Card>
    </ThemedScrollView>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    alignItems: "center",
  },
});
