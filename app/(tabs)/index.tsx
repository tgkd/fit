import { use } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { HealthDataContext } from "@/context/HealthDataContext";

export default function HomeScreen() {
  const { data, writeHealthData } = use(HealthDataContext);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <ThemedView style={styles.metricsContainer}>
          <ThemedView style={styles.metricCard}>
            <ThemedText type="subtitle">Sleep</ThemedText>
            <ThemedText type="title">{data.sleepHours}h</ThemedText>
            <ThemedText>
              Performance: {data.sleepPerformance.toFixed(1)}%
            </ThemedText>
            <ThemedText>
              Consistency: {data.sleepConsistency.toFixed(1)}%
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.metricCard}>
            <ThemedText type="subtitle">Heart Rate</ThemedText>
            <ThemedText type="title">{data.restingHeartRate} bpm</ThemedText>
            <ThemedText>Resting Heart Rate</ThemedText>
          </ThemedView>

          <ThemedView style={styles.metricCard}>
            <ThemedText type="subtitle">Activity</ThemedText>
            <ThemedText type="title">{data.steps.toLocaleString()}</ThemedText>
            <ThemedText>Steps Today</ThemedText>
            <ThemedText>
              {Math.round(data.caloriesBurned)} cal burned
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.metricCard}>
            <ThemedText type="subtitle">Recovery</ThemedText>
            <ThemedText type="title">
              {data.recoveryScore.toFixed(1)}%
            </ThemedText>
            <ThemedText>Recovery Score</ThemedText>
          </ThemedView>

          <ThemedView style={styles.metricCard}>
            <ThemedText type="subtitle">Strain</ThemedText>
            <ThemedText type="title">{data.strainScore.toFixed(1)}%</ThemedText>
            <ThemedText>Training Strain</ThemedText>
          </ThemedView>

          <ThemedView style={styles.metricCard}>
            <ThemedText type="subtitle">Blood Oxygen</ThemedText>
            <ThemedText type="title">{data.bloodOxygen.toFixed(1)}%</ThemedText>
            <ThemedText>SpO2</ThemedText>
          </ThemedView>

          <ThemedView style={styles.metricCard}>
            <ThemedText type="subtitle">Stress</ThemedText>
            <ThemedText type="title">{data.stressLevel.toFixed(1)}%</ThemedText>
            <ThemedText>Stress Level</ThemedText>
          </ThemedView>

          {data.hrvValues.length > 0 && (
            <ThemedView style={styles.metricCard}>
              <ThemedText type="subtitle">HRV</ThemedText>
              <ThemedText type="title">
                {data.hrvValues[data.hrvValues.length - 1].toFixed(1)}ms
              </ThemedText>
              <ThemedText>Heart Rate Variability</ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        <ThemedView style={styles.instructionsContainer}>
          <ThemedText type="subtitle">Health Data</ThemedText>
          <ThemedText>
            Your health metrics are automatically synced from Apple Health.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricsContainer: {
    gap: 16,
    marginTop: 16,
  },
  metricCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  instructionsContainer: {
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
