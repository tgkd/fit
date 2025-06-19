import { useMemo } from "react";
import { StyleSheet, Text, type TextProps } from "react-native";

import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  selectable?: boolean;
  uiTextView?: boolean;
  textAlign?: "auto" | "left" | "right" | "center" | "justify";
  size?: "xxl" | "xl" | "lg" | "md" | "sm" | "xs" | "xxs";
  type?:
    | "default"
    | "title"
    | "defaultSemiBold"
    | "subtitle"
    | "link"
    | "footnote"
    | "secondary"
    | "monospace";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  selectable = true,
  uiTextView = true,
  textAlign,
  size,
  ...rest
}: ThemedTextProps) {
  const fontFamily = useMemo(() => {
    switch (type) {
      case "title":
        return "AlegreyaSC-Regular";
      case "monospace":
      case "default":
      case "defaultSemiBold":
      case "subtitle":
      case "link":
      case "secondary":
      case "footnote":
      default:
        return undefined; // Use system default font
    }
  }, [type]);

  const colorType = useMemo(() => {
    switch (type) {
      case "secondary":
        return {
          dark: Colors.dark.textSecondary,
          light: Colors.light.textSecondary,
        };

      default:
        return {
          dark: darkColor || Colors.dark.text,
          light: lightColor || Colors.light.text,
        };
    }
  }, [type]);

  const color = useThemeColor(colorType, "text");
  const linkColor = useThemeColor(colorType, "link");
  const selectionHighlightColor = useThemeColor(
    {
      light: "rgba(0, 122, 255, 0.3)", // iOS blue with opacity
      dark: "rgba(64, 156, 255, 0.3)", // Lighter blue for dark mode
    },
    "text"
  );

  const sizeStyle = useMemo(() => {
    switch (size) {
      case "md":
        return styles.md;
      case "sm":
        return styles.sm;
      case "xs":
        return styles.xs;
      case "xxs":
        return styles.xxs;
      case "xl":
        return styles.xl;
      case "xxl":
        return styles.xxl;
      default:
        return styles.default;
    }
  }, [size]);

  return (
    <Text
      style={[
        { color, fontFamily },
        type === "default" ? styles.default : undefined,
        type === "title" ? styles.title : undefined,
        type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
        type === "subtitle" ? styles.subtitle : undefined,
        type === "link" ? [styles.link, { color: linkColor }] : undefined,
        type === "monospace" ? styles.monospace : undefined,
        type === "footnote" ? styles.footnote : undefined,
        textAlign ? { textAlign } : undefined,
        size ? sizeStyle : undefined,
        style,
      ]}
      selectable={selectable}
      selectionColor={selectionHighlightColor}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 17,
  },
  defaultSemiBold: {
    fontSize: 17,
    fontWeight: "600",
  },
  title: {
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: 0.41,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 0.35,
  },
  link: {
    fontSize: 17,
  },
  monospace: {
    fontSize: 15,
    fontWeight: "700", // Bold weight
    letterSpacing: -0.5, // Compressed/condensed spacing
    fontVariant: ["tabular-nums"],
  },
  footnote: {
    fontSize: 14,
    fontWeight: "500",
  },
  xxl: {
    fontSize: 24,
  },
  xl: {
    fontSize: 20,
  },
  md: {
    fontSize: 15,
  },
  sm: {
    fontSize: 13,
  },
  xs: {
    fontSize: 11,
  },
  xxs: {
    fontSize: 9,
  },
});
