import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ScrollViewProps } from "react-native";

export type ThemedScrollViewProps = ScrollViewProps & {
  safeAreaEdges?: ("top" | "bottom" | "left" | "right")[];
  gap?: number;
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  paddingTop?: number;
  paddingBottom?: number;
};

export function ThemedScrollView({
  children,
  contentContainerStyle,
  safeAreaEdges = ["top"],
  gap = 16,
  padding,
  paddingHorizontal = 16,
  paddingVertical,
  paddingTop,
  paddingBottom = 100,
  showsVerticalScrollIndicator = false,
  ...scrollViewProps
}: ThemedScrollViewProps) {
  const defaultContentStyle = {
    gap,
    ...(padding !== undefined && { padding }),
    ...(paddingHorizontal !== undefined && !padding && { paddingHorizontal }),
    ...(paddingVertical !== undefined && !padding && { paddingVertical }),
    ...(paddingTop !== undefined && { paddingTop }),
    ...(paddingBottom !== undefined && { paddingBottom }),
  };

  const combinedContentStyle = [
    defaultContentStyle,
    contentContainerStyle,
  ];

  return (
    <SafeAreaView style={styles.container} edges={safeAreaEdges}>
      <ScrollView
        contentContainerStyle={combinedContentStyle}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
