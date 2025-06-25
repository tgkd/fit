import React, { use, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { StrainBarChart, WorkoutBreakdownChart } from "@/components/charts";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { IconSymbol } from "@/components/ui/IconSymbol";
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

      {/* 14-Day Summary with Chart */}
      {strainStats14Days && (
        <Card>
          <ThemedText type="subtitle" size="lg" style={styles.cardTitle}>
            {i18n.t("strainScreen.last14Days")}
          </ThemedText>

          {/* Daily Strain Chart */}
          {strainStats14Days.dailyData &&
            strainStats14Days.dailyData.length > 0 && (
              <StrainBarChart
                data={strainStats14Days.dailyData}
                title={i18n.t("strainScreen.dailyStrainScores")}
              />
            )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText type="defaultSemiBold" size="xl">
                {strainStats14Days.aggregations.avgStrainScore}
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {i18n.t("strainScreen.avgStrain")}
              </ThemedText>
            </View>

            <View style={styles.statItem}>
              <ThemedText type="defaultSemiBold" size="xl">
                {Math.round(strainStats14Days.aggregations.totalWorkoutTime)}
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {i18n.t("strainScreen.totalMinutes")}
              </ThemedText>
            </View>

            <View style={styles.statItem}>
              <ThemedText type="defaultSemiBold" size="xl">
                {strainStats14Days.aggregations.workoutDays}
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {i18n.t("strainScreen.workoutDays")}
              </ThemedText>
            </View>
          </View>

          <View style={styles.trendsContainer}>
            <ThemedText type="defaultSemiBold" size="md">
              {i18n.t("strainScreen.trends")}
            </ThemedText>
            <View style={styles.trendRow}>
              <ThemedText type="secondary" size="sm">
                {i18n.t("strainScreen.trend", {
                  trend: strainStats14Days.trends.strainTrend,
                })}
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {i18n.t("strainScreen.fitnessProgress", {
                  progress: (
                    strainStats14Days.trends.fitnessProgress * 100
                  ).toFixed(0),
                })}
              </ThemedText>
            </View>
            <ThemedText type="secondary" size="sm">
              {i18n.t("strainScreen.consistency", {
                consistency: (
                  strainStats14Days.trends.workloadConsistency * 100
                ).toFixed(0),
              })}
            </ThemedText>
          </View>
        </Card>
      )}

      {/* Workout Breakdown with Chart */}
      {strainStats14Days &&
        Object.keys(strainStats14Days.aggregations.workoutsByType).length >
          0 && (
          <Card>
            <WorkoutBreakdownChart
              data={strainStats14Days.aggregations.workoutsByType}
              title={i18n.t("strainScreen.workoutBreakdown")}
            />

            {Object.entries(strainStats14Days.aggregations.workoutsByType)
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
      {strainStats14Days && (
        <Card>
          <ThemedText type="subtitle" size="lg" style={styles.cardTitle}>
            {i18n.t("strainScreen.strainDistribution")}
          </ThemedText>

          {Object.entries(strainStats14Days.aggregations.strainByCategory).map(
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

      {/* 30-Day Comparison with Chart */}
      {strainStats30Days && (
        <Card>
          <ThemedText type="subtitle" size="lg" style={styles.cardTitle}>
            {i18n.t("strainScreen.last30DaysOverview")}
          </ThemedText>

          {/* 30-Day Strain Chart */}
          {strainStats30Days.dailyData &&
            strainStats30Days.dailyData.length > 0 && (
              <StrainBarChart
                data={strainStats30Days.dailyData}
                title={i18n.t("strainScreen.recentDailyStrain")}
                height={220}
              />
            )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText type="defaultSemiBold" size="xl">
                {strainStats30Days.aggregations.avgStrainScore}
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {i18n.t("strainScreen.avgStrain")}
              </ThemedText>
            </View>

            <View style={styles.statItem}>
              <ThemedText type="defaultSemiBold" size="xl">
                {strainStats30Days.aggregations.highStrainDays}
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {i18n.t("strainScreen.highStrainDays")}
              </ThemedText>
            </View>

            <View style={styles.statItem}>
              <ThemedText type="defaultSemiBold" size="xl">
                {strainStats30Days.aggregations.recoveryDays}
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {i18n.t("strainScreen.recoveryDays")}
              </ThemedText>
            </View>
          </View>

          <View style={styles.additionalStats}>
            <ThemedText type="secondary" size="sm">
              {i18n.t("strainScreen.totalCalories", {
                calories:
                  strainStats30Days.aggregations.totalCalories.toLocaleString(),
              })}
            </ThemedText>
            <ThemedText type="secondary" size="sm">
              {i18n.t("strainScreen.avgRestBetweenHighStrain", {
                days: strainStats30Days.trends.averageRestDaysBetweenHighStrain,
              })}
            </ThemedText>
          </View>
        </Card>
      )}

      {/* Recent Daily Data */}
      {strainStats14Days?.dailyData && (
        <Card>
          <ThemedText type="subtitle" size="lg" style={styles.cardTitle}>
            {i18n.t("strainScreen.recentDays")}
          </ThemedText>

          {strainStats14Days.dailyData.slice(-7).map((dayData, index) => (
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
