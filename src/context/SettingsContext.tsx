import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabaseClient';
import { User } from '@supabase/supabase-js';

interface SettingsContextType {
  ephemeralTime: number; // in Minuten
  setEphemeralTime: (time: number) => void;
  city: string;
  setCity: (city: string, user?: User | null) => void;
  autoPlayAudioResponse: boolean;
  setAutoPlayAudioResponse: (enabled: boolean) => void;
  syncCityWithCloud: (user: User) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [ephemeralTime, setEphemeralTimeState] = useState(3); // Standard: 3 Minuten
  const [city, setCityState] = useState(''); // Standard: Leer
  const [autoPlayAudioResponse, setAutoPlayAudioResponseState] = useState(true); // Standard: An

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedTime = await AsyncStorage.getItem('ephemeralTime');
      if (storedTime) setEphemeralTimeState(parseInt(storedTime, 10));

      const storedCity = await AsyncStorage.getItem('city');
      if (storedCity) setCityState(storedCity);

      const storedAutoPlay = await AsyncStorage.getItem('autoPlayAudioResponse');
      if (storedAutoPlay !== null) setAutoPlayAudioResponseState(storedAutoPlay === 'true');
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const syncCityWithCloud = async (user: User) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('city')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.city) {
        console.log('[Settings] ☁️ Stadt aus Cloud geladen:', data.city);
        setCityState(data.city);
        await AsyncStorage.setItem('city', data.city);
      }
    } catch (e) {
      console.error('Failed to sync city with cloud', e);
    }
  };

  const setEphemeralTime = async (time: number) => {
    setEphemeralTimeState(time);
    try {
      await AsyncStorage.setItem('ephemeralTime', time.toString());
    } catch (e) {
      console.error('Failed to save ephemeralTime', e);
    }
  };

  const setCity = async (newCity: string, user?: User | null) => {
    setCityState(newCity);
    try {
      await AsyncStorage.setItem('city', newCity);
      
      if (user) {
        console.log('[Settings] ☁️ Speichere Stadt in Cloud für User:', user.id);
        const { error } = await supabase
          .from('user_profiles')
          .upsert({ 
            user_id: user.id, 
            city: newCity,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        
        if (error) console.error('[Settings] ❌ Cloud Sync Error:', error);
      }
    } catch (e) {
      console.error('Failed to save city', e);
    }
  };

  const setAutoPlayAudioResponse = async (enabled: boolean) => {
    setAutoPlayAudioResponseState(enabled);
    try {
      await AsyncStorage.setItem('autoPlayAudioResponse', enabled.toString());
    } catch (e) {
      console.error('Failed to save autoPlayAudioResponse', e);
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      ephemeralTime, 
      setEphemeralTime, 
      city, 
      setCity, 
      autoPlayAudioResponse, 
      setAutoPlayAudioResponse,
      syncCityWithCloud
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};