import React, { use } from "react";
import { StyleSheet, View } from "react-native";

import { LastNightSleepDetails } from "@/components/charts/LastNightSleepDetails";
import { StressChart } from "@/components/charts/StressChart";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
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

        {/* Stress Metrics Grid */}
        <View style={styles.metricsContainer}>
          <ThemedView style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <IconSymbol name="sun.max.fill" size={18} color={textSecondary} />
              <ThemedText size="sm" textAlign="center">
                {i18n.t("hrvScreen.totalDay")}
              </ThemedText>
            </View>
            <ThemedText
              type="title"
              size="lg"
              style={[
                { color: getStressColor(data.stressDetails.totalDayStress) },
              ]}
            >
              {data.stressDetails.totalDayStress.toFixed(1)}
            </ThemedText>
            <ThemedText type="secondary" size="xs">
              {getStressLabel(data.stressDetails.totalDayStress)}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <IconSymbol name="moon.fill" size={18} color={textSecondary} />
              <ThemedText size="sm" textAlign="center">
                {i18n.t("hrvScreen.sleep")}
              </ThemedText>
            </View>
            <ThemedText
              type="title"
              size="lg"
              style={[
                { color: getStressColor(data.stressDetails.sleepStress) },
              ]}
            >
              {data.stressDetails.sleepStress.toFixed(1)}
            </ThemedText>
            <ThemedText type="secondary" size="xs">
              {getStressLabel(data.stressDetails.sleepStress)}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <IconSymbol name="figure.walk" size={18} color={textSecondary} />
              <ThemedText size="sm" textAlign="center">
                {i18n.t("hrvScreen.daily")}
              </ThemedText>
            </View>
            <ThemedText
              type="title"
              size="lg"
              style={[
                {
                  color: getStressColor(data.stressDetails.nonActivityStress),
                },
              ]}
            >
              {data.stressDetails.nonActivityStress.toFixed(1)}
            </ThemedText>
            <ThemedText type="secondary" size="xs">
              {getStressLabel(data.stressDetails.nonActivityStress)}
            </ThemedText>
          </ThemedView>
        </View>

        {/* Sleep Quality Section */}
        {data.sleep && (
          <Card>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" size="lg">
                {i18n.t("sleepChart.lastNight")}
              </ThemedText>
            </View>

            <View style={styles.sleepMetricsRow}>
              <View style={styles.sleepMetric}>
                <ThemedText type="secondary" size="sm">
                  {i18n.t("sleepChart.totalSleep")}
                </ThemedText>
                <ThemedText type="defaultSemiBold" size="md">
                  {data.sleep.totalSleepTime}
                </ThemedText>
              </View>
              <View style={styles.sleepMetric}>
                <ThemedText type="secondary" size="sm">
                  {i18n.t("sleepChart.efficiency")}
                </ThemedText>
                <ThemedText type="defaultSemiBold" size="md">
                  {data.sleep.sleepEfficiency}%
                </ThemedText>
              </View>
              <View style={styles.sleepMetric}>
                <ThemedText type="secondary" size="sm">
                  {i18n.t("sleepChart.performance")}
                </ThemedText>
                <ThemedText type="defaultSemiBold" size="md">
                  {data.sleep.overallPerformance}%
                </ThemedText>
              </View>
            </View>

            <LastNightSleepDetails lastNight={data.sleep} />
          </Card>
        )}
      </>
    </ThemedScrollView>
  );
}

function getStressLabel(stressValue: number): string {
  if (stressValue < 1.0) return i18n.t("stressChart.low");
  if (stressValue < 2.0) return i18n.t("stressChart.mild");
  if (stressValue < 2.5) return i18n.t("stressChart.moderate");
  return i18n.t("stressChart.high");
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
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    rowGap: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 120,
    justifyContent: "center",
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
