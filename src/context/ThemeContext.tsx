import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  // Web Theme (Master)
  webTheme: Theme;
  toggleMasterTheme: () => void;
  isWebDark: boolean;

  // App Theme (Local)
  appTheme: Theme;
  toggleAppTheme: () => void;
  isAppDark: boolean;
  
  // Legacy/Compatibility (mapped to appTheme for RN components)
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  webTheme: 'dark',
  appTheme: 'dark',
  toggleMasterTheme: () => {},
  toggleAppTheme: () => {},
  isWebDark: true,
  isAppDark: true,
  theme: 'dark',
  toggleTheme: () => {},
  isDark: true,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Initial states
  const [webTheme, setWebTheme] = useState<Theme>('dark');
  const [appTheme, setAppTheme] = useState<Theme>('dark');

  // Master Toggle: Schaltet Web UND App um
  const toggleMasterTheme = () => {
    const newTheme = webTheme === 'dark' ? 'light' : 'dark';
    setWebTheme(newTheme);
    setAppTheme(newTheme); // Sync App mit Master
  };

  // App Toggle: Schaltet NUR App um
  const toggleAppTheme = () => {
    setAppTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isWebDark = webTheme === 'dark';
  const isAppDark = appTheme === 'dark';

  return (
    <ThemeContext.Provider value={{
      webTheme,
      toggleMasterTheme,
      isWebDark,
      
      appTheme,
      toggleAppTheme,
      isAppDark,

      // Legacy Mapping für existierende Komponenten
      theme: appTheme,
      toggleTheme: toggleAppTheme,
      isDark: isAppDark
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);