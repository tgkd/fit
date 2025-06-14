import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import i18n from "@/lib/i18n";
import { LinearGradient, useFont, vec } from "@shopify/react-native-skia";
import * as React from "react";
import { StyleSheet, View } from "react-native";
import { Bar, CartesianChart } from "victory-native";

interface SleepStage {
  name: string;
  duration: number;
  percentage: number;
  [key: string]: string | number;
}

interface SleepStagesChartProps {
  stages: SleepStage[];
  totalDuration: number;
}

export function SleepStagesChart({ stages, totalDuration }: SleepStagesChartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const font = useFont(require('@/assets/fonts/Disket-Mono-Regular.ttf'), 12);

  const chartColors: Record<string, string> = {
    deep: Colors.charts.sleep,
    core: Colors.charts.recovery,
    rem: Colors.charts.strain,
    awake: Colors.charts.stress,
    grid: isDark ? "#374151" : "#e5e7eb",
    labels: isDark ? Colors.dark.text : Colors.light.text,
    background: isDark ? Colors.dark.background : Colors.light.background,
  };

  // Transform data for Victory Native
  const data = stages.map((stage, index) => ({
    stage: stage.name + " " + Math.round(stage.percentage) + "%",
    percentage: stage.percentage,
    index: index,
  }));

  return (
    <>
      <ThemedText type="subtitle">{i18n.t("sleep.sleepStagesDistribution")}</ThemedText>
      <View style={styles.chartContainer}>
        <CartesianChart
          data={data}
          xKey="stage"
          yKeys={["percentage"]}
          domain={{ y: [0, 100] }}
          domainPadding={{ left: 50, right: 50, top: 5 }}
          axisOptions={{
            font,
            formatYLabel: (value: number) => `${value}%`,
            lineColor: chartColors.grid,
            labelColor: chartColors.labels,
          }}
        >
          {({ points, chartBounds }) => {
            return (
              <>
                {points.percentage.map((point, index) => {
                  const stage = stages[index];
                  const color = chartColors[stage.name.toLowerCase()];

                  return (
                    <Bar
                      key={index}
                      barCount={points.percentage.length}
                      points={[point]}
                      chartBounds={chartBounds}
                      roundedCorners={{
                        topLeft: 8,
                        topRight: 8,
                      }}
                      animate={{ type: "spring" }}
                    >
                      <LinearGradient
                        start={vec(0, 0)}
                        end={vec(0, 200)}
                        colors={[color, `${color}70`]}
                      />
                    </Bar>
                  );
                })}
              </>
            );
          }}
        </CartesianChart>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    height: 260,
    marginVertical: 8,
  }
});