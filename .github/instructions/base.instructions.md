---
applyTo: '**/*.ts'
---

## Framework

- Project uses **Expo**.

## Dependencies

- Prefer existing packages from **package.json**.
- If you need a new package, ask before adding.

## Styling & Typography

### Text Rendering

- **Always** use `<ThemedText>` component for all text rendering.
- **Never** hard-code `fontSize` in your styles.
- Use the `size` prop for consistent typography scaling:
  - `xxl`, `xl`, `lg`, `md` (default), `sm`, `xs`, `xxs`
- Use the `type` prop for semantic text styles:
  - `default` - Standard body text
  - `title` - Main headings
  - `defaultSemiBold` - Emphasized body text
  - `subtitle` - Secondary headings
  - `link` - Interactive text links
  - `secondary` - Muted/helper text
  - `monospace` - Code or fixed-width text

### ThemedText Props Reference

```typescript
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
    | "secondary"
    | "monospace";
};
```

### Colors

- **Always** use colors from `constants/Colors.ts`.
- **Never** hard-code color values in components.
- Add all new colors to `constants/Colors.ts` before using them.
- Use `lightColor` and `darkColor` props on `ThemedText` for theme-aware text coloring.

## Code Organization

- **Do not** place calculation logic or utility functions inside React components unless they directly interact with component state.
- Extract pure functions and calculations to separate utility files.
- Keep components focused on rendering and state management.

## Internationalization

- Every user-facing string must come from the i18n layer.
- Define new keys in **i18n.ts**, then reference them in your components.
- No hard-coded strings in the UI.

## Charts

- Use **victory-native** for all charting needs.
- Reference examples in the [victory-native-xl repo](https://github.com/FormidableLabs/victory-native-xl/tree/main/example).

## Health Data

- Data provider: **Apple Health**.
- Adhere to the schema defined in `react-native-healthkit/src/native-types.ts` ([native-types.ts](https://github.com/kingstinct/react-native-healthkit/blob/master/src/native-types.ts)).

## Import Organization

- Organize imports in the following order with blank lines between groups:
  1. **React imports** - React core and hooks
  2. **React Native imports** - Core RN components and APIs
  3. **External library imports** - Third-party packages (alphabetical)
  4. **Local imports** - Project files with `@/` prefix (alphabetical)

### Import Example:

```typescript
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Colors } from "@/constants/Colors";
import i18n from "@/lib/i18n";
import { ThemedText } from "../ThemedText";
```

## Code Quality & Compilation

- Verify code compiles and adheres to style rules by running:
  ```bash
  yarn run lint
  ```

## Response Formatting Guidelines

- **Never** insert progress comments (e.g., "Loading…", "Processing…").
- **Never** include trivial or obvious comments (e.g., `// Color based on performance`).
- Provide **only** high-level explanations of functions; omit internal or step-by-step implementation details.
- Focus on explaining the "what" and "why", not the "how" of implementation details.
