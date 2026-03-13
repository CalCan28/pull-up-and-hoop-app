import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  BarlowCondensed_300Light,
  BarlowCondensed_400Regular,
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import { AuthProvider } from '../src/lib/auth-context';
import { Colors } from '../src/constants/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    BarlowCondensed_300Light,
    BarlowCondensed_400Regular,
    BarlowCondensed_500Medium,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.foreground,
          headerTitleStyle: { fontFamily: 'BebasNeue_400Regular', fontSize: 22 },
          contentStyle: { backgroundColor: Colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="court/[id]"
          options={{ title: 'Court', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="game/[id]"
          options={{ title: 'Game', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="game/scoreboard/[id]"
          options={{ title: 'Scoreboard', headerBackTitle: 'Game' }}
        />
      </Stack>
    </AuthProvider>
  );
}
