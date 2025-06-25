import React, { use, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { StrainBarChart, WorkoutBreakdownChart } from "@/components/charts";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ThemedScrollView } from "@/components/ui/ThemedScrollView";
import { HealthDataContext } from "@/context/HealthDataContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  getLast14DaysStrainStats,
  getLast30DaysStrainStats,
  getStrainMetrics,
} from "@/lib/health/strain";
import { StrainPeriodStats } from "@/lib/health/types";
import i18n from "@/lib/i18n";

export default function StrainScreen() {
  const { data, systemDefaults, userParams } = use(HealthDataContext);
  const textSecondary = useThemeColor({}, "textSecondary");
  const [strainStats14Days, setStrainStats14Days] =
    useState<StrainPeriodStats | null>(null);
  const [strainStats30Days, setStrainStats30Days] =
    useState<StrainPeriodStats | null>(null);
  const [todayStrainMetrics, setTodayStrainMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<"14" | "30">("14");

  const periodOptions = [
    { value: "14", label: i18n.t("strainScreen.last14Days") },
    { value: "30", label: i18n.t("strainScreen.last30Days") },
  ];

  const activeStrainStats = selectedPeriod === "14" ? strainStats14Days : strainStats30Days;

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
        {i18n.t("strainScreen.title")}
      </ThemedText>

      {/* Today's Strain Score */}
      <Card style={styles.chartCard}>
        <View style={styles.strainScoreContainer}>
          <ThemedText type="title" size="xxl" textAlign="center">
            {data.strainScore}
          </ThemedText>
          <ThemedText type="subtitle" size="lg" textAlign="center">
            {todayStrainMetrics?.category || i18n.t("strainScreen.unknown")}
          </ThemedText>
          <ThemedText type="secondary" size="sm" textAlign="center">
            {i18n.t("strainScreen.todaysStrainScore")}
          </ThemedText>
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

      {/* Active Period Summary with Chart */}
      {activeStrainStats && (
        <Card>
          <ThemedText type="subtitle" size="lg" style={styles.cardTitle}>
            {selectedPeriod === "14"
              ? i18n.t("strainScreen.last14Days")
              : i18n.t("strainScreen.last30DaysOverview")
            }
          </ThemedText>

          {/* Daily Strain Chart */}
          {activeStrainStats.dailyData &&
            activeStrainStats.dailyData.length > 0 && (
              <StrainBarChart
                data={activeStrainStats.dailyData}
                title={
                  selectedPeriod === "14"
                    ? i18n.t("strainScreen.dailyStrainScores")
                    : i18n.t("strainScreen.recentDailyStrain")
                }
                height={selectedPeriod === "30" ? 220 : undefined}
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
                {selectedPeriod === "14"
                  ? Math.round(activeStrainStats.aggregations.totalWorkoutTime)
                  : activeStrainStats.aggregations.highStrainDays
                }
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {selectedPeriod === "14"
                  ? i18n.t("strainScreen.totalMinutes")
                  : i18n.t("strainScreen.highStrainDays")
                }
              </ThemedText>
            </View>

            <View style={styles.statItem}>
              <ThemedText type="defaultSemiBold" size="xl">
                {selectedPeriod === "14"
                  ? activeStrainStats.aggregations.workoutDays
                  : activeStrainStats.aggregations.recoveryDays
                }
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {selectedPeriod === "14"
                  ? i18n.t("strainScreen.workoutDays")
                  : i18n.t("strainScreen.recoveryDays")
                }
              </ThemedText>
            </View>
          </View>

          {selectedPeriod === "14" && (
            <View style={styles.trendsContainer}>
              <ThemedText type="defaultSemiBold" size="md">
                {i18n.t("strainScreen.trends")}
              </ThemedText>
              <View style={styles.trendRow}>
                <ThemedText type="secondary" size="sm">
                  {i18n.t("strainScreen.trend", {
                    trend: activeStrainStats.trends.strainTrend,
                  })}
                </ThemedText>
                <ThemedText type="secondary" size="sm">
                  {i18n.t("strainScreen.fitnessProgress", {
                    progress: (
                      activeStrainStats.trends.fitnessProgress * 100
                    ).toFixed(0),
                  })}
                </ThemedText>
              </View>
              <ThemedText type="secondary" size="sm">
                {i18n.t("strainScreen.consistency", {
                  consistency: (
                    activeStrainStats.trends.workloadConsistency * 100
                  ).toFixed(0),
                })}
              </ThemedText>
            </View>
          )}

          {selectedPeriod === "30" && (
            <View style={styles.additionalStats}>
              <ThemedText type="secondary" size="sm">
                {i18n.t("strainScreen.totalCalories", {
                  calories:
                    activeStrainStats.aggregations.totalCalories.toLocaleString(),
                })}
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {i18n.t("strainScreen.avgRestBetweenHighStrain", {
                  days: activeStrainStats.trends.averageRestDaysBetweenHighStrain,
                })}
              </ThemedText>
            </View>
          )}
        </Card>
      )}

      {/* Workout Breakdown with Chart */}
      {selectedPeriod === "14" && activeStrainStats &&
        Object.keys(activeStrainStats.aggregations.workoutsByType).length >
          0 && (
          <Card>
            <WorkoutBreakdownChart
              data={activeStrainStats.aggregations.workoutsByType}
              title={i18n.t("strainScreen.workoutBreakdown")}
            />

            {Object.entries(activeStrainStats.aggregations.workoutsByType)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 3)
              .map(([type, count]) => (
                <View key={type} style={styles.workoutTypeRow}>
                  <ThemedText size="sm">
                    {type.replace(/([A-Z])/g, " $1").trim()}
                  </ThemedText>
                  <ThemedText type="defaultSemiBold" size="sm">
                    {String(count)}
                  </ThemedText>
                </View>
              ))}
          </Card>
        )}

      {/* Strain Distribution */}
      {activeStrainStats && (
        <Card>
          <ThemedText type="subtitle" size="lg" style={styles.cardTitle}>
            {i18n.t("strainScreen.strainDistribution")}
          </ThemedText>

          {Object.entries(activeStrainStats.aggregations.strainByCategory).map(
            ([category, days]) => (
              <View key={category} style={styles.categoryRow}>
                <ThemedText size="sm">{category}</ThemedText>
                <ThemedText type="defaultSemiBold" size="sm">
                  {String(days)}{" "}
                  {Number(days) === 1
                    ? i18n.t("strainScreen.day")
                    : i18n.t("strainScreen.days")}
                </ThemedText>
              </View>
            )
          )}
        </Card>
      )}

      {/* Recent Daily Data */}
      {selectedPeriod === "14" && activeStrainStats?.dailyData && (
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
    </ThemedScrollView>
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
  trendsContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 8,
  },
  trendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  workoutTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
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
