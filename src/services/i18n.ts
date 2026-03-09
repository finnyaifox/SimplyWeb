import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import de from '@/locales/de.json';
import en from '@/locales/en.json';

const LANGUAGE_KEY = 'user-language';

const resources = {
  en: { translation: en },
  de: { translation: de }
};

export const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  
  if (!savedLanguage) {
    const deviceLang = Localization.getLocales()[0]?.languageCode;
    savedLanguage = deviceLang && ['en', 'de'].includes(deviceLang) ? deviceLang : 'de';
  }

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'de',
      interpolation: {
        escapeValue: false // React already escapes by default
      },
      compatibilityJSON: 'v3' // Required for some React Native environments
    });
};

export default i18n;
