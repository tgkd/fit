import { Pressable, StyleSheet, View } from "react-native";

import { useRouter } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { formatDateForWorkout, formatDuration } from "@/lib/formatters";
import { localizedWorkoutName, WorkoutData } from "@/lib/workouts/config";
import { getWorkoutTypeColor, getWorkoutTypeIcon } from "./utils";

interface WorkoutItemProps {
  workout: WorkoutData;
}

export function WorkoutItem({ workout }: WorkoutItemProps) {
  const router = useRouter();
  const { day, month } = formatDateForWorkout(workout.date);

  const cardBackground = useThemeColor({}, "cardBackground");
  const borderColor = useThemeColor({}, "border");

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
        { backgroundColor: cardBackground, borderColor },
        pressed && styles.workoutItemPressed,
      ]}
      onPress={handlePress}
    >
      <View
        style={[
          styles.workoutRibbon,
          { backgroundColor: getWorkoutTypeColor(workout.type) },
        ]}
      />

      <View style={styles.workoutLeftSide}>
        <View style={styles.workoutDateContainer}>
          <ThemedText type="monospace" size="md">
            {day}
          </ThemedText>
          <ThemedText type="secondary" size="sm">
            {month}
          </ThemedText>
        </View>

        <View style={styles.workoutInfo}>
          <ThemedText type="defaultSemiBold" size="md">
            {getWorkoutTypeIcon(workout.type)}{" "}
            {localizedWorkoutName(workout.type)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.workoutRightSide}>
        <ThemedText type="monospace" size="lg">
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
    borderRadius: 12,
    borderWidth: 1,
    position: "relative",
  },
  workoutItemPressed: {
    opacity: 0.7,
  },
  workoutRibbon: {
    position: "absolute",
    left: 0,
    height: "100%",
    width: 6,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  workoutLeftSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    columnGap: 8,
  },
  workoutDateContainer: {
    alignItems: "center",
  },
  workoutInfo: {
    flex: 1,
  },
  workoutRightSide: {
    alignItems: "flex-end",
    paddingRight: 16,
  },
});
