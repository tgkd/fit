import { Path, Rect, useFont } from "@shopify/react-native-skia";
import React, { use, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CartesianChart, type PointsArray, useLinePath } from "victory-native";

import { HeartRateZoneLegendModal } from "@/components/health/HeartRateZoneLegendModal";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/ui/Card";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { HealthDataContext } from "@/context/HealthDataContext";
import {
  calculateHeartRateZones,
  getHeartRateZone,
  useRealtimeHeartRate,
} from "@/hooks/useRealtimeHeartRate";
import { useThemeColor } from "@/hooks/useThemeColor";
import i18n from "@/lib/i18n";

export const RealtimeHeartRateMonitor = React.memo(
  function RealtimeHeartRateMonitor() {
    const { userParams } = use(HealthDataContext);
    const userAge = userParams.age;
    const [showLegendModal, setShowLegendModal] = useState(false);
    const {
      dataPoints,
      currentHeartRate,
      isMonitoring,
      error,
      isHealthKitAvailable,
      hasPermission,
      startMonitoring,
      stopMonitoring,
    } = useRealtimeHeartRate();

    const font = useFont(require("@/assets/fonts/Hikasami-Regular.ttf"), 12);
    const themedTextColor = useThemeColor({}, "text");
    const themedGridColor = useThemeColor({}, "textSecondary");
    const tintColor = useThemeColor({}, "tint");

    const heartRateZones = useMemo(
      () => calculateHeartRateZones(userAge),
      [userAge]
    );

    const currentZone = useMemo(
      () =>
        currentHeartRate ? getHeartRateZone(currentHeartRate, userAge) : null,
      [currentHeartRate, userAge]
    );

    const chartData = useMemo(() => {
      if (dataPoints.length < 2) return [];

      return dataPoints.map((point, index) => ({
        x: index,
        y: point.value,
        timestamp: point.timestamp,
      }));
    }, [dataPoints]);

    const handleToggleMonitoring = useCallback(() => {
      if (isMonitoring) {
        stopMonitoring();
      } else {
        startMonitoring();
      }
    }, [isMonitoring, startMonitoring, stopMonitoring]);

    const yDomain: [number, number] = useMemo(() => {
      if (chartData.length === 0) return [60, 200];

      const values = chartData.map((d) => d.y);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const padding = (max - min) * 0.1;

      return [Math.max(40, min - padding), max + padding];
    }, [chartData]);

    const xDomain: [number, number] = useMemo(() => {
      if (chartData.length === 0) return [0, 1];
      return [0, chartData.length - 1];
    }, [chartData]);

    return (
      <Card>
        <ThemedView style={styles.header}>
          <ThemedView style={styles.titleContainer}>
            <IconSymbol
              name="heart.fill"
              size={20}
              color={tintColor}
              style={styles.titleIcon}
            />
            <ThemedText type="subtitle">{i18n.t("heartRate.title")}</ThemedText>
            <Pressable
              style={styles.iconButton}
              onPress={() => setShowLegendModal(true)}
            >
              <IconSymbol
                name="info.circle"
                size={18}
                color={themedTextColor}
              />
            </Pressable>
          </ThemedView>
          <ThemedView style={styles.headerControls}>
            <Pressable
              style={[
                styles.iconButton,
                {
                  backgroundColor: isMonitoring
                    ? Colors.heartRate.error
                    : tintColor,
                },
                (!isHealthKitAvailable || !hasPermission) &&
                  styles.disabledButton,
              ]}
              onPress={handleToggleMonitoring}
              disabled={!isHealthKitAvailable || !hasPermission}
            >
              <IconSymbol
                name={isMonitoring ? "stop.fill" : "play.fill"}
                size={16}
                color="white"
              />
            </Pressable>
          </ThemedView>
        </ThemedView>

        {/* Current Heart Rate Display */}
        <ThemedView style={styles.currentRateContainer}>
          <ThemedView style={styles.currentRateBox}>
            <ThemedText
              size="xxl"
              type="monospace"
              style={[{ color: currentZone?.color || themedTextColor }]}
            >
              {currentHeartRate ? Math.round(currentHeartRate) : "--"}
            </ThemedText>
            <ThemedText size="lg" type="secondary">
              {i18n.t("heartRate.bpm")}
            </ThemedText>
          </ThemedView>

          {currentZone && (
            <ThemedView style={styles.zoneInfo}>
              <View
                style={[
                  styles.zoneIndicator,
                  { backgroundColor: currentZone.color },
                ]}
              />
              <ThemedText type="footnote">
                {currentZone.name} {i18n.t("heartRate.zoneLabel")}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        {/* Chart */}
        <View style={styles.chartContainer}>
          {chartData.length > 1 ? (
            <CartesianChart
              data={chartData}
              xKey="x"
              yKeys={["y"]}
              domain={{ y: yDomain, x: xDomain }}
              axisOptions={{
                font,
                labelColor: themedTextColor,
                lineColor: {
                  grid: { x: "transparent", y: themedGridColor },
                  frame: "transparent",
                },
                tickCount: {
                  x: 4,
                  y: 5,
                },
                formatXLabel: () => "", // Hide x labels for cleaner look
                formatYLabel: (value) => `${Math.round(value as number)}`,
              }}
            >
              {({ points, chartBounds }) => (
                <>
                  <HeartRateZoneBackground
                    zones={heartRateZones}
                    yDomain={yDomain}
                    chartBounds={chartBounds}
                  />
                  <HeartRateLine points={points.y} currentZone={currentZone} />
                </>
              )}
            </CartesianChart>
          ) : (
            <View style={styles.noDataContainer}>
              <ThemedText type="secondary" size="md" style={styles.noDataText}>
                {isMonitoring
                  ? i18n.t("heartRate.waitingForData")
                  : i18n.t("heartRate.startToSeeData")}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Status and Error Display */}
        {!isHealthKitAvailable && (
          <ThemedView style={styles.warningContainer}>
            <ThemedText type="footnote" style={styles.warningText}>
              {i18n.t("heartRate.healthKitUnavailable")}
            </ThemedText>
          </ThemedView>
        )}

        {isHealthKitAvailable && !hasPermission && (
          <ThemedView style={styles.warningContainer}>
            <ThemedText type="footnote" style={styles.warningText}>
              {i18n.t("heartRate.permissionDenied")}
            </ThemedText>
          </ThemedView>
        )}

        {error && (
          <ThemedView style={styles.errorContainer}>
            <ThemedText type="footnote" style={styles.errorText}>
              {error}
            </ThemedText>
          </ThemedView>
        )}

        <HeartRateZoneLegendModal
          visible={showLegendModal}
          onClose={() => setShowLegendModal(false)}
          userAge={userAge}
        />
      </Card>
    );
  }
);

interface HeartRateLineProps {
  points: PointsArray;
  currentZone: { color: string } | null;
}

const HeartRateLine = React.memo(function HeartRateLine({
  points,
  currentZone,
}: HeartRateLineProps) {
  const { path } = useLinePath(points);
  const strokeColor = currentZone?.color || Colors.heartRate.defaultStroke;

  return (
    <Path path={path} style="stroke" strokeWidth={3} color={strokeColor} />
  );
});

interface HeartRateZoneBackgroundProps {
  zones: ReturnType<typeof calculateHeartRateZones>;
  yDomain: [number, number];
  chartBounds: { left: number; top: number; right: number; bottom: number };
}

const HeartRateZoneBackground = React.memo(function HeartRateZoneBackground({
  zones,
  yDomain,
  chartBounds,
}: HeartRateZoneBackgroundProps) {
  const zoneColors = [
    { range: zones.zone1, color: Colors.heartRate.zones.recovery + "20" }, // Recovery - Green
    { range: zones.zone2, color: Colors.heartRate.zones.base + "20" }, // Base - Light Green
    { range: zones.zone3, color: Colors.heartRate.zones.aerobic + "20" }, // Aerobic - Yellow
    { range: zones.zone4, color: Colors.heartRate.zones.threshold + "20" }, // Threshold - Orange
    { range: zones.zone5, color: Colors.heartRate.zones.anaerobic + "20" }, // Anaerobic - Red
  ];

  const yRange = yDomain[1] - yDomain[0];

  return (
    <>
      {zoneColors.map((zone, index) => {
        // Calculate where this zone falls within our y domain
        const zoneStart = Math.max(zone.range[0], yDomain[0]);
        const zoneEnd = Math.min(zone.range[1], yDomain[1]);

        // Skip if zone is completely outside our domain
        if (zoneStart >= zoneEnd) return null;

        // Calculate positions as percentages of chart height
        const startPercent = (yDomain[1] - zoneEnd) / yRange;
        const endPercent = (yDomain[1] - zoneStart) / yRange;

        const rectTop =
          chartBounds.top +
          startPercent * (chartBounds.bottom - chartBounds.top);
        const rectHeight =
          (endPercent - startPercent) * (chartBounds.bottom - chartBounds.top);

        return (
          <Rect
            key={index}
            x={chartBounds.left}
            y={rectTop}
            width={chartBounds.right - chartBounds.left}
            height={rectHeight}
            color={zone.color}
          />
        );
      })}
    </>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleIcon: {
    marginRight: 4,
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  currentRateContainer: {
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  currentRateBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  zoneInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  zoneIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chartContainer: {
    height: 200,
    marginVertical: 16,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: Colors.ui.errorBackground,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  errorText: {
    color: Colors.heartRate.error,
    textAlign: "center",
  },
  warningContainer: {
    backgroundColor: Colors.ui.warningBackground,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  warningText: {
    color: Colors.heartRate.warning,
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
