import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n } from '@/services/i18n';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  isInitialized: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'de',
  setLanguage: async () => {},
  isInitialized: false,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLangState] = useState<string>('de');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const setupI18n = async () => {
      await initI18n();
      setLangState(i18n.language);
      setIsInitialized(true);
    };

    setupI18n();
  }, []);

  const setLanguage = async (lang: string) => {
    if (lang === language) return;
    
    await i18n.changeLanguage(lang);
    setLangState(lang);
    await AsyncStorage.setItem('user-language', lang);
  };

  if (!isInitialized) {
    return null; // or a loading spinner
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isInitialized }}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
