import { useContext } from "react";
import { FlatList, ListRenderItem, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { WorkoutItem } from "@/components/workouts";
import { HealthDataContext } from "@/context/HealthDataContext";
import { formatDurationHHMM } from "@/lib/formatters";
import { processWorkoutData } from "@/lib/health/workouts";
import i18n from "@/lib/i18n";
import { WorkoutData } from "@/lib/workouts/config";

export default function WorkoutsScreen() {
  const { data } = useContext(HealthDataContext);
  const { allWorkouts, last7DaysWorkouts, monthStats } = processWorkoutData(
    data.workouts
  );

  // Format stats for display
  const totalStats = [
    {
      label: i18n.t("workouts.workoutsCount"),
      value: monthStats.totalWorkouts,
    },
    {
      label: i18n.t("workouts.totalTime"),
      value: formatDurationHHMM(monthStats.totalDurationMinutes),
    },
    {
      label: i18n.t("workouts.calories"),
      value: monthStats.totalCalories,
    },
  ];

  const renderWorkoutItem: ListRenderItem<WorkoutData> = ({ item }) => (
    <WorkoutItem workout={item} />
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Card>
        <ThemedText type="title">{i18n.t("workouts.thisMonth")}</ThemedText>
        <View style={styles.statsRow}>
          {totalStats.map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <ThemedText type="monospace" style={styles.statValue}>
                {stat.value}
              </ThemedText>
              <ThemedText type="secondary">{stat.label}</ThemedText>
            </View>
          ))}
        </View>
      </Card>

      <ThemedText type="title" style={styles.sectionTitle}>
        {i18n.t("workouts.last7Days")}
      </ThemedText>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyText}>
        {allWorkouts.length === 0
          ? i18n.t("workouts.noWorkoutData")
          : i18n.t("workouts.noWorkoutsLast7Days")}
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <FlatList
        data={last7DaysWorkouts}
        renderItem={renderWorkoutItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.flatListContent}
        style={styles.flatList}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 64,
  },
  headerContainer: {
    marginBottom: 16,
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
  sectionTitle: {
    marginTop: 16,
  },
  separator: {
    height: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.7,
  },
});
