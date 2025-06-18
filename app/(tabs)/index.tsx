import { useRouter } from "expo-router";
import React, { use } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { CircularProgressChart } from "@/components/charts/CircularProgressChart";
import { StressMonitorCard } from "@/components/charts/StressMonitorCard";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { ThemedScrollView } from "@/components/ui/ThemedScrollView";
import { Colors } from "@/constants/Colors";
import { HealthDataContext } from "@/context/HealthDataContext";
import i18n from "@/lib/i18n";

export default function HomeScreen() {
  const router = useRouter();
  const {
    data,
    date,
    loading,
    setPreviousDate,
    setNextDate,
    setToday,
    isToday,
    formatDate
  } = use(HealthDataContext);

  return (
    <ThemedScrollView>
      <Card style={styles.dateNavigationContainer}>
        <Pressable
          style={[
            styles.dateButton,
            loading && styles.dateButtonDisabled
          ]}
          onPress={setPreviousDate}
          disabled={loading}
        >
          <ThemedText
            type="defaultSemiBold"
            size="lg"
            lightColor={loading ? Colors.light.textSecondary : Colors.light.text}
            darkColor={loading ? Colors.dark.textSecondary : Colors.dark.text}
          >‹</ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.dateDisplayContainer,
            loading && styles.dateButtonDisabled
          ]}
          onPress={setToday}
          disabled={isToday() || loading}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={Colors.light.tint}
            />
          ) : (
            <ThemedText
              type="defaultSemiBold"
              size="md"
              lightColor={isToday() ? Colors.light.text : Colors.light.tint}
              darkColor={isToday() ? Colors.dark.text : Colors.dark.tint}
            >
              {formatDate(date)}
            </ThemedText>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.dateButton,
            (isToday() || loading) && styles.dateButtonDisabled
          ]}
          onPress={setNextDate}
          disabled={isToday() || loading}
        >
          <ThemedText
            type="defaultSemiBold"
            size="lg"
            lightColor={(isToday() || loading) ? Colors.light.textSecondary : Colors.light.text}
            darkColor={(isToday() || loading) ? Colors.dark.textSecondary : Colors.dark.text}
          >
            ›
          </ThemedText>
        </Pressable>
      </Card>

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
          value={data.strainScore}
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
    </ThemedScrollView>
  );
}

const styles = StyleSheet.create({
  circularChartsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 12,
  },
  dateNavigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dateButtonDisabled: {
    opacity: 0.3,
  },
  dateDisplayContainer: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
});
