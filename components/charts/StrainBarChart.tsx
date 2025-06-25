import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { MAX_STRAIN } from "@/lib/health/strain";
import { DailyStrainData } from "@/lib/health/types";
import { LinearGradient, vec } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Bar, CartesianChart } from "victory-native";

interface StrainBarChartProps {
  data: DailyStrainData[];
  title: string;
  height?: number;
}

export function StrainBarChart({ data, title, height }: StrainBarChartProps) {
  const textSecondary = useThemeColor({}, "textSecondary");

  // Calculate responsive height based on data length
  const chartHeight =
    height || Math.max(180, Math.min(250, data.length * 15 + 120));

  // Transform data for the chart
  const chartData = data.map((item, index) => ({
    day: index + 1,
    strain: item.strainScore,
    date: item.date,
    category: item.category,
  }));

  // Calculate domain for better visualization
  const maxStrain = Math.max(...chartData.map((d) => d.strain));
  const yMax = Math.min(Math.max(maxStrain * 1.1, 20), MAX_STRAIN);

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" size="md" style={styles.title}>
        {title}
      </ThemedText>

      <View style={[styles.chartContainer, { height: chartHeight }]}>
        <CartesianChart
          data={chartData}
          xKey="day"
          yKeys={["strain"]}
          padding={5}
          domainPadding={{ left: 20, right: 20, top: 30, bottom: 20 }}
          domain={{ y: [0, yMax] }}
          xAxis={{
            tickCount: Math.min(chartData.length, 7),
            labelColor: textSecondary,
            lineWidth: 0,
            formatXLabel: (value) => {
              const dataPoint = chartData[value - 1];
              if (!dataPoint) return "";
              return dataPoint.date.toLocaleDateString("en-US", {
                month: "numeric",
                day: "numeric",
              });
            },
          }}
          yAxis={[
            {
              yKeys: ["strain"],
              labelColor: textSecondary,
              lineWidth: 0,
              tickCount: 4,
              formatYLabel: (value) => Math.round(value).toString(),
            },
          ]}
          frame={{
            lineWidth: 0,
          }}
        >
          {({ points, chartBounds }) => (
            <Bar
              points={points.strain}
              chartBounds={chartBounds}
              animate={{ type: "spring", damping: 15, stiffness: 150 }}
              innerPadding={0.25}
              roundedCorners={{
                topLeft: 4,
                topRight: 4,
              }}
            >
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, chartHeight)}
                colors={["#F59E0B", "#F59E0B50"]} // Amber gradient for strain
              />
            </Bar>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  title: {
    marginBottom: 12,
  },
  chartContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 8,
    padding: 8,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});
