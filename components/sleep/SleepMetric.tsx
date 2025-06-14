import { ThemedText } from "@/components/ThemedText";
import { StyleSheet, View } from "react-native";

interface SleepMetricProps {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
}

export function SleepMetric({ label, value, subtitle, color }: SleepMetricProps) {
  return (
    <View style={styles.container}>
      <ThemedText size="sm" style={styles.label}>{label}</ThemedText>
      <ThemedText size="lg" style={[styles.value, color && { color }]}>
        {value}
      </ThemedText>
      {subtitle && (
        <ThemedText size="xs" style={styles.subtitle}>{subtitle}</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  label: {
    opacity: 0.7,
    textAlign: "center",
  },
  subtitle: {
    opacity: 0.5,
    marginTop: 2,
    textAlign: "center",
  },
});