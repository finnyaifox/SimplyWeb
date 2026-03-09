import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  useEffect(() => {
    console.log('🔗 Auth Callback Route mounted');
    console.log('📥 Params received:', JSON.stringify(params, null, 2));
    
    // Optional: Manually trigger handling if needed, 
    // though AuthContext usually listens to deep links globally.
    // This page serves mainly as a visual feedback and debug point.
    
    // Give it a moment, then redirect to root if nothing happens automatically
    const timer = setTimeout(() => {
        console.log('⏰ Auth Callback timeout - redirecting to root...');
        router.replace('/');
    }, 2000);

    return () => clearTimeout(timer);
  }, [params]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 20 }}>Authentifizierung wird verarbeitet...</Text>
      <Text style={{ marginTop: 10, fontSize: 10, color: '#666' }}>Bitte warten...</Text>
    </View>
  );
}
