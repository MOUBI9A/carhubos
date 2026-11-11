import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { InspectionDraftProvider } from '../src/context/InspectionDraftContext';
import '../src/i18n'; // Initialize i18n
import { Colors } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <AuthProvider>
        <InspectionDraftProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(owner)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(agent)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(renter)" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="inspection/wizard"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="settings/delete-account"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
          </Stack>
        </InspectionDraftProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
