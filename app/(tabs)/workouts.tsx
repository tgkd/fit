import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { HealthDataContext } from "@/context/HealthDataContext";
import { HKWorkoutActivityType } from "@kingstinct/react-native-healthkit";
import { useContext } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface WorkoutData {
  id: string;
  type: HKWorkoutActivityType;
  duration: number; // in minutes
  date: Date;
  calories: number;
}

export default function WorkoutsScreen() {
  const { data } = useContext(HealthDataContext);

  // Convert HealthKit workout data to our format
  const convertToWorkouts = (): WorkoutData[] => {
    if (!data.workouts || data.workouts.length === 0) {
      return [];
    }
    return data.workouts.map((workout, index) => {
      const duration = (new Date(workout.endDate).getTime() - new Date(workout.startDate).getTime()) / (1000 * 60); // minutes

      return {
        id: workout.uuid || `workout-${index}`,
        type: workout.workoutActivityType,
        duration: Math.round(duration),
        date: new Date(workout.startDate),
        calories: Math.round(workout.totalEnergyBurned?.quantity || 0),
      };
    }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by most recent first
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getWorkoutTypeColor = (type: HKWorkoutActivityType) => {
    if (type == HKWorkoutActivityType.running || type == HKWorkoutActivityType.cycling) {
      return "#FF6B8A";
    } else if (type == HKWorkoutActivityType.functionalStrengthTraining) {
      return "#FFB347";
    } else if (type == HKWorkoutActivityType.yoga) {
      return "#98D8C8";
    } else if (type == HKWorkoutActivityType.swimming) {
      return "#87CEEB";
    } else if (type == HKWorkoutActivityType.tennis) {
      return "#b5e48c";
    } else if (type == HKWorkoutActivityType.soccer) {
      return "#B19CD9";
    } else {
      return "#C8A2C8";
    }
  };

  const getWorkoutTypeIcon = (type: HKWorkoutActivityType) => {
    if (type == HKWorkoutActivityType.running) {
      return "🏃";
    } else if (type == HKWorkoutActivityType.cycling) {
      return "🚴";
    } else if (type == HKWorkoutActivityType.functionalStrengthTraining) {
      return "💪";
    } else if (type == HKWorkoutActivityType.yoga) {
      return "🧘";
    } else if (type == HKWorkoutActivityType.swimming) {
      return "🏊";
    } else if (type == HKWorkoutActivityType.tennis) {
      return "🎾";
    } else if (type == HKWorkoutActivityType.soccer) {
      return "⚽";
    } else {
      return "🏅";
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <ThemedText type="title">Workouts</ThemedText>
          <ThemedText>Track and manage your workouts from HealthKit</ThemedText>
        </Card>

        {/* Monthly Summary */}
        <Card>
          <ThemedText type="subtitle">This Month</ThemedText>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText type="defaultSemiBold" style={styles.summaryNumber}>
                {thisMonthWorkouts.length}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Workouts</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText type="defaultSemiBold" style={styles.summaryNumber}>
                {Math.round(thisMonthWorkouts.reduce((sum, w) => sum + w.duration, 0) / 60)}h
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Total Time</ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText type="defaultSemiBold" style={styles.summaryNumber}>
                {thisMonthWorkouts.reduce((sum, w) => sum + w.calories, 0)}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Calories</ThemedText>
            </View>
          </View>
        </Card>

        {/* Last Week's Workouts */}
        <Card>
          <ThemedText type="subtitle">Last 7 Days</ThemedText>
          {lastWeekWorkouts.length > 0 ? (
            <View style={styles.workoutsList}>
              {lastWeekWorkouts.map((workout) => (
                <View key={workout.id} style={styles.workoutItem}>
                  <View style={styles.workoutHeader}>
                    <ThemedText size="xl">{getWorkoutTypeIcon(workout.type)}</ThemedText>
                    <ThemedText size="sm" style={styles.workoutDate}>
                      {formatDate(workout.date)}
                    </ThemedText>
                  </View>
                  <View style={styles.workoutDetails}>
                    <View style={[
                      styles.workoutTag,
                      {
                        backgroundColor: `${getWorkoutTypeColor(workout.type)}`, // Slightly more opaque background
                      }
                    ]}>
                      <ThemedText size="sm" style={[
                        styles.workoutTagText,
                        {
                          color: '#FFFFFF', // White text for better contrast
                          fontWeight: '600', // Semi-bold for better readability
                        }
                      ]}>
                        {HKWorkoutActivityType[workout.type]}
                      </ThemedText>
                    </View>
                    <ThemedText size="sm" style={styles.workoutMeta}>
                      {formatDuration(workout.duration)}
                      {workout.calories > 0 && ` • ${workout.calories} cal`}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText style={styles.emptyText}>
              {workouts.length === 0
                ? "No workout data available from HealthKit. Start a workout on your Apple Watch or iPhone to see data here."
                : "No workouts in the last 7 days"
              }
            </ThemedText>
          )}
        </Card>

        {/* All Time Stats */}
        {workouts.length > 0 && (
          <Card>
            <ThemedText type="subtitle">All Time</ThemedText>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <ThemedText type="defaultSemiBold" style={styles.summaryNumber}>
                  {workouts.length}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>Total Workouts</ThemedText>
              </View>
              <View style={styles.summaryItem}>
                <ThemedText type="defaultSemiBold" style={styles.summaryNumber}>
                  {Math.round(workouts.reduce((sum, w) => sum + w.duration, 0) / 60)}h
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>Total Time</ThemedText>
              </View>
              <View style={styles.summaryItem}>
                <ThemedText type="defaultSemiBold" style={styles.summaryNumber}>
                  {workouts.length > 0 ? Math.round(workouts.reduce((sum, w) => sum + w.calories, 0) / workouts.length) : 0}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>Avg Calories</ThemedText>
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
    fontSize: 24,
    marginBottom: 4,
  },
  summaryLabel: {
    opacity: 0.7,
  },
  workoutsList: {
    marginTop: 16,
    gap: 12,
  },
  workoutItem: {
    padding: 12,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
    borderRadius: 8,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  workoutDate: {
    opacity: 0.7,
  },
  workoutDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workoutTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  workoutTagText: {
    fontWeight: "500",
  },
  workoutMeta: {
    opacity: 0.7,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 16,
    opacity: 0.7,
  },
});