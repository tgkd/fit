import React, { use } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemedScrollView } from "@/components/ui/ThemedScrollView";
import { HealthDataContext } from "@/context/HealthDataContext";
import { getStressColor } from "@/lib/health";
import i18n from "@/lib/i18n";

export default function HRVScreen() {
  const { data } = use(HealthDataContext);

  return (
    <ThemedScrollView>
      {data.stressDetails && (
        <>
          <View style={styles.header}>
            <ThemedText type="subtitle" size="xl" style={styles.title}>
              {i18n.t("hrvScreen.enhancedStressAnalysis")}
            </ThemedText>
            <ThemedText type="secondary" size="md" style={styles.subtitle}>
              {i18n.t("hrvScreen.basedOnPersonalBaselines")}
            </ThemedText>
          </View>

          <View style={styles.metricsContainer}>
            <ThemedView style={styles.metricCard}>
              <ThemedText size="sm" style={styles.metricLabel}>
                {i18n.t("hrvScreen.totalDay")}
              </ThemedText>
              <ThemedText
                type="title"
                size="lg"
                style={[
                  styles.metricValue,
                  {
                    color: getStressColor(data.stressDetails.totalDayStress),
                  },
                ]}
              >
                {data.stressDetails.totalDayStress.toFixed(1)}/3.0
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.metricCard}>
              <ThemedText size="sm" style={styles.metricLabel}>
                {i18n.t("hrvScreen.sleep")}
              </ThemedText>
              <ThemedText
                type="title"
                size="lg"
                style={[
                  styles.metricValue,
                  {
                    color: getStressColor(data.stressDetails.sleepStress),
                  },
                ]}
              >
                {data.stressDetails.sleepStress.toFixed(1)}/3.0
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.metricCard}>
              <ThemedText size="sm" style={styles.metricLabel}>
                {i18n.t("hrvScreen.daily")}
              </ThemedText>
              <ThemedText
                type="title"
                size="lg"
                style={[
                  styles.metricValue,
                  {
                    color: getStressColor(
                      data.stressDetails.nonActivityStress
                    ),
                  },
                ]}
              >
                {data.stressDetails.nonActivityStress.toFixed(1)}/3.0
              </ThemedText>
            </ThemedView>
          </View>

          <ThemedView style={styles.baselinesContainer}>
            <ThemedText size="md" style={styles.baselinesText}>
              {i18n.t("hrvScreen.baselines", {
                hrv: data.stressDetails.baselineHRV,
                rhr: data.stressDetails.baselineRHR,
              })}
            </ThemedText>
          </ThemedView>
        </>
      )}

      {!data.stressDetails && (
        <View style={styles.emptyStateContainer}>
          <ThemedText type="subtitle" size="xl">
            {i18n.t("hrvScreen.enhancedStressAnalysis")}
          </ThemedText>
          <ThemedText size="md">
            {i18n.t("hrvScreen.stressDataUnavailable", {
              stressLevel: data.stressLevel,
            })}
          </ThemedText>
          <ThemedText type="secondary" size="sm">
            {i18n.t("hrvScreen.requires14DaysData")}
          </ThemedText>
        </View>
      )}
    </ThemedScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 100,
    justifyContent: "center",
  },
  metricLabel: {
    marginBottom: 8,
    textAlign: "center",
  },
  metricValue: {
    textAlign: "center",
  },
  baselinesContainer: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  baselinesText: {
    textAlign: "center",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
});
