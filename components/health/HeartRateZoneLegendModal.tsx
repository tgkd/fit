import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { calculateHeartRateZones } from "@/hooks/useRealtimeHeartRate";
import { useThemeColor } from "@/hooks/useThemeColor";
import i18n from "@/lib/i18n";

interface HeartRateZoneLegendModalProps {
  visible: boolean;
  onClose: () => void;
  userAge: number;
}

export const HeartRateZoneLegendModal = React.memo(
  function HeartRateZoneLegendModal({
    visible,
    onClose,
    userAge,
  }: HeartRateZoneLegendModalProps) {
    const backgroundColor = useThemeColor({}, "background");
    const textColor = useThemeColor({}, "text");
    const heartRateZones = calculateHeartRateZones(userAge);

    const zones = [
      {
        name: i18n.t("heartRate.zones.recovery"),
        color: Colors.heartRate.zones.recovery,
        range: heartRateZones.zone1,
        description: i18n.t("heartRate.zoneDescriptions.recovery"),
      },
      {
        name: i18n.t("heartRate.zones.base"),
        color: Colors.heartRate.zones.base,
        range: heartRateZones.zone2,
        description: i18n.t("heartRate.zoneDescriptions.base"),
      },
      {
        name: i18n.t("heartRate.zones.aerobic"),
        color: Colors.heartRate.zones.aerobic,
        range: heartRateZones.zone3,
        description: i18n.t("heartRate.zoneDescriptions.aerobic"),
      },
      {
        name: i18n.t("heartRate.zones.threshold"),
        color: Colors.heartRate.zones.threshold,
        range: heartRateZones.zone4,
        description: i18n.t("heartRate.zoneDescriptions.threshold"),
      },
      {
        name: i18n.t("heartRate.zones.anaerobic"),
        color: Colors.heartRate.zones.anaerobic,
        range: heartRateZones.zone5,
        description: i18n.t("heartRate.zoneDescriptions.anaerobic"),
      },
    ];

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        backdropColor={"transparent"}
        onRequestClose={onClose}
      >
        <View style={styles.modalContainer}>
          <ThemedView style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">
                {i18n.t("heartRate.zonesTitle")}
              </ThemedText>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <IconSymbol name="xmark" size={18} color={textColor} />
              </Pressable>
            </View>

            <ThemedText type="secondary" size="sm" style={styles.modalDescription}>
              {i18n.t("heartRate.zonesDescription", { age: userAge })}
            </ThemedText>

            <View style={styles.zoneList}>
              {zones.map((zone, index) => (
                <View key={index} style={styles.zoneItem}>
                  <View style={styles.zoneHeader}>
                    <View
                      style={[
                        styles.zoneColorIndicator,
                        { backgroundColor: zone.color },
                      ]}
                    />
                    <ThemedText type="defaultSemiBold" style={styles.zoneName}>
                      Zone {index + 1}: {zone.name}
                    </ThemedText>
                    <ThemedText type="footnote" style={styles.zoneRange}>
                      {zone.range[0]}-{zone.range[1]} BPM
                    </ThemedText>
                  </View>
                  <ThemedText type="secondary" size="sm" style={styles.zoneDescription}>
                    {zone.description}
                  </ThemedText>
                </View>
              ))}
            </View>
          </ThemedView>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.ui.closeButton,
  },
  modalDescription: {
    marginBottom: 20,
  },
  zoneList: {
    gap: 16,
    marginBottom: 24,
  },
  zoneItem: {
    gap: 8,
  },
  zoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  zoneColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  zoneName: {
    flex: 1,
  },
  zoneRange: {
    opacity: 0.8,
  },
  zoneDescription: {
    marginLeft: 28,
  },
});
