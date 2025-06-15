import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { WorkoutData, WorkoutList } from "@/components/workouts";
import { HealthDataContext } from "@/context/HealthDataContext";
import { formatDurationHHMM } from "@/lib/formatters";
import i18n from "@/lib/i18n";
import { EnergyUnit, HKWorkout, LengthUnit } from "@kingstinct/react-native-healthkit";
import { useContext } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

export default function WorkoutsScreen() {
  const { data } = useContext(HealthDataContext);

  // Convert HealthKit workout data to our format
  const convertToWorkouts = (): WorkoutData[] => {
    if (!data.workouts || data.workouts.length === 0) {
      return [];
    }
    return data.workouts.map((workout: HKWorkout<EnergyUnit, LengthUnit>, index: number) => {
      const duration =
        (new Date(workout.endDate).getTime() -
          new Date(workout.startDate).getTime()) /
        (1000 * 60); // duration in minutes
      return {
        id: workout.uuid || `workout-${index}`,
        type: workout.workoutActivityType,
        duration: Math.round(duration),
        date: new Date(workout.startDate),
        calories: workout.totalEnergyBurned?.quantity || 0,
      };
    });
  };

  const allWorkouts = convertToWorkouts();

  // Filter workouts for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const last7DaysWorkouts = allWorkouts.filter(
    (workout) => workout.date >= sevenDaysAgo
  ).sort((a,b) => b.date - a.date);

  let totalStats = [
    {
      label: i18n.t("workouts.workoutsCount"),
      value: allWorkouts.length,
    },
    {
      label: i18n.t("workouts.totalTime"),
      value: formatDurationHHMM(
        allWorkouts.reduce((sum, w) => sum + w.duration, 0)
      ),
    },
    {
      label: i18n.t("workouts.calories"),
      value: Math.round(
        allWorkouts.reduce((sum, w) => sum + w.calories, 0)
      ),
    },
  ];

  return (
    <ScrollView style={styles.scroll}>
      <SafeAreaView>
        <View style={styles.container}>
          {/* This Month Stats */}
          <Card>
            <ThemedText type="title">
              {i18n.t("workouts.thisMonth")}
            </ThemedText>
            <View style={styles.statsRow}>
              {totalStats.map((stat) => (
                <View key={stat.label} style={styles.statItem}>
                  <ThemedText type="monospace" style={styles.statValue}>
                    {stat.value}
                  </ThemedText>
                  <ThemedText type="secondary">
                    {stat.label}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>

          {/* Last 7 Days Workouts List */}
          <WorkoutList workouts={last7DaysWorkouts} allWorkouts={allWorkouts} />
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  container: {
    flex: 1,
    paddingVertical: 16,
    gap: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 36,
  },
});
