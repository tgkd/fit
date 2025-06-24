import React from "react";
import { StyleSheet, View } from "react-native";

import { Pie, PolarChart } from "victory-native";

import { ThemedText } from "../ThemedText";

interface Props {
  value: number;
  maxValue?: number;
  color?: string;
  backgroundColor?: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function CircularProgressChart({
  value,
  maxValue = 100,
  color = "#4CAF50",
  backgroundColor = "#2a2a2a",
  size = 96,
  label,
}: Props) {
  const percentage = Math.max(0, Math.min(100, (value / maxValue) * 100));
  const remainingPercentage = 100 - percentage;
  const chartSize = size - 4;

  const data = [
    {
      value: percentage,
      color: color,
      label: "progress",
    },
    {
      value: remainingPercentage,
      color: backgroundColor,
      label: "remaining",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.chartContainer, { width: size, height: size }]}>
        <PolarChart
          data={data}
          labelKey="label"
          valueKey="value"
          colorKey="color"
          canvasStyle={{
            width: chartSize,
            height: chartSize,
          }}
        >
          <Pie.Chart innerRadius="80%" startAngle={-90}>
            {({ slice }) => {
              return <Pie.Slice />;
            }}
          </Pie.Chart>
        </PolarChart>

        <View style={styles.percentageContainer}>
          <ThemedText style={[styles.percentageText, { color: color }]}>
            {maxValue === 100 ? `${Math.round(percentage)}%` : `${value}`}
          </ThemedText>
        </View>
      </View>

      {label ? (
        <ThemedText size="xs" type="secondary" style={styles.labelText}>
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  chartContainer: {
    position: "relative",
  },
  percentageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  percentageText: {
    fontWeight: "bold",
  },
  labelText: {
    marginLeft: -4,
    marginTop: 4,
  },
});
