import React, { use } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/Colors";
import { HealthDataContext } from "@/context/HealthDataContext";

export function DateSlider() {
  const {
    date,
    loading,
    setPreviousDate,
    setNextDate,
    setToday,
    isToday,
    formatDate,
  } = use(HealthDataContext);

  return (
    <Card style={styles.dateNavigationContainer}>
      <Pressable
        style={[styles.dateButton, loading && styles.dateButtonDisabled]}
        onPress={setPreviousDate}
        disabled={loading}
      >
        <ThemedText
          type="defaultSemiBold"
          size="lg"
          lightColor={loading ? Colors.light.textSecondary : Colors.light.text}
          darkColor={loading ? Colors.dark.textSecondary : Colors.dark.text}
        >
          ‹
        </ThemedText>
      </Pressable>

      <Pressable
        style={[
          styles.dateDisplayContainer,
          loading && styles.dateButtonDisabled,
        ]}
        onPress={setToday}
        disabled={isToday() || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Colors.light.tint} />
        ) : (
          <ThemedText
            type="defaultSemiBold"
            size="md"
            lightColor={isToday() ? Colors.light.text : Colors.light.tint}
            darkColor={isToday() ? Colors.dark.text : Colors.dark.tint}
          >
            {formatDate(date)}
          </ThemedText>
        )}
      </Pressable>

      <Pressable
        style={[
          styles.dateButton,
          (isToday() || loading) && styles.dateButtonDisabled,
        ]}
        onPress={setNextDate}
        disabled={isToday() || loading}
      >
        <ThemedText
          type="defaultSemiBold"
          size="lg"
          lightColor={
            isToday() || loading
              ? Colors.light.textSecondary
              : Colors.light.text
          }
          darkColor={
            isToday() || loading ? Colors.dark.textSecondary : Colors.dark.text
          }
        >
          ›
        </ThemedText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  circularChartsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 12,
  },
  dateNavigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dateButtonDisabled: {
    opacity: 0.3,
  },
  dateDisplayContainer: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
});
