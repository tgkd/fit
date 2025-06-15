import { use } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { HealthDataContext } from "@/context/HealthDataContext";
import { getStressColor } from "@/lib/health";
import i18n from "@/lib/i18n";

export default function HRVScreen() {
  const { data } = use(HealthDataContext);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        {data.stressDetails && (
          <>
            <View style={styles.header}>
              <ThemedText type="subtitle" style={styles.title}>
                {i18n.t("hrvScreen.enhancedStressAnalysis")}
              </ThemedText>
              <ThemedText type="secondary" style={styles.subtitle}>
                {i18n.t("hrvScreen.basedOnPersonalBaselines")}
              </ThemedText>
            </View>

            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <ThemedText style={styles.metricLabel}>
                  {i18n.t("hrvScreen.totalDay")}
                </ThemedText>
                <ThemedText
                  type="title"
                  style={[
                    styles.metricValue,
                    {
                      color: getStressColor(data.stressDetails.totalDayStress),
                    },
                  ]}
                >
                  {data.stressDetails.totalDayStress.toFixed(1)}/3.0
                </ThemedText>
              </View>

              <View style={styles.metricCard}>
                <ThemedText style={styles.metricLabel}>
                  {i18n.t("hrvScreen.sleep")}
                </ThemedText>
                <ThemedText
                  type="title"
                  style={[
                    styles.metricValue,
                    {
                      color: getStressColor(data.stressDetails.sleepStress),
                    },
                  ]}
                >
                  {data.stressDetails.sleepStress.toFixed(1)}/3.0
                </ThemedText>
              </View>

              <View style={styles.metricCard}>
                <ThemedText style={styles.metricLabel}>
                  {i18n.t("hrvScreen.daily")}
                </ThemedText>
                <ThemedText
                  type="title"
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
              </View>
            </View>

            <View style={styles.baselinesContainer}>
              <ThemedText style={styles.baselinesText}>
                {i18n.t("hrvScreen.baselines", {
                  hrv: data.stressDetails.baselineHRV,
                  rhr: data.stressDetails.baselineRHR,
                })}
              </ThemedText>
            </View>
          </>
        )}

        {!data.stressDetails && (
          <View style={styles.emptyStateContainer}>
            <ThemedText type="subtitle" style={styles.emptyStateTitle}>
              {i18n.t("hrvScreen.enhancedStressAnalysis")}
            </ThemedText>
            <ThemedText style={styles.emptyStateText}>
              {i18n.t("hrvScreen.stressDataUnavailable", {
                stressLevel: data.stressLevel,
              })}
            </ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>
              {i18n.t("hrvScreen.requires14DaysData")}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 100,
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  baselinesContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  baselinesText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyStateSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
});
