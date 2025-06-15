import React, { use } from "react";
import { StyleSheet } from "react-native";

import { LastNightSleepDetails } from "@/components/charts/LastNightSleepDetails";
import { SleepMetricsList } from "@/components/charts/SleepMetricsList";
import { SleepPerformanceChart } from "@/components/charts/SleepPerformanceChart";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { ThemedScrollView } from "@/components/ui/ThemedScrollView";
import { HealthDataContext } from "@/context/HealthDataContext";
import i18n from "@/lib/i18n";

export default function SleepScreen() {
  const { data } = use(HealthDataContext);

  return (
    <ThemedScrollView>
      <ThemedText type="defaultSemiBold" size="md" textAlign="center">
        {i18n.t("sleep.today")}
      </ThemedText>

      <Card style={styles.chartCard}>
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
    </ThemedScrollView>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    alignItems: "center",
  },
});
