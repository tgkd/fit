import {
  LinearGradient,
  vec,
} from "@shopify/react-native-skia";
import React from "react";
import { View } from "react-native";
import { Pie, PolarChart } from "victory-native";

import { ThemedText } from "../ThemedText";

function calculateGradientPoints(
  radius: number,
  startAngle: number,
  endAngle: number,
  centerX: number,
  centerY: number
) {
  // Calculate the midpoint angle of the slice for a central gradient effect
  const midAngle = (startAngle + endAngle) / 2;

  // Convert angles from degrees to radians
  const startRad = (Math.PI / 180) * startAngle;
  const midRad = (Math.PI / 180) * midAngle;

  // Calculate start point (inner edge near the pie's center)
  const startX = centerX + radius * 0.5 * Math.cos(startRad);
  const startY = centerY + radius * 0.5 * Math.sin(startRad);

  // Calculate end point (outer edge of the slice)
  const endX = centerX + radius * Math.cos(midRad);
  const endY = centerY + radius * Math.sin(midRad);

  return { startX, startY, endX, endY };
}

interface CircularProgressChartProps {
  value: number; // Percentage value (0-100)
  color?: string;
  backgroundColor?: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showGradient?: boolean;
}

export const CircularProgressChart: React.FC<CircularProgressChartProps> = ({
  value,
  color = '#4CAF50',
  backgroundColor = '#2a2a2a',
  size = 110,
  label,
  showGradient = true,
}) => {
  const percentage = Math.max(0, Math.min(100, value));
  const remainingPercentage = 100 - percentage;

  const data = [
    {
      value: percentage,
      color: color,
      label: 'progress',
    },
    {
      value: remainingPercentage,
      color: backgroundColor,
      label: 'remaining',
    },
  ];

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size }}>
        <PolarChart
          data={data}
          labelKey="label"
          valueKey="value"
          colorKey="color"
        >
          <Pie.Chart innerRadius="80%" startAngle={-90}>
            {({ slice }) => {
              if (showGradient && slice.label === 'progress') {
                const { startX, startY, endX, endY } = calculateGradientPoints(
                  slice.radius,
                  slice.startAngle,
                  slice.endAngle,
                  slice.center.x,
                  slice.center.y
                );

                return (
                  <Pie.Slice>
                    <LinearGradient
                      start={vec(startX, startY)}
                      end={vec(endX, endY)}
                      colors={[slice.color, `${slice.color}80`]}
                      positions={[0, 1]}
                    />
                  </Pie.Slice>
                );
              }
              return <Pie.Slice />;
            }}
          </Pie.Chart>
        </PolarChart>
      </View>

      {/* Centered text overlay */}
      <View style={{
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <ThemedText style={{
          fontSize: size * 0.2,
          fontWeight: 'bold',
          color: color,
        }}>
          {Math.round(percentage)}%
        </ThemedText>
        {label && (
          <ThemedText style={{
            fontSize: size * 0.08,
            color: '#666',
            fontWeight: '600',
            marginTop: 2,
          }}>
            {label.toUpperCase()}
          </ThemedText>
        )}
      </View>
    </View>
  );
};
