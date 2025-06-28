import { useRouter } from "expo-router";
import React, { use } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { CircularProgressChart } from "@/components/charts/CircularProgressChart";
import { StressMonitorCard } from "@/components/charts/StressMonitorCard";
import { DateSlider } from "@/components/DateSlider";
import { RealtimeHeartRateMonitor } from "@/components/health/RealtimeHeartRateMonitor";
import { Card } from "@/components/ui/Card";
import { ThemedScrollView } from "@/components/ui/ThemedScrollView";
import { TodayActivitiesCard } from "@/components/workouts/TodayActivitiesCard";
import { Colors } from "@/constants/Colors";
import { HealthDataContext } from "@/context/HealthDataContext";
import { MAX_STRAIN } from "@/lib/health/strain";
import { HealthData } from "@/lib/health/types";
import { getTodaysWorkouts } from "@/lib/health/workouts";
import i18n from "@/lib/i18n";

export default function HomeScreen() {
  const { data } = use(HealthDataContext);

  return (
    <ThemedScrollView>
      <DateSlider />
      {data ? <ScreenContent data={data} /> : <ActivityIndicator />}
    </ThemedScrollView>
  );
}

function ScreenContent({ data }: { data: HealthData }) {
  const router = useRouter();
  const todaysWorkouts = getTodaysWorkouts(data.workouts);

  return (
    <>
      <Card style={styles.circularChartsContainer}>
        <Pressable onPress={() => router.push("/sleep")}>
          <CircularProgressChart
            value={data.sleep.overallPerformance}
            color={Colors.charts.sleep}
            label={i18n.t("home.sleep").toUpperCase()}
          />
        </Pressable>
        <CircularProgressChart
          value={data.recoveryScore}
          color={Colors.charts.recovery}
          label={i18n.t("home.recovery").toUpperCase()}
        />
        <Pressable onPress={() => router.push("/strain")}>
          <CircularProgressChart
            value={data.strainScore}
            color={Colors.charts.strain}
            label={i18n.t("home.strain").toUpperCase()}
            maxValue={MAX_STRAIN}
          />
        </Pressable>
      </Card>

      <TodayActivitiesCard workouts={todaysWorkouts} />

      <StressMonitorCard
        healthData={data}
        onPress={() => {
          router.push("/stress");
        }}
      />

      <RealtimeHeartRateMonitor />
    </>
  );
}

const styles = StyleSheet.create({
  circularChartsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 12,
  },
});
