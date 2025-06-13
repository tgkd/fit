import { StyleSheet } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedView, ThemedViewProps } from "../ThemedView";

export type CardProps = ThemedViewProps & {
  variant?: "grouped" | "plain";
  gap?: number;
};

export function Card({
  style,
  variant = "plain",
  children,
  gap = 8,
  ...props
}: CardProps) {
  const backgroundColor = useThemeColor({}, "cardBackground");

  return (
    <ThemedView
      style={[styles.card, { backgroundColor, gap }, style]}
      {...props}
    >
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
});
