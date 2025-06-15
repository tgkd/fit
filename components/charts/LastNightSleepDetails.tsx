import React from "react";
import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { formatDurationHHMM } from "@/lib/formatters";
import { LastNightSleep } from "@/lib/health/types";
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
  lastNight: LastNightSleep;
}

export function LastNightSleepDetails({
  lastNight,
}: LastNightSleepDetailsProps) {
  return (
    <View style={styles.container}>
      <View>
        <ThemedText type="subtitle" size="md">
          {i18n.t("sleep.lastNightsSleep")}
        </ThemedText>
        <ThemedText type="secondary" size="sm">
          {i18n.t("sleep.todayVsPrior30Days")}
        </ThemedText>
      </View>

      <View>
        <ThemedText type="secondary" size="xxs">
          {i18n.t("sleep.hoursOfSleep")}
        </ThemedText>
        <View style={styles.sleepTimeRow}>
          <ThemedText type="title" size="xxl">
            {lastNight.totalSleepTime}
          </ThemedText>
          <ThemedText type="secondary" size="md">
            {lastNight.averageSleepTime}
          </ThemedText>
        </View>
      </View>

      <View style={styles.rangeHeader}>
        <ThemedText type="secondary" size="xs">
          {i18n.t("sleep.typicalRange") + " TODO CALC"}
        </ThemedText>
        <ThemedText type="secondary" size="xxs">
          {i18n.t("sleep.duration")} {lastNight.timeInBed}
        </ThemedText>
      </View>

      <SleepStageRow
        name={i18n.t("sleep.awake")}
        percentage={lastNight.stages.awake.percentage}
        duration={lastNight.stages.awake.duration}
        color={lastNight.stages.awake.color}
      />
      <SleepStageRow
        name={i18n.t("sleep.light")}
        percentage={lastNight.stages.light.percentage}
        duration={lastNight.stages.light.duration}
        color={lastNight.stages.light.color}
      />
      <SleepStageRow
        name={i18n.t("sleep.deep")}
        percentage={lastNight.stages.deep.percentage}
        duration={lastNight.stages.deep.duration}
        color={lastNight.stages.deep.color}
      />
      <SleepStageRow
        name={i18n.t("sleep.rem")}
        percentage={lastNight.stages.rem.percentage}
        duration={lastNight.stages.rem.duration}
        color={lastNight.stages.rem.color}
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
