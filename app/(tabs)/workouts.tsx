import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { WorkoutData, WorkoutList } from "@/components/workouts";
import { HealthDataContext } from "@/context/HealthDataContext";
import i18n from "@/lib/i18n";
import { useContext } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WorkoutsScreen() {
  const { data } = useContext(HealthDataContext);

  // Convert HealthKit workout data to our format
  const convertToWorkouts = (): WorkoutData[] => {
    if (!data.workouts || data.workouts.length === 0) {
      return [];
    }
    return data.workouts.map((workout: any, index: number) => {
      const duration = (new Date(workout.endDate).getTime() - new Date(workout.startDate).getTime()) / (1000 * 60); // duration in minutes
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

  const last7DaysWorkouts = allWorkouts.filter(workout =>
    workout.date >= sevenDaysAgo
  );

  return (
    <ScrollView style={styles.scrollView}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">{i18n.t("workouts.title")}</ThemedText>
          <ThemedText type="secondary" style={styles.subtitle}>
            {i18n.t("workouts.subtitle")}
          </ThemedText>
        </View>

        {/* This Month Stats */}
        <Card>
          <ThemedText type="subtitle">{i18n.t("workouts.thisMonth")}</ThemedText>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText type="title" size="lg">
                {allWorkouts.length}
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {i18n.t("workouts.workoutsCount")}
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" size="lg">
                {Math.round(allWorkouts.reduce((sum, w) => sum + w.duration, 0) / 60)}h
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {i18n.t("workouts.totalTime")}
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="title" size="lg">
                {Math.round(allWorkouts.reduce((sum, w) => sum + w.calories, 0))}
              </ThemedText>
              <ThemedText type="secondary" size="sm">
                {i18n.t("workouts.calories")}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Last 7 Days Workouts List */}
        <WorkoutList workouts={last7DaysWorkouts} allWorkouts={allWorkouts} />
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  subtitle: {
    marginTop: 4,
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
});