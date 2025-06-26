import React, { use } from "react";
import { StyleSheet } from "react-native";

import { LastNightSleepDetails } from "@/components/charts/LastNightSleepDetails";
import { SleepPerformanceChart } from "@/components/charts/SleepPerformanceChart";
import { SleepTrendsChart } from "@/components/charts/SleepTrendsChart";
import { SleepMetricsList } from "@/components/sleep/SleepMetricsList";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { ThemedScrollView } from "@/components/ui/ThemedScrollView";
import { HealthDataContext } from "@/context/HealthDataContext";

export default function SleepScreen() {
  const { data, date, formatDate } = use(HealthDataContext);

  return (
    <ThemedScrollView paddingTop={16}>
      <ThemedText type="defaultSemiBold" size="md" textAlign="center">
        {formatDate(date)}
      </ThemedText>

      <Card style={styles.chartCard}>
        <SleepPerformanceChart
          percentage={data.sleep.overallPerformance}
          size={220}
        />
      </Card>
      <Card>
        <SleepMetricsList metrics={data.sleep} />
      </Card>
      <Card>
        <SleepTrendsChart
          currentSleep={data.sleep}
          sleepAverages={data.sleepAverages}
        />
      </Card>
      <Card>
        <LastNightSleepDetails sleep={data.sleep} />
      </Card>
    </ThemedScrollView>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    alignItems: "center",
  },
});
