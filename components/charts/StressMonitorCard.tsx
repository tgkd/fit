import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";
import type { HealthData } from "@/lib/health/types";
import i18n from "@/lib/i18n";
import { StressVisualization } from "./StressVisualization";

interface StressMonitorCardProps {
  healthData: HealthData | null;
  onPress?: () => void;
}

export function StressMonitorCard({
  healthData,
  onPress,
}: StressMonitorCardProps) {
  const backgroundColor = useThemeColor({}, "background");
  const iconColorSecondary = useThemeColor({}, "textSecondary");

  if (!healthData || !healthData.stressChartDisplayData) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ThemedText>
          {healthData
            ? i18n.t("stressMonitor.noData")
            : i18n.t("stressMonitor.loadingData")}
        </ThemedText>
      </View>
    );
  }

  const { chartPlotData, yDomainForVisualization, lastUpdatedDisplay } =
    healthData.stressChartDisplayData;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View>
          <ThemedText size="md">{i18n.t("stressMonitor.title")}</ThemedText>
          <ThemedText size="xs" type="secondary">
            Last 24 Hours
          </ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={16} color={iconColorSecondary} />
      </View>

      <ThemedText size="xs">
        {i18n.t("stressMonitor.lastUpdated", { time: lastUpdatedDisplay })}
      </ThemedText>

      <View style={styles.chartOuterContainer}>
        <StressVisualization
          data={chartPlotData}
          yDomain={yDomainForVisualization}
          height={180}
          showXAxisTicks={3}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // Changed from "center" to accommodate multiple lines
    marginBottom: 8,
  },
  chartOuterContainer: {
    minHeight: 180,
    marginTop: 10,
  },
  chartVisualizationContainer: {
    height: 180,
  },
});
