import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/ui/Card";
import i18n from "@/lib/i18n";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <ThemedText type="title">{i18n.t("settings.title")}</ThemedText>
          <ThemedText>{i18n.t("settings.subtitle")}</ThemedText>
        </Card>
        <Card>
          <ThemedText type="title">{i18n.t("settings.healthDataTitle")}</ThemedText>
          <ThemedText>{i18n.t("settings.healthDataSubtitle")}</ThemedText>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 46,
    rowGap: 16,
  },
});