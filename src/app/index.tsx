import React, { useEffect, useState } from 'react';
import { View, Platform, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import LandingPage from '@/components/website/LandingPage';
import { useAuth } from '@/context/AuthContext';
import * as SplashScreen from 'expo-splash-screen';

// Verhindern, dass der Splash Screen sofort verschwindet, bis wir wissen, wo wir hinwollen
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const { isLoading, user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Alles geladen
      setIsReady(true);
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (!isReady || isLoading) {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
  }

  // Native Apps (iOS/Android): Direkt zur App
  if (Platform.OS !== 'web') {
    return <Redirect href="/(tabs)" />;
  }

  // Web: Landing Page anzeigen
  return <LandingPage />;
}