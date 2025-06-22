import React from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";

interface NumberInputProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

export function NumberInput({
  label,
  value,
  onValueChange,
  min,
  max,
  unit
}: NumberInputProps) {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const handleTextChange = (text: string) => {
    const numValue = parseFloat(text);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min || 0, Math.min(max || 999, numValue));
      onValueChange(clampedValue);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.label}>
        {label}
      </ThemedText>
      <View style={[styles.inputContainer, { borderColor, backgroundColor }]}>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={value.toString()}
          onChangeText={handleTextChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={borderColor}
        />
        {unit && (
          <ThemedText type="secondary" style={styles.unit}>
            {unit}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  unit: {
    marginLeft: 8,
  },
});
