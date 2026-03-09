import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import 'react-native-reanimated';

import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { useEffect } from 'react';
import { initAudio } from '@/services/soundService';
import WebLayout from '@/components/website/WebLayout';

function RootLayoutNav() {
  const { user } = useAuth();
  const { syncCityWithCloud } = useSettings();

  useEffect(() => {
    initAudio();
  }, []);

  useEffect(() => {
    if (user) {
      syncCityWithCloud(user);
    }
  }, [user]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const eventId = response.notification.request.content.data.eventId;
      if (eventId) {
        // Navigiere zu SiLive mit Event-ID
        router.push({ pathname: '/(tabs)/silive', params: { eventId } });
      }
    });

    return () => subscription.remove();
  }, []);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <WebLayout>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
            },
            headerTintColor: isDark ? Colors.dark.text : Colors.light.text,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
            },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="ueber-uns" options={{ headerShown: false }} />
          <Stack.Screen name="impressum" options={{ headerShown: false }} />
          <Stack.Screen name="datenschutz" options={{ headerShown: false }} />
          <Stack.Screen name="agb" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          {/* Landing Page Route wird über index.tsx gehandelt */}
        </Stack>
        <StatusBar style={isDark ? "light" : "dark"} />
      </WebLayout>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthContextWrapper />
  );
}

import { LanguageProvider } from '@/context/LanguageContext';

function AuthContextWrapper() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SettingsProvider>
          <ThemeProvider>
            <RootLayoutNav />
          </ThemeProvider>
        </SettingsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}