import { useRouter } from "expo-router";
import React, { use } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { CircularProgressChart } from "@/components/charts/CircularProgressChart";
import { StressMonitorCard } from "@/components/charts/StressMonitorCard";
import { DateSlider } from "@/components/DateSlider";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { ThemedScrollView } from "@/components/ui/ThemedScrollView";
import { Colors } from "@/constants/Colors";
import { HealthDataContext } from "@/context/HealthDataContext";
import { HealthData } from "@/lib/health";
import i18n from "@/lib/i18n";
import { MAX_STRAIN } from "@/lib/health/strain";

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
  return (
    <>
      <Card style={styles.circularChartsContainer}>
        <Pressable onPress={() => router.push("/sleep")}>
          <CircularProgressChart
            value={data.sleep.sleepPerformance}
            color={Colors.charts.sleep}
            backgroundColor={Colors.charts.chartBackground}
            label={i18n.t("home.sleep").toUpperCase()}
          />
        </Pressable>
        <CircularProgressChart
          value={data.recoveryScore}
          color={Colors.charts.recovery}
          backgroundColor={Colors.charts.chartBackground}
          label={i18n.t("home.recovery").toUpperCase()}
        />
        <CircularProgressChart
          value={(data.strainScore / MAX_STRAIN) * 100}
          color={Colors.charts.strain}
          backgroundColor={Colors.charts.chartBackground}
          label={i18n.t("home.strain").toUpperCase()}
        />
      </Card>

      <StressMonitorCard
        healthData={data}
        onPress={() => {
          router.push("/stress");
        }}
      />

      <Card>
        <ThemedText type="subtitle">{i18n.t("home.heartRate")}</ThemedText>
        <ThemedText type="title">
          {i18n.t("home.restingHeartRateValue", {
            value: data.restingHeartRate,
          })}
        </ThemedText>
        <ThemedText>{i18n.t("home.restingHeartRate")}</ThemedText>
      </Card>

      <Card>
        <ThemedText type="subtitle">{i18n.t("home.activity")}</ThemedText>
        <ThemedText type="title">{data.steps.toLocaleString()}</ThemedText>
        <ThemedText>{i18n.t("home.stepsToday")}</ThemedText>
        <ThemedText>
          {i18n.t("home.caloriesBurned", {
            calories: Math.round(data.moveKcal),
          })}
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="subtitle">{i18n.t("home.recovery")}</ThemedText>
        <ThemedText type="title">
          {i18n.t("home.recoveryScore", {
            score: data.recoveryScore.toFixed(1),
          })}
        </ThemedText>
        <ThemedText>{i18n.t("home.recoveryScoreLabel")}</ThemedText>
      </Card>

      <Card>
        <ThemedText type="subtitle">{i18n.t("home.strain")}</ThemedText>
        <ThemedText type="title">
          {i18n.t("home.strainScore", {
            score: data.strainScore.toFixed(1),
          })}
        </ThemedText>
        <ThemedText>{i18n.t("home.trainingStrain")}</ThemedText>
      </Card>

      {data.bloodOxygen?.value ? (
        <Card>
          <ThemedText type="subtitle">{i18n.t("home.bloodOxygen")}</ThemedText>
          <ThemedText type="title">
            {i18n.t("home.bloodOxygenValue", {
              value: data.bloodOxygen.value.toFixed(1),
            })}
          </ThemedText>
          <ThemedText>{i18n.t("home.spo2")}</ThemedText>
        </Card>
      ) : null}

      <Card>
        <ThemedText type="subtitle">{i18n.t("home.stress")}</ThemedText>
        <ThemedText type="title">
          {i18n.t("home.stressLevelValue", {
            value: data.stressLevel.toFixed(1),
          })}
        </ThemedText>
        <ThemedText>{i18n.t("home.stressLevel")}</ThemedText>
      </Card>
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
