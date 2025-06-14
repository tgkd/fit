import { useThemeColor } from "@/hooks/useThemeColor";
import { LastNightSleep } from "@/lib/health/types";
import i18n from "@/lib/i18n";
import React from "react";
import { StyleSheet, View } from "react-native";
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
  isTypicalRange = false,
}: SleepStageRowProps) {
  const textColor = useThemeColor({}, "text");

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}:${mins.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.stageRow}>
      <View style={styles.stageInfo}>
        <View style={[styles.colorIndicator, { backgroundColor: color }]} />
        <ThemedText style={[styles.stageName, { color: textColor }]}>
          {name}
        </ThemedText>
        <ThemedText style={[styles.stagePercentage, { color: textColor }]}>
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
          {isTypicalRange && <View style={styles.typicalRangeIndicator} />}
        </View>

        <ThemedText style={[styles.durationText, { color: textColor }]}>
          {formatDuration(duration)}
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
  const textColor = useThemeColor({}, "text");
  const subtextColor = useThemeColor({}, "tabIconDefault");

  return (
    <>
      <View style={styles.header}>
        <ThemedText style={[styles.headerTitle, { color: textColor }]}>
          {i18n.t("sleep.lastNightsSleep")}
        </ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: subtextColor }]}>
          {i18n.t("sleep.todayVsPrior30Days")}
        </ThemedText>
      </View>

      <View style={styles.sleepTimeContainer}>
        <ThemedText style={[styles.sleepTimeLabel, { color: subtextColor }]}>
          {i18n.t("sleep.hoursOfSleep")}
        </ThemedText>
        <View style={styles.sleepTimeRow}>
          <ThemedText style={[styles.sleepTimeMain, { color: textColor }]}>
            {lastNight.totalSleepTime}
          </ThemedText>
          <ThemedText
            style={[styles.sleepTimeAverage, { color: subtextColor }]}
          >
            {lastNight.averageSleepTime}
          </ThemedText>
        </View>
      </View>

      {/* TODO: Add sleep timeline chart here */}
      <View style={styles.chartPlaceholder}>
        <ThemedText style={[styles.chartText, { color: subtextColor }]}>
          Sleep Timeline Chart (To be implemented)
        </ThemedText>
      </View>

      <View style={styles.rangeHeader}>
        <View style={styles.rangeInfo}>
          <ThemedText style={[styles.rangeIcon, { color: subtextColor }]}>
            📊
          </ThemedText>
          <ThemedText style={[styles.rangeLabel, { color: subtextColor }]}>
            {i18n.t("sleep.typicalRange")}
          </ThemedText>
        </View>
        <ThemedText style={[styles.durationLabel, { color: subtextColor }]}>
          {i18n.t("sleep.duration")} {lastNight.timeInBed}
        </ThemedText>
      </View>

      <View style={styles.stagesContainer}>
        <SleepStageRow
          name={i18n.t("sleep.awake")}
          percentage={lastNight.stages.awake.percentage}
          duration={lastNight.stages.awake.duration}
          color={lastNight.stages.awake.color}
          isTypicalRange
        />
        <SleepStageRow
          name={i18n.t("sleep.light")}
          percentage={lastNight.stages.light.percentage}
          duration={lastNight.stages.light.duration}
          color={lastNight.stages.light.color}
          isTypicalRange
        />
        <SleepStageRow
          name={i18n.t("sleep.deep")}
          percentage={lastNight.stages.deep.percentage}
          duration={lastNight.stages.deep.duration}
          color={lastNight.stages.deep.color}
          isTypicalRange
        />
        <SleepStageRow
          name={i18n.t("sleep.rem")}
          percentage={lastNight.stages.rem.percentage}
          duration={lastNight.stages.rem.duration}
          color={lastNight.stages.rem.color}
          isTypicalRange
        />
      </View>

      <View style={styles.restorativeContainer}>
        <View
          style={[styles.restorativeIndicator, { backgroundColor: "#9C27B0" }]}
        />
        <ThemedText style={[styles.restorativeLabel, { color: textColor }]}>
          {i18n.t("sleep.restorativeSleep")}
        </ThemedText>
        <View style={styles.restorativeTime}>
          <ThemedText style={[styles.restorativeMain, { color: textColor }]}>
            {lastNight.restorativeSleep.duration}
          </ThemedText>
          <ThemedText
            style={[styles.restorativeAverage, { color: subtextColor }]}
          >
            {lastNight.restorativeSleep.averageDuration}
          </ThemedText>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  sleepTimeContainer: {
    marginBottom: 24,
  },
  sleepTimeLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
  },
  sleepTimeRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  sleepTimeMain: {
    fontSize: 36,
    fontWeight: "bold",
    marginRight: 8,
  },
  sleepTimeAverage: {
    fontSize: 18,
  },
  chartPlaceholder: {
    height: 120,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  chartText: {
    fontSize: 14,
  },
  rangeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  rangeInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  rangeIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  stagesContainer: {
    marginBottom: 24,
  },
  stageRow: {
    marginBottom: 16,
  },
  stageInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  stageName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  stagePercentage: {
    fontSize: 14,
    fontWeight: "600",
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
    backgroundColor: "#333333",
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
    fontSize: 14,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },
  restorativeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#333333",
  },
  restorativeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  restorativeLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  restorativeTime: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  restorativeMain: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 4,
  },
  restorativeAverage: {
    fontSize: 14,
  },
});
