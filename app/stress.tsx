import React, { use } from "react";
import { StyleSheet, View } from "react-native";

import { StressChart } from "@/components/charts/StressChart";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { ThemedScrollView } from "@/components/ui/ThemedScrollView";
import { HealthDataContext } from "@/context/HealthDataContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getStressColor } from "@/lib/health/heartAndStress";
import i18n from "@/lib/i18n";

export default function StressScreen() {
  const { data } = use(HealthDataContext);
  const textSecondary = useThemeColor({}, "textSecondary");

  if (!data.stressDetails) {
    return (
      <Card style={styles.emptyStateCard}>
        <View style={styles.emptyStateContainer}>
          <IconSymbol name="chart.bar.xaxis" size={48} color={textSecondary} />
          <ThemedText type="subtitle" size="xl" textAlign="center">
            {i18n.t("stressMonitor.enhancedStressAnalysis")}
          </ThemedText>
          <ThemedText size="md" textAlign="center">
            {i18n.t("hrvScreen.stressDataUnavailable", {
              stressLevel: data.stressLevel,
            })}
          </ThemedText>
          <ThemedText type="secondary" size="sm" textAlign="center">
            {i18n.t("hrvScreen.requires14DaysData")}
          </ThemedText>
        </View>
      </Card>
    );
  }

  return (
    <ThemedScrollView style={styles.container}>
      {/* Header Section */}
      <View>
        <ThemedText type="title" size="xl" textAlign="center">
          {i18n.t("stressMonitor.enhancedStressAnalysis")}
        </ThemedText>
        <ThemedText type="secondary" size="sm" textAlign="center">
          {i18n.t("hrvScreen.basedOnPersonalBaselines")}
        </ThemedText>
      </View>

      {/* Current Stress Overview */}
      <Card>
        <View style={styles.currentStressContainer}>
          <ThemedText
            type="title"
            style={[
              { color: getStressColor(data.stressDetails.totalDayStress) },
            ]}
          >
            {data.stressDetails.totalDayStress.toFixed(1)}
          </ThemedText>
          <ThemedText type="secondary" size="sm">
            {i18n.t("hrvScreen.outOf3")}
          </ThemedText>
        </View>

        <ThemedText type="secondary" size="xs" textAlign="center">
          {data.stressChartDisplayData?.lastUpdatedDisplay
            ? i18n.t("stressMonitor.lastUpdated", {
                time: data.stressChartDisplayData.lastUpdatedDisplay,
              })
            : i18n.t("stressMonitor.dataRefreshing")}
        </ThemedText>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" size="lg" textAlign="center">
            {i18n.t("hrvScreen.personalBaselines")}
          </ThemedText>
        </View>

        <View style={styles.baselineRow}>
          <View style={styles.baselineItem}>
            <ThemedText type="secondary" size="sm">
              {i18n.t("hrvScreen.hrvBaseline")}
            </ThemedText>
            <ThemedText type="defaultSemiBold" size="md">
              {data.stressDetails.baselineHRV.toFixed(1)} ms
            </ThemedText>
          </View>
          <View style={styles.baselineItem}>
            <ThemedText type="secondary" size="sm">
              {i18n.t("hrvScreen.rhrBaseline")}
            </ThemedText>
            <ThemedText type="defaultSemiBold" size="md">
              {data.stressDetails.baselineRHR.toFixed(0)} bpm
            </ThemedText>
          </View>
        </View>
      </Card>

      <>
        {/* Detailed Stress Chart */}
        {data.stressChartDisplayData && <StressChart data={data} />}
      </>
    </ThemedScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  currentStressContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  sleepMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  sleepMetric: {
    alignItems: "center",
  },

  baselineRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  baselineItem: {
    alignItems: "center",
  },
  emptyStateCard: {
    marginTop: 60,
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
});
