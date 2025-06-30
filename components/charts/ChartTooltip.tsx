import {
  BackdropBlur,
  Canvas,
  Fill,
  RoundedRect,
} from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, View } from "react-native";
import { SharedValue } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";

interface ChartTooltipProps {
  isActive: boolean;
  tooltipX: SharedValue<number>;
  date?: string;
  value: number;
  category?: string;
  label?: string;
}

export function ChartTooltip({
  isActive,
  tooltipX,
  date,
  value,
  category,
  label = "Value",
}: ChartTooltipProps) {
  const textColor = useThemeColor({}, "text");
  const cardBackground = useThemeColor({}, "cardBackground");

  if (!isActive) return null;

  const tooltipWidth = 120;
  const tooltipHeight = date ? 50 : 30;

  return (
    <View
      style={[
        styles.tooltip,
        {
          left: Math.max(
            10,
            Math.min(tooltipX.value - tooltipWidth / 2, 300 - tooltipWidth)
          ),
          top: 10,
          width: tooltipWidth,
          height: tooltipHeight,
        },
      ]}
    >
      <Canvas style={StyleSheet.absoluteFillObject}>
        <BackdropBlur
          blur={4}
          clip={{ x: 0, y: 0, width: tooltipWidth, height: tooltipHeight }}
        >
          <Fill color="rgba(255, 255, 255, 0.2)" />
        </BackdropBlur>
        <RoundedRect
          x={0}
          y={0}
          width={tooltipWidth}
          height={tooltipHeight}
          r={12}
          color={cardBackground}
        />
      </Canvas>

      <View style={styles.content}>
        {date && (
          <ThemedText
            type="defaultSemiBold"
            size="xs"
            style={{ color: textColor }}
          >
            {date}
          </ThemedText>
        )}
        <ThemedText
          type="secondary"
          size="xxs"
          style={{ color: textColor, opacity: 0.8 }}
        >
          {label}: {value}
          {category && ` • ${category}`}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: "absolute",
    zIndex: 1000,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
});
