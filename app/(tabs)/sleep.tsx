import { SleepStagesChart } from "@/components/charts/SleepStagesChart";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { HealthDataContext } from "@/context/HealthDataContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { HKCategorySample, HKCategoryValueSleepAnalysis } from "@kingstinct/react-native-healthkit";
import { use } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SleepScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data } = use(HealthDataContext);

  // Get sleep samples from 12:00 yesterday
  const yesterdayNoon = new Date();
  yesterdayNoon.setHours(12, 0, 0, 0);
  yesterdayNoon.setDate(yesterdayNoon.getDate() - 1);

  // Group sleep samples by source
  const sleepBySource = data.sleep.reduce((acc, sample) => {
    if (new Date(sample.startDate) >= yesterdayNoon) {
      const source = sample.sourceRevision?.source?.name || 'Unknown';
      if (!acc[source]) {
        acc[source] = [] as HKCategorySample[];
      }
      acc[source].push(sample);
    }
    return acc;
  }, {} as Record<string, HKCategorySample[]>);

  // Calculate durations for each source
  const sourceDurations = Object.entries(sleepBySource).map(([source, samples]) => {
    const stageDurations = {
      deep: 0,
      core: 0,
      rem: 0,
      unspecified: 0,
      awake: 0,
    };

    samples.forEach(sample => {
      const duration = (new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime()) / (1000 * 60); // in minutes
      switch (sample.value) {
        case HKCategoryValueSleepAnalysis.asleepDeep:
          stageDurations.deep += duration;
          break;
        case HKCategoryValueSleepAnalysis.asleepCore:
          stageDurations.core += duration;
          break;
        case HKCategoryValueSleepAnalysis.asleepREM:
          stageDurations.rem += duration;
          break;
        case HKCategoryValueSleepAnalysis.asleepUnspecified:
          stageDurations.unspecified += duration;
          break;
        case HKCategoryValueSleepAnalysis.awake:
          stageDurations.awake += duration;
          break;
      }
    });

    const totalDuration = Object.values(stageDurations).reduce((sum, duration) => sum + duration, 0);

    return {
      source,
      stageDurations,
      totalDuration,
    };
  });

  // Sort sources by total duration (highest first)
  sourceDurations.sort((a, b) => b.totalDuration - a.totalDuration);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {sourceDurations.map(({ source, stageDurations, totalDuration }) => (
          <Card key={source} style={styles.sourceCard}>
            <ThemedText type="subtitle">{source}</ThemedText>
            <View style={styles.sleepSummary}>
              <View style={styles.sleepMetric}>
                <ThemedText style={styles.metricValue}>
                  {formatDuration(totalDuration)}
                </ThemedText>
                <ThemedText style={styles.metricLabel}>Total Sleep</ThemedText>
              </View>
              <View style={styles.sleepMetric}>
                <ThemedText style={styles.metricValue}>
                  {formatDuration(stageDurations.core)}
                </ThemedText>
                <ThemedText style={styles.metricLabel}>Core</ThemedText>
              </View>
              <View style={styles.sleepMetric}>
                <ThemedText style={styles.metricValue}>
                  {formatDuration(stageDurations.rem)}
                </ThemedText>
                <ThemedText style={styles.metricLabel}>REM Sleep</ThemedText>
              </View>
              <View style={styles.sleepMetric}>
                <ThemedText style={styles.metricValue}>
                  {formatDuration(stageDurations.deep)}
                </ThemedText>
                <ThemedText style={styles.metricLabel}>Deep Sleep</ThemedText>
              </View>
            </View>

            <SleepStagesChart
              stages={[
                {
                  name: "Core",
                  duration: stageDurations.core,
                  percentage: (stageDurations.core / totalDuration) * 100,
                },
                {
                  name: "REM",
                  duration: stageDurations.rem,
                  percentage: (stageDurations.rem / totalDuration) * 100,
                },
                {
                  name: "Deep",
                  duration: stageDurations.deep,
                  percentage: (stageDurations.deep / totalDuration) * 100,
                },
                {
                  name: "Awake",
                  duration: stageDurations.awake,
                  percentage: (stageDurations.awake / totalDuration) * 100,
                },
              ]}
              totalDuration={totalDuration}
            />
          </Card>
        ))}
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sourceCard: {
    marginBottom: 16,
  },
  sleepSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  sleepMetric: {
    alignItems: "center",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});