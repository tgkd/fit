import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { formatDateForWorkout, formatDuration, getWorkoutTypeColor, getWorkoutTypeIcon, WorkoutData } from "@/components/workouts";
import i18n from "@/lib/i18n";
import { HKWorkoutActivityType } from "@kingstinct/react-native-healthkit";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WorkoutDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse workout data from params
  const workout: WorkoutData = {
    id: params.id as string,
    type: parseInt(params.type as string) as HKWorkoutActivityType,
    duration: parseInt(params.duration as string),
    date: new Date(params.date as string),
    calories: parseInt(params.calories as string),
  };

  const { day, month } = formatDateForWorkout(workout.date);
  const fullDate = workout.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const startTime = workout.date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header with back button */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText size="lg">← {i18n.t("common.back")}</ThemedText>
          </Pressable>
        </View>

        {/* Workout Title Card */}
        <Card>
          <View style={styles.titleSection}>
            <View
              style={[
                styles.colorIndicator,
                { backgroundColor: getWorkoutTypeColor(workout.type) }
              ]}
            />
            <View style={styles.titleContent}>
              <ThemedText type="title" size="xl">
                {getWorkoutTypeIcon(workout.type)} {HKWorkoutActivityType[workout.type]}
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                {fullDate}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Quick Stats */}
        <Card>
          <ThemedText type="subtitle">{i18n.t("workouts.quickStats")}</ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText type="defaultSemiBold" size="xxl" style={styles.statNumber}>
                {formatDuration(workout.duration)}
              </ThemedText>
              <ThemedText style={styles.statLabel}>{i18n.t("workouts.duration")}</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="defaultSemiBold" size="xxl" style={styles.statNumber}>
                {workout.calories}
              </ThemedText>
              <ThemedText style={styles.statLabel}>{i18n.t("workouts.calories")}</ThemedText>
            </View>
          </View>
        </Card>

        {/* Workout Details */}
        <Card>
          <ThemedText type="subtitle">{i18n.t("workouts.details")}</ThemedText>
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>{i18n.t("workouts.startTime")}</ThemedText>
              <ThemedText type="defaultSemiBold">{startTime}</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>{i18n.t("workouts.workoutType")}</ThemedText>
              <ThemedText type="defaultSemiBold">{HKWorkoutActivityType[workout.type]}</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>{i18n.t("workouts.totalDuration")}</ThemedText>
              <ThemedText type="defaultSemiBold">{formatDuration(workout.duration)}</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>{i18n.t("workouts.caloriesBurned")}</ThemedText>
              <ThemedText type="defaultSemiBold">{workout.calories} cal</ThemedText>
            </View>
          </View>
        </Card>

        {/* Additional Info */}
        <Card>
          <ThemedText type="subtitle">{i18n.t("workouts.additionalInfo")}</ThemedText>
          <View style={styles.infoSection}>
            <ThemedText style={styles.infoText}>
              {i18n.t("workouts.workoutRecorded")} {workout.date.toLocaleDateString()}
            </ThemedText>
            <ThemedText style={styles.infoText}>
              {i18n.t("workouts.avgCaloriesPerMinute")}: {Math.round(workout.calories / workout.duration)} cal/min
            </ThemedText>
          </View>
        </Card>
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
  header: {
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  titleSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorIndicator: {
    width: 6,
    height: 60,
    borderRadius: 3,
    marginRight: 16,
  },
  titleContent: {
    flex: 1,
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    marginBottom: 4,
  },
  statLabel: {
    opacity: 0.7,
  },
  detailsList: {
    marginTop: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    opacity: 0.7,
  },
  infoSection: {
    marginTop: 16,
    gap: 8,
  },
  infoText: {
    opacity: 0.7,
    lineHeight: 20,
  },
});