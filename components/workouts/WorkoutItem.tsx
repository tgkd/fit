import { ThemedText } from "@/components/ThemedText";
import { localizedWorkoutName } from "@/lib/workouts/config";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { WorkoutData } from "./types";
import { formatDateForWorkout, formatDuration, getWorkoutTypeColor, getWorkoutTypeIcon } from "./utils";

interface WorkoutItemProps {
  workout: WorkoutData;
}

export function WorkoutItem({ workout }: WorkoutItemProps) {
  const router = useRouter();
  const { day, month } = formatDateForWorkout(workout.date);

  const handlePress = () => {
    router.push({
      pathname: "/workouts/[id]",
      params: {
        id: workout.id,
        type: workout.type.toString(),
        duration: workout.duration.toString(),
        date: workout.date.toISOString(),
        calories: workout.calories.toString(),
      },
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.workoutItem,
        pressed && styles.workoutItemPressed
      ]}
      onPress={handlePress}
    >
      <View
        style={[
          styles.workoutRibbon,
          { backgroundColor: getWorkoutTypeColor(workout.type) }
        ]}
      />

      {/* Left side: Date and workout info */}
      <View style={styles.workoutLeftSide}>
        <View style={styles.workoutDateContainer}>
          <ThemedText type="monospace" size="xxs" style={styles.workoutDay}>
            {day}
          </ThemedText>
          <ThemedText size="sm" style={styles.workoutMonth}>
            {month}
          </ThemedText>
        </View>

        <View style={styles.workoutInfo}>
          <ThemedText type="defaultSemiBold" size="md" style={styles.workoutTitle}>
            {getWorkoutTypeIcon(workout.type)} {localizedWorkoutName(workout.type)}
          </ThemedText>
        </View>
      </View>

      {/* Right side: Duration only */}
      <View style={styles.workoutRightSide}>
        <ThemedText type="monospace" size="lg" style={styles.workoutDuration}>
          {formatDuration(workout.duration)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  workoutItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
    borderRadius: 12,
    position: "relative",
  },
  workoutItemPressed: {
    opacity: 0.7,
    // transform: [{ scale: 0.98 }],
  },
  workoutRibbon: {
    position: "absolute",
    left: 0,
    height: "100%",
    width: 6,
    borderRadius: 2,
  },
  workoutLeftSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  workoutDateContainer: {
    alignItems: "center",
    marginRight: 16,
  },
  workoutDay: {
  },
  workoutMonth: {
    marginTop: 2,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
  },
  workoutRightSide: {
    alignItems: "flex-end",
  },
  workoutDuration: {
  },
});