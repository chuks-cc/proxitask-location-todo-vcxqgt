
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "@react-navigation/native";

export default function ProfileScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <GlassView style={styles.profileHeader} glassEffectStyle="regular">
          <IconSymbol ios_icon_name="location.circle.fill" android_material_icon_name="location-on" size={80} color={theme.colors.primary} />
          <Text style={[styles.name, { color: theme.colors.text }]}>
            ProxyTasks
          </Text>
          <Text style={[styles.email, { color: theme.dark ? '#98989D' : '#666' }]}>
            Location-based task reminders
          </Text>
        </GlassView>

        <GlassView style={styles.section} glassEffectStyle="regular">
          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>App is active</Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="location.fill" android_material_icon_name="location-on" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>Location tracking enabled</Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>Notifications enabled</Text>
          </View>
        </GlassView>

        <View style={styles.infoSection}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>About ProxyTasks</Text>
          <Text style={[styles.infoDescription, { color: theme.dark ? '#98989D' : '#666' }]}>
            ProxyTasks helps you remember tasks based on your location. Create tasks with addresses, and get notified when you're nearby.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    gap: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
  },
  section: {
    borderRadius: 12,
    padding: 20,
    gap: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
  },
  infoSection: {
    padding: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
});
