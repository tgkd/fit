import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { CartesianChart, Line, useChartPressState } from "victory-native";

import { ThemedText } from "@/components/ThemedText";
import { WorkoutData } from "@/lib/workouts/config";

interface WorkoutDetailsChartProps {
  workout: WorkoutData;
}

export function WorkoutDetailsChart({ workout }: WorkoutDetailsChartProps) {
  const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });
  const [touchInfo, setTouchInfo] = useState<{
    minute: number;
    heartRate: number;
    zone: string;
    zoneColor: string;
  } | null>(null);

  // Generate heart rate data from HealthKit samples or fallback to mock data
  const heartRateData = useMemo(() => {
    // If we have real heart rate samples, use them
    if (workout.heartRateSamples && workout.heartRateSamples.length > 0) {
      const workoutStartTime = workout.date.getTime();

      return workout.heartRateSamples.map(sample => {
        // Convert timestamp to minutes from workout start
        const timeMinutes = (sample.timestamp.getTime() - workoutStartTime) / (1000 * 60);
        return {
          x: Math.max(0, Math.min(workout.duration, timeMinutes)), // Clamp within workout duration
          y: sample.value
        };
      }).filter(point => point.x >= 0 && point.x <= workout.duration) // Filter points within workout
        .sort((a, b) => a.x - b.x); // Sort by time
    }

    // Fallback to mock data if no real samples or no heart rate stats available
    if (!workout.averageHeartRate || !workout.minHeartRate || !workout.maxHeartRate) {
      // If no heart rate data at all, return empty array
      return [];
    }

    // Generate mock data as before
    const dataPoints = [];
    const durationMinutes = workout.duration;
    const numPoints = Math.min(durationMinutes, 60); // Max 60 points for performance
    const interval = durationMinutes / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const timeMinutes = i * interval;
      // Generate realistic heart rate variation based on workout phases
      let heartRate;

      if (timeMinutes < durationMinutes * 0.1) {
        // Warm-up phase: gradual increase
        heartRate = workout.minHeartRate + (workout.averageHeartRate - workout.minHeartRate) * (timeMinutes / (durationMinutes * 0.1));
      } else if (timeMinutes > durationMinutes * 0.9) {
        // Cool-down phase: gradual decrease
        const cooldownProgress = (timeMinutes - durationMinutes * 0.9) / (durationMinutes * 0.1);
        heartRate = workout.averageHeartRate - (workout.averageHeartRate - workout.minHeartRate) * cooldownProgress;
      } else {
        // Main workout: fluctuate around average with occasional peaks
        const baseRate = workout.averageHeartRate;
        const variation = Math.sin(timeMinutes * 0.5) * 15 + Math.random() * 10 - 5;
        const peakChance = Math.random();
        if (peakChance < 0.05) {
          // 5% chance of peak near max
          heartRate = Math.min(workout.maxHeartRate, baseRate + 30 + variation);
        } else {
          heartRate = baseRate + variation;
        }
      }

      dataPoints.push({
        x: timeMinutes,
        y: Math.round(Math.max(workout.minHeartRate - 10, Math.min(workout.maxHeartRate + 5, heartRate)))
      });
    }

    return dataPoints;
  }, [workout.duration, workout.date, workout.heartRateSamples, workout.minHeartRate, workout.averageHeartRate, workout.maxHeartRate]);

  // Calculate heart rate zones based on max heart rate
  const heartRateZones = useMemo(() => {
    const maxHR = workout.maxHeartRate || 190; // fallback if no max HR
    return {
      zone1: { min: Math.round(maxHR * 0.5), max: Math.round(maxHR * 0.6), name: "Recovery", color: "#E3F2FD" },
      zone2: { min: Math.round(maxHR * 0.6), max: Math.round(maxHR * 0.7), name: "Fat Burn", color: "#C8E6C9" },
      zone3: { min: Math.round(maxHR * 0.7), max: Math.round(maxHR * 0.8), name: "Aerobic", color: "#FFF9C4" },
      zone4: { min: Math.round(maxHR * 0.8), max: Math.round(maxHR * 0.9), name: "Anaerobic", color: "#FFCDD2" },
      zone5: { min: Math.round(maxHR * 0.9), max: maxHR, name: "Peak", color: "#F3E5F5" }
    };
  }, [workout.maxHeartRate]);

  // Calculate y-axis scale
  const heartRateRange = useMemo(() => {
    if (heartRateData.length === 0) {
      return { min: 60, max: 180 }; // Default range when no data
    }

    const minValue = Math.min(...heartRateData.map(d => d.y));
    const maxValue = Math.max(...heartRateData.map(d => d.y));
    const padding = 20;
    return {
      min: Math.max(0, minValue - padding),
      max: maxValue + padding
    };
  }, [heartRateData]);

  // Find min and max points for labeling
  const minMaxPoints = useMemo(() => {
    if (heartRateData.length === 0) {
      return { minPoint: { x: 0, y: 60 }, maxPoint: { x: 0, y: 180 } }; // Default values
    }

    const minPoint = heartRateData.reduce((min, point) => point.y < min.y ? point : min);
    const maxPoint = heartRateData.reduce((max, point) => point.y > max.y ? point : max);
    return { minPoint, maxPoint };
  }, [heartRateData]);

  // Generate y-axis scale values
  const yAxisValues = useMemo(() => {
    const numSteps = 6; // Show 6 values on y-axis
    const step = (heartRateRange.max - heartRateRange.min) / (numSteps - 1);
    return Array.from({ length: numSteps }, (_, i) =>
      Math.round(heartRateRange.max - (i * step))
    );
  }, [heartRateRange]);

  // Helper function to determine heart rate zone
  const getHeartRateZone = (heartRate: number) => {
    const zones = Object.values(heartRateZones);
    for (const zone of zones) {
      if (heartRate >= zone.min && heartRate <= zone.max) {
        return { name: zone.name, color: zone.color };
      }
    }
    // Fallback if outside all zones
    if (heartRate < zones[0].min) return { name: zones[0].name, color: zones[0].color };
    return { name: zones[zones.length - 1].name, color: zones[zones.length - 1].color };
  };

  // Format minutes to MM:SS format
  const formatMinutes = (minutes: number) => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update touch info when chart is pressed
  React.useEffect(() => {
    if (isActive && state.x && state.y.y) {
      const minute = state.x.value.value;
      const heartRate = Math.round(state.y.y.value.value);
      const zone = getHeartRateZone(heartRate);

      setTouchInfo({
        minute,
        heartRate,
        zone: zone.name,
        zoneColor: zone.color,
      });
    } else {
      setTouchInfo(null);
    }
  }, [isActive, state.x?.value.value, state.y.y?.value.value, heartRateZones]);

  return (
    <View style={styles.chartSection}>
      <ThemedText type="subtitle" style={styles.chartTitle}>
        Heart Rate Timeline
      </ThemedText>

      {heartRateData.length === 0 ? (
        <View style={styles.noDataContainer}>
          <ThemedText type="secondary" style={styles.noDataText}>
            No heart rate data available for this workout
          </ThemedText>
          <ThemedText type="secondary" size="xs" style={styles.noDataSubtext}>
            Make sure your Apple Watch was connected during the workout
          </ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.chartWithScale}>
            {/* Y-axis labels */}
            <View style={styles.yAxisLabels}>
              {yAxisValues.map((value, index) => (
                <ThemedText key={index} type="secondary" size="xs" style={styles.yAxisLabel}>
                  {value}
                </ThemedText>
              ))}
            </View>

            <View style={styles.chartContainer}>
              {/* Zone Background Overlay */}
              <View style={styles.zoneOverlay}>
                {Object.values(heartRateZones).map((zone, index) => {
                  const zoneHeight = ((zone.max - zone.min) / (heartRateRange.max - heartRateRange.min)) * 100;
                  const zoneBottom = ((zone.min - heartRateRange.min) / (heartRateRange.max - heartRateRange.min)) * 100;

                  return (
                    <View
                      key={`zone-bg-${index}`}
                      style={[
                        styles.zoneBackground,
                        {
                          backgroundColor: zone.color,
                          height: `${zoneHeight}%`,
                          bottom: `${zoneBottom}%`,
                        }
                      ]}
                    />
                  );
                })}
              </View>

              <CartesianChart
                data={heartRateData}
                xKey="x"
                yKeys={["y"]}
                domainPadding={{ left: 10, right: 10, top: 10, bottom: 10 }}
                domain={{ y: [heartRateRange.min, heartRateRange.max] }}
                chartPressState={state}
              >
                {({ points }) => (
                  <Line
                    points={points.y}
                    color="#FF6B6B"
                    strokeWidth={3}
                    animate={{ type: "timing", duration: 1000 }}
                  />
                )}
              </CartesianChart>

              {/* Interactive Tooltip */}
              {touchInfo && (
                <View
                  style={[
                    styles.tooltip,
                    {
                      left: `${Math.min(Math.max((touchInfo.minute / workout.duration) * 100 - 15, 5), 70)}%`,
                      top: 20,
                    }
                  ]}
                >
                  <ThemedText type="defaultSemiBold" size="sm" style={styles.tooltipTitle}>
                    {formatMinutes(touchInfo.minute)}
                  </ThemedText>
                  <ThemedText size="sm" style={styles.tooltipHeartRate}>
                    {touchInfo.heartRate} bpm
                  </ThemedText>
                  <View style={styles.tooltipZone}>
                    <View
                      style={[
                        styles.tooltipZoneColor,
                        { backgroundColor: touchInfo.zoneColor }
                      ]}
                    />
                    <ThemedText size="xs" style={styles.tooltipZoneText}>
                      {touchInfo.zone} Zone
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Min/Max Value Labels Overlay */}
              {heartRateData.length > 0 && (
                <View style={styles.valueLabelsOverlay}>
                  {/* Max value label */}
                  <View
                    style={[
                      styles.valueLabel,
                      styles.maxValueLabel,
                      {
                        left: `${(minMaxPoints.maxPoint.x / workout.duration) * 100}%`,
                        bottom: `${((minMaxPoints.maxPoint.y - heartRateRange.min) / (heartRateRange.max - heartRateRange.min)) * 100 + 3}%`
                      }
                    ]}
                  >
                    <ThemedText type="defaultSemiBold" size="xs" style={styles.valueLabelText}>
                      {minMaxPoints.maxPoint.y}
                    </ThemedText>
                  </View>

                  {/* Min value label */}
                  <View
                    style={[
                      styles.valueLabel,
                      styles.minValueLabel,
                      {
                        left: `${(minMaxPoints.minPoint.x / workout.duration) * 100}%`,
                        bottom: `${((minMaxPoints.minPoint.y - heartRateRange.min) / (heartRateRange.max - heartRateRange.min)) * 100 - 12}%`
                      }
                    ]}
                  >
                    <ThemedText type="defaultSemiBold" size="xs" style={styles.valueLabelText}>
                      {minMaxPoints.minPoint.y}
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.chartLabels}>
            <ThemedText type="secondary" size="xs">
              0 min
            </ThemedText>
            <ThemedText type="secondary" size="xs">
              {Math.round(workout.duration)} min
            </ThemedText>
          </View>

          {/* Heart Rate Zones Legend */}
          <View style={styles.legend}>
            <ThemedText type="defaultSemiBold" size="sm" style={styles.legendTitle}>
              Heart Rate Zones
            </ThemedText>
            <View style={styles.legendGrid}>
              {Object.entries(heartRateZones).map(([key, zone]) => (
                <View key={key} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: zone.color }]} />
                  <View style={styles.legendText}>
                    <ThemedText size="xs" style={styles.legendZoneName}>
                      {zone.name}
                    </ThemedText>
                    <ThemedText type="secondary" size="xxs">
                      {zone.min}-{zone.max} bpm
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chartSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  chartTitle: {
    marginBottom: 16,
  },
  chartWithScale: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 200,
  },
  yAxisLabels: {
    width: 40,
    height: 200,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingVertical: 10,
  },
  yAxisLabel: {
    textAlign: 'right',
  },
  chartContainer: {
    flex: 1,
    height: 200,
    position: 'relative',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  legend: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
  },
  legendTitle: {
    marginBottom: 16,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    flexDirection: 'column',
  },
  legendZoneName: {
    fontWeight: '600',
  },
  zoneOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    zIndex: 0,
  },
  zoneBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0.4,
  },
  valueLabelsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  valueLabel: {
    position: 'absolute',
    padding: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    transform: [{ translateX: -20 }],
  },
  maxValueLabel: {
    // Additional styling for max label if needed
  },
  minValueLabel: {
    // Additional styling for min label if needed
  },
  valueLabelText: {
    fontWeight: '600',
    color: '#FF6B6B',
    fontSize: 12,
  },
  tooltip: {
    position: 'absolute',
    zIndex: 2,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 120,
  },
  tooltipTitle: {
    marginBottom: 4,
    textAlign: 'center',
  },
  tooltipHeartRate: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  tooltipZone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipZoneColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  tooltipZoneText: {
    fontWeight: '500',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    marginBottom: 16,
  },
  noDataSubtext: {
    textAlign: 'center',
  },
});