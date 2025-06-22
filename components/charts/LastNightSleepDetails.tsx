import React from "react";
import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { formatDurationHHMM } from "@/lib/formatters";
import { SleepAnalysis } from "@/lib/health/types";
import i18n from "@/lib/i18n";
import { ThemedText } from "../ThemedText";

interface SleepStageRowProps {
  name: string;
  percentage: number;
  duration: number; // in minutes
  color: string;
  isTypicalRange?: boolean;
}

function SleepStageRow({
  name,
  percentage,
  duration,
  color,
}: SleepStageRowProps) {
  return (
    <View>
      <View style={styles.stageInfo}>
        <View style={[styles.colorIndicator, { backgroundColor: color }]} />
        <ThemedText type="defaultSemiBold" size="sm" style={styles.stageName}>
          {name}
        </ThemedText>
        <ThemedText
          type="defaultSemiBold"
          size="sm"
          style={styles.stagePercentage}
        >
          {percentage}%
        </ThemedText>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: color,
                width: `${percentage}%`,
              },
            ]}
          />
        </View>

        <ThemedText
          type="defaultSemiBold"
          size="sm"
          style={styles.durationText}
        >
          {formatDurationHHMM(duration)}
        </ThemedText>
      </View>
    </View>
  );
}

interface LastNightSleepDetailsProps {
  sleep: SleepAnalysis;
}

export function LastNightSleepDetails({ sleep }: LastNightSleepDetailsProps) {
  return (
    <View style={styles.container}>
      <View>
        <ThemedText type="subtitle" size="md">
          {i18n.t("sleep.lastNightsSleep")}
        </ThemedText>

        <ThemedText size="md">
          {i18n.t("sleep.duration")} {sleep.totalSleepTime}
        </ThemedText>
        <ThemedText type="secondary" size="xxs">
          {i18n.t("sleep.inBed")} {sleep.timeInBed}
        </ThemedText>
      </View>

      <SleepStageRow
        name={i18n.t("sleep.awake")}
        percentage={sleep.stages.awake.percentage}
        duration={sleep.stages.awake.duration}
        color={sleep.stages.awake.color}
      />
      <SleepStageRow
        name={i18n.t("sleep.light")}
        percentage={sleep.stages.light.percentage}
        duration={sleep.stages.light.duration}
        color={sleep.stages.light.color}
      />
      <SleepStageRow
        name={i18n.t("sleep.deep")}
        percentage={sleep.stages.deep.percentage}
        duration={sleep.stages.deep.duration}
        color={sleep.stages.deep.color}
      />
      <SleepStageRow
        name={i18n.t("sleep.rem")}
        percentage={sleep.stages.rem.percentage}
        duration={sleep.stages.rem.duration}
        color={sleep.stages.rem.color}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    rowGap: 16,
  },
  sleepTimeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    columnGap: 12,
  },
  rangeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rangeInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  stageInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  stageName: {
    flex: 1,
  },
  stagePercentage: {
    minWidth: 40,
    textAlign: "right",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.charts.chartBackground,
    borderRadius: 4,
    marginRight: 12,
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  typicalRangeIndicator: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#666666",
    borderRadius: 1,
  },
  durationText: {
    minWidth: 40,
    textAlign: "right",
  },
});
