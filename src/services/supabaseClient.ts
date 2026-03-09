import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("WARNUNG: Supabase URL oder Anon Key fehlen in .env. Datenbank-Features werden nicht funktionieren.");
}

// Custom Storage Adapter für SSR-Kompatibilität (Server-Side Rendering)
// Verhindert "window is not defined" Fehler während des Build-Prozesses oder SSR
const ExpoWebStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return AsyncStorage.getItem(key);
    }
    return Promise.resolve(null);
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      return AsyncStorage.setItem(key, value);
    }
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return AsyncStorage.removeItem(key);
    }
    return Promise.resolve();
  },
};

export const supabase = createClient(
  SUPABASE_URL || "",
  SUPABASE_ANON_KEY || "",
  {
    auth: {
      storage: ExpoWebStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Wir behandeln Deep Links manuell in React Native
    },
  }
);

// Supabase anweisen, die Session zu refreshen, wenn die App in den Vordergrund kommt
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    console.log('🔄 App active: Refreshing Supabase Auth & Realtime...');
    supabase.auth.startAutoRefresh();
    // Expliziter Reconnect für Realtime Websockets (wichtig für iOS nach Background)
    supabase.realtime.connect();
  } else {
    supabase.auth.stopAutoRefresh();
    // Optional: Man könnte hier disconnecten, aber oft ist es besser,
    // das OS die Verbindung kappen zu lassen oder Supabase den Timeout handhaben zu lassen.
  }
});