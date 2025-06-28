import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { CompactWorkoutItem } from "./CompactWorkoutItem";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";
import { formatDurationHHMM } from "@/lib/formatters";
import { HealthKitWorkout } from "@/lib/health/workouts";
import i18n from "@/lib/i18n";

interface TodayActivitiesCardProps {
  workouts: HealthKitWorkout[];
}

export function TodayActivitiesCard({ workouts }: TodayActivitiesCardProps) {
  const router = useRouter();
  const iconColorSecondary = useThemeColor({}, "icon");

  const totalDurationMinutes = workouts.reduce((total, workout) => {
    const duration = Math.round(
      (new Date(workout.endDate).getTime() - new Date(workout.startDate).getTime()) /
      (1000 * 60)
    );
    return total + duration;
  }, 0);

  const handlePress = () => {
    router.push("/workouts");
  };

  return (
    <Pressable onPress={handlePress}>
      <Card>
        <View style={styles.header}>
          <View>
            <ThemedText size="md">{i18n.t("home.todayActivities")}</ThemedText>
            <ThemedText size="xs" type="secondary">
              {workouts.length} {i18n.t("workouts.activities")} • {formatDurationHHMM(totalDurationMinutes)}
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={16} color={iconColorSecondary} />
        </View>

        {workouts.length > 0 ? (
          <View style={styles.compactList}>
            {workouts.slice(0, 3).map((workout) => (
              <CompactWorkoutItem key={workout.uuid} workout={workout} />
            ))}
            {workouts.length > 3 && (
              <View style={styles.showMoreContainer}>
                <ThemedText type="secondary" size="xs">
                  +{workouts.length - 3} {i18n.t("workouts.more")}
                </ThemedText>
              </View>
            )}
          </View>
        ) : (
          <ThemedText type="secondary" size="sm" style={styles.emptyText}>
            {i18n.t("workouts.noActivitiesToday")}
          </ThemedText>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  compactList: {
    gap: 4,
  },
  showMoreContainer: {
    paddingVertical: 8,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 16,
  },
});
