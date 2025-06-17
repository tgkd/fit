import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import i18n from "@/lib/i18n";
import { WorkoutItem } from "./WorkoutItem";
import { WorkoutData } from "./types";

interface WorkoutListProps {
  workouts: WorkoutData[];
  allWorkouts: WorkoutData[];
}

export function WorkoutList({ workouts, allWorkouts }: WorkoutListProps) {
  return (
    <Card>
      <ThemedText type="title">{i18n.t("workouts.last7Days")}</ThemedText>
      {workouts.length > 0 ? (
        <View style={styles.workoutsList}>
          {workouts.map((workout) => (
            <WorkoutItem key={workout.id} workout={workout} />
          ))}
        </View>
      ) : (
        <ThemedText style={styles.emptyText}>
          {allWorkouts.length === 0
            ? i18n.t("workouts.noWorkoutData")
            : i18n.t("workouts.noWorkoutsLast7Days")}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  workoutsList: {
    marginTop: 16,
    gap: 16,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 16,
    opacity: 0.7,
  },
});
