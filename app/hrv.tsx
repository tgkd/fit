import { use } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { HealthDataContext } from "@/context/HealthDataContext";
import { getStressColor } from "@/lib/health";
import i18n from "@/lib/i18n";

export default function HRVScreen() {
  const { data } = use(HealthDataContext);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {data.stressDetails && (
          <Card>
            <ThemedText type="subtitle">
              {i18n.t("hrvScreen.enhancedStressAnalysis")}
            </ThemedText>
            <ThemedText type="secondary">
              {i18n.t("hrvScreen.basedOnPersonalBaselines")}
            </ThemedText>

            <View style={styles.metrics}>
              <View style={styles.item}>
                <ThemedText>{i18n.t("hrvScreen.totalDay")}</ThemedText>
                <ThemedText
                  type="title"
                  style={[
                    {
                      color: getStressColor(data.stressDetails.totalDayStress),
                    },
                  ]}
                >
                  {data.stressDetails.totalDayStress.toFixed(1)}/3.0
                </ThemedText>
              </View>

              <View style={styles.item}>
                <ThemedText>{i18n.t("hrvScreen.sleep")}</ThemedText>
                <ThemedText
                  type="title"
                  style={[
                    {
                      color: getStressColor(data.stressDetails.sleepStress),
                    },
                  ]}
                >
                  {data.stressDetails.sleepStress.toFixed(1)}/3.0
                </ThemedText>
              </View>

              <View>
                <ThemedText>{i18n.t("hrvScreen.daily")}</ThemedText>
                <ThemedText
                  type="title"
                  style={[
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

            <ThemedText>
              {i18n.t("hrvScreen.baselines", {
                hrv: data.stressDetails.baselineHRV,
                rhr: data.stressDetails.baselineRHR,
              })}
            </ThemedText>
          </Card>
        )}

        {!data.stressDetails && (
          <Card>
            <ThemedText type="subtitle">
              {i18n.t("hrvScreen.enhancedStressAnalysis")}
            </ThemedText>
            <ThemedText>
              {i18n.t("hrvScreen.stressDataUnavailable", {
                stressLevel: data.stressLevel,
              })}
            </ThemedText>
            <ThemedText>{i18n.t("hrvScreen.requires14DaysData")}</ThemedText>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 1,
    padding: 16,
  },
  container: {
    flex: 1,
    rowGap: 16,
  },
  metrics: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  item: {
    flex: 1,
    alignItems: "center",
  },
});
