import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requestHealthKitPermissions } from "@/context/HealthDataContext";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <ThemedText type="title">Settings</ThemedText>
          <ThemedText>Configure your app preferences</ThemedText>
        </Card>
        <Card>
          <ThemedText type="title">Health Data</ThemedText>
          <ThemedText>Manage your health data permissions</ThemedText>
          <Button
            title="Request Health Data Access"
            onPress={() => requestHealthKitPermissions()}
          />
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