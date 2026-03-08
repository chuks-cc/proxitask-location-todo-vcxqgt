
import React from 'react';
import { Stack } from 'expo-router';

export default function TabLayout() {
  // No tabs needed - just the home screen
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="(home)" />
    </Stack>
  );
}
