import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { HealthKitWorkout } from "@/lib/health/workouts";
import { localizedWorkoutName } from "@/lib/workouts/config";
import { getWorkoutTypeIcon } from "./utils";
import i18n from "@/lib/i18n";

interface CompactWorkoutItemProps {
  workout: HealthKitWorkout;
}

export function CompactWorkoutItem({ workout }: CompactWorkoutItemProps) {
  const startDate = new Date(workout.startDate);
  const endDate = new Date(workout.endDate);

  const startTime = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const endTime = endDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const calories = workout.totalEnergyBurned?.quantity || 0;

  return (
    <View style={styles.compactWorkoutItem}>
      <View style={styles.compactInfo}>
        <View style={styles.topRow}>
          <ThemedText type="defaultSemiBold" size="sm">
            {getWorkoutTypeIcon(workout.workoutActivityType)}{" "}
            {localizedWorkoutName(workout.workoutActivityType)}
          </ThemedText>
          <ThemedText type="secondary" size="sm">
            {startTime}-{endTime}
          </ThemedText>
        </View>
        <View style={styles.bottomRow}>
          <ThemedText type="secondary" size="xs" style={styles.scoreText}>
            {Math.round(calories)} {i18n.t("workouts.kcal")}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactWorkoutItem: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  compactInfo: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  scoreText: {
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
