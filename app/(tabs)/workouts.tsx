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
      const duration = (new Date(workout.endDate).getTime() - new Date(workout.startDate).getTime()) / (1000 * 60); // minutes

      return {
        id: workout.uuid || `workout-${index}`,
        type: workout.workoutActivityType,
        duration: Math.round(duration),
        date: new Date(workout.startDate),
        calories: Math.round(workout.totalEnergyBurned?.quantity || 0),
      };
    }).sort((a: WorkoutData, b: WorkoutData) => b.date.getTime() - a.date.getTime()); // Sort by most recent first
  };

  const workouts = convertToWorkouts();

  // Get workouts from last 7 days
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const lastWeekWorkouts = workouts.filter(workout => {
    return workout.date >= lastWeek && workout.date <= today;
  });

  // Get workouts from this month
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthWorkouts = workouts.filter(workout => {
    return workout.date >= thisMonth && workout.date <= today;
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Monthly Summary */}
        <Card>
          <ThemedText type="title">{i18n.t("workouts.thisMonth")}</ThemedText>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText type="defaultSemiBold" size="xxl" style={styles.summaryNumber}>
                {thisMonthWorkouts.length}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>{i18n.t("workouts.workoutsCount")}</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText type="defaultSemiBold" size="xxl" style={styles.summaryNumber}>
                {Math.round(thisMonthWorkouts.reduce((sum, w) => sum + w.duration, 0) / 60)}h
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>{i18n.t("workouts.totalTime")}</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText type="defaultSemiBold" size="xxl" style={styles.summaryNumber}>
                {thisMonthWorkouts.reduce((sum, w) => sum + w.calories, 0)}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>{i18n.t("workouts.calories")}</ThemedText>
            </View>
          </View>
        </Card>

        {/* Last Week's Workouts */}
        <WorkoutList workouts={lastWeekWorkouts} allWorkouts={workouts} />

        {/* All Time Stats */}
        {workouts.length > 0 && (
          <Card>
            <ThemedText type="subtitle">{i18n.t("workouts.allTime")}</ThemedText>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <ThemedText type="defaultSemiBold" style={styles.summaryNumber}>
                  {workouts.length}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>{i18n.t("workouts.totalWorkouts")}</ThemedText>
              </View>
              <View style={styles.summaryItem}>
                <ThemedText type="defaultSemiBold" style={styles.summaryNumber}>
                  {Math.round(workouts.reduce((sum, w) => sum + w.duration, 0) / 60)}h
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>{i18n.t("workouts.totalTime")}</ThemedText>
              </View>
              <View style={styles.summaryItem}>
                <ThemedText type="defaultSemiBold" style={styles.summaryNumber}>
                  {workouts.length > 0 ? Math.round(workouts.reduce((sum, w) => sum + w.calories, 0) / workouts.length) : 0}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>{i18n.t("workouts.avgCalories")}</ThemedText>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 46,
    rowGap: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryNumber: {
    marginBottom: 4,
  },
  summaryLabel: {
    opacity: 0.7,
  },
});