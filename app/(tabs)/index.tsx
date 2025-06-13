import i18n from "@/lib/i18n";
import { use } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { CircularProgressChart } from "@/components/charts/CircularProgressChart";
import { StressChart } from "@/components/charts/StressChart";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/Colors";
import { HealthDataContext } from "@/context/HealthDataContext";

export default function HomeScreen() {
  const { data } = use(HealthDataContext);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.circularChartsContainer}>
          <CircularProgressChart
            value={data.sleepPerformance}
            color={Colors.charts.sleep}
            backgroundColor={Colors.charts.chartBackground}
            label={i18n.t("home.sleep").toUpperCase()}
          />
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

        <StressChart data={data} />

        <Card>
          <ThemedText type="subtitle">{i18n.t("home.sleep")}</ThemedText>
          <ThemedText type="title">
            {i18n.t("home.sleepHours", { hours: data.sleepHours })}
          </ThemedText>
          <ThemedText>
            {i18n.t("home.performance", {
              performance: data.sleepPerformance.toFixed(1),
            })}
          </ThemedText>
          <ThemedText>
            {i18n.t("home.consistency", {
              consistency: data.sleepConsistency.toFixed(1),
            })}
          </ThemedText>
        </Card>

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
              calories: Math.round(data.caloriesBurned),
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

        <Card>
          <ThemedText type="subtitle">{i18n.t("home.bloodOxygen")}</ThemedText>
          <ThemedText type="title">
            {i18n.t("home.bloodOxygenValue", {
              value: data.bloodOxygen.toFixed(1),
            })}
          </ThemedText>
          <ThemedText>{i18n.t("home.spo2")}</ThemedText>
        </Card>

        <Card>
          <ThemedText type="subtitle">{i18n.t("home.stress")}</ThemedText>
          <ThemedText type="title">
            {i18n.t("home.stressLevelValue", {
              value: data.stressLevel.toFixed(1),
            })}
          </ThemedText>
          <ThemedText>{i18n.t("home.stressLevel")}</ThemedText>
        </Card>

        {data.hrvValues.length > 0 && (
          <Card>
            <ThemedText type="subtitle">{i18n.t("home.hrv")}</ThemedText>
            <ThemedText type="title">
              {i18n.t("home.hrvValue", {
                value: data.hrvValues[data.hrvValues.length - 1].toFixed(1),
              })}
            </ThemedText>
            <ThemedText>{i18n.t("home.hrvLabel")}</ThemedText>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 46,
    rowGap: 16,
  },
  circularChartsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 12,
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
