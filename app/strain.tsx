import React, { use, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { StrainBarChart, WorkoutBreakdownChart } from "@/components/charts";
import { CircularProgressChart } from "@/components/charts/CircularProgressChart";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ThemedScrollView } from "@/components/ui/ThemedScrollView";
import { Colors } from "@/constants/Colors";
import { HealthDataContext } from "@/context/HealthDataContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  getLast14DaysStrainStats,
  getLast30DaysStrainStats,
  getStrainMetrics,
  MAX_STRAIN,
} from "@/lib/health/strain";
import { StrainPeriodStats } from "@/lib/health/types";
import i18n from "@/lib/i18n";

type StrainMetrics = {
  strainScore: number;
  category: string;
  recommendation: string;
};

export default function StrainScreen() {
  const { data, systemDefaults, userParams, date, formatDate } =
    use(HealthDataContext);
  const textSecondary = useThemeColor({}, "textSecondary");
  const [strainStats14Days, setStrainStats14Days] =
    useState<StrainPeriodStats | null>(null);
  const [strainStats30Days, setStrainStats30Days] =
    useState<StrainPeriodStats | null>(null);
  const [todayStrainMetrics, setTodayStrainMetrics] =
    useState<StrainMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<"14" | "30">("14");

  const periodOptions = [
    { value: "14", label: i18n.t("strainScreen.last14Days") },
    { value: "30", label: i18n.t("strainScreen.last30Days") },
  ];

  const activeStrainStats =
    selectedPeriod === "14" ? strainStats14Days : strainStats30Days;

  useEffect(() => {
    const loadStrainStats = async () => {
      try {
        setLoading(true);

        const [stats14, stats30, todayMetrics] = await Promise.all([
          getLast14DaysStrainStats(systemDefaults, userParams),
          getLast30DaysStrainStats(systemDefaults, userParams),
          getStrainMetrics(new Date(), systemDefaults, userParams),
        ]);

        setStrainStats14Days(stats14);
        setStrainStats30Days(stats30);
        setTodayStrainMetrics(todayMetrics);
      } catch (error) {
        console.error("Error loading strain statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStrainStats();
  }, [systemDefaults, userParams]);

  if (loading) {
    return (
      <ThemedScrollView paddingTop={16}>
        <Card style={styles.emptyStateCard}>
          <View style={styles.emptyStateContainer}>
            <IconSymbol
              name="chart.bar.xaxis"
              size={48}
              color={textSecondary}
            />
            <ThemedText type="subtitle" size="xl" textAlign="center">
              {i18n.t("strainScreen.loading")}
            </ThemedText>
          </View>
        </Card>
      </ThemedScrollView>
    );
  }

  return (
    <ThemedScrollView paddingTop={16}>
      <ThemedText type="defaultSemiBold" size="md" textAlign="center">
        {formatDate(date)}
      </ThemedText>

      {/* Today's Strain Score */}
      <Card style={styles.chartCard}>
        <View style={styles.strainScoreContainer}>
          <CircularProgressChart
            value={data.strainScore}
            maxValue={MAX_STRAIN}
            color={Colors.charts.strain}
            size={120}
            strokeWidth={12}
          />
          {todayStrainMetrics?.recommendation && (
            <ThemedText
              type="secondary"
              size="sm"
              textAlign="center"
              style={styles.recommendation}
            >
              {todayStrainMetrics.recommendation}
            </ThemedText>
          )}
        </View>
      </Card>

      {/* Segmented Control for Period Selection */}
      <SegmentedControl
        options={periodOptions}
        selectedValue={selectedPeriod}
        onValueChange={(value) => setSelectedPeriod(value as "14" | "30")}
        style={styles.segmentedControl}
      />

      {/* Active Period Data */}
      {activeStrainStats && (
        <ActiveStrainStats
          activeStrainStats={activeStrainStats}
          selectedPeriod={selectedPeriod}
        />
      )}
    </ThemedScrollView>
  );
}

function ActiveStrainStats({
  activeStrainStats,
  selectedPeriod,
}: {
  activeStrainStats: StrainPeriodStats;
  selectedPeriod: "14" | "30";
}) {

  return (
    <>
      {/* Period Summary with Chart */}
      <Card>
        <ThemedText type="subtitle" size="lg" style={styles.cardTitle}>
          {selectedPeriod === "14"
            ? i18n.t("strainScreen.last14Days")
            : i18n.t("strainScreen.last30DaysOverview")}
        </ThemedText>

        {/* Daily Strain Chart */}
        {activeStrainStats.dailyData &&
          activeStrainStats.dailyData.length > 0 && (
            <StrainBarChart
              data={activeStrainStats.dailyData}
              title={i18n.t("strainScreen.dailyStrainScores")}
              height={220}
            />
          )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold" size="xl">
              {activeStrainStats.aggregations.avgStrainScore}
            </ThemedText>
            <ThemedText type="secondary" size="sm">
              {i18n.t("strainScreen.avgStrain")}
            </ThemedText>
          </View>

          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold" size="xl">
              {activeStrainStats.aggregations.highStrainDays}
            </ThemedText>
            <ThemedText type="secondary" size="sm">
              {i18n.t("strainScreen.highStrainDays")}
            </ThemedText>
          </View>

          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold" size="xl">
              {activeStrainStats.aggregations.workoutDays}
            </ThemedText>
            <ThemedText type="secondary" size="sm">
              {i18n.t("strainScreen.workoutDays")}
            </ThemedText>
          </View>
        </View>

        <View style={styles.additionalStats}>
          <ThemedText type="secondary" size="sm">
            {i18n.t("strainScreen.totalCalories", {
              calories:
                activeStrainStats.aggregations.totalCalories.toLocaleString(),
            })}
          </ThemedText>
          <ThemedText type="secondary" size="sm">
            {i18n.t("strainScreen.totalMinutes", {
              minutes: Math.round(
                activeStrainStats.aggregations.totalWorkoutTime
              ),
            })}
          </ThemedText>
        </View>
      </Card>

      {/* Workout Breakdown with Chart */}
      {Object.keys(activeStrainStats.aggregations.workoutsByType).length >
        0 && (
        <Card>
          <WorkoutBreakdownChart
            data={activeStrainStats.aggregations.workoutsByType}
            title={i18n.t("strainScreen.workoutBreakdown")}
          />
        </Card>
      )}


      {/* Recent Daily Data */}
      {activeStrainStats?.dailyData && (
        <Card>
          <ThemedText type="subtitle" size="lg" style={styles.cardTitle}>
            {i18n.t("strainScreen.recentDays")}
          </ThemedText>

          {activeStrainStats.dailyData.slice(-7).map((dayData, index) => (
            <View key={index} style={styles.dailyRow}>
              <View style={styles.dailyRowLeft}>
                <ThemedText size="sm">
                  {dayData.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </ThemedText>
                <ThemedText size="xs" type="secondary">
                  {i18n.t("strainScreen.workouts", {
                    count: dayData.metrics.workoutCount,
                  })}{" "}
                  •{" "}
                  {i18n.t("strainScreen.calories", {
                    calories: dayData.metrics.totalCalories,
                  })}
                </ThemedText>
              </View>
              <View style={styles.dailyRowRight}>
                <ThemedText size="sm" type="defaultSemiBold">
                  {dayData.strainScore}
                </ThemedText>
                <ThemedText size="xs" type="secondary">
                  {dayData.category}
                </ThemedText>
              </View>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  segmentedControl: {
    marginBottom: 16,
  },
  chartCard: {
    alignItems: "center",
  },
  emptyStateCard: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyStateContainer: {
    alignItems: "center",
    gap: 12,
  },
  strainScoreContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  recommendation: {
    maxWidth: "80%",
    marginTop: 8,
  },
  cardTitle: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  additionalStats: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 8,
  },
  dailyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  dailyRowLeft: {
    flex: 1,
    gap: 4,
  },
  dailyRowRight: {
    alignItems: "flex-end",
    gap: 4,
  },
});
