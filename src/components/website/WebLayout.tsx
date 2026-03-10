import React from 'react';
import { View, StyleSheet, Platform, ScrollView, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import WebNavBar from './WebNavBar';
import { usePathname } from 'expo-router';

interface WebLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function WebLayout({ children, style }: WebLayoutProps) {
  const { isWebDark } = useTheme(); // Use Web Theme explicitly
  const isDark = isWebDark; // Web Layout follows Web Theme, not App Theme
  const isWeb = Platform.OS === 'web';
  const pathname = usePathname();

  // Wenn wir nicht im Web sind, geben wir einfach die Kinder zurück
  if (!isWeb) {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  // Prüfen ob wir in der App sind (Tabs) oder auf der Landingpage
  const isAppActive = pathname.includes('(tabs)');
  
  console.log('[WebLayout] Render. Pathname:', pathname, 'isWeb:', isWeb);

  // Dynamic Scrollbar Styles
  const scrollbarStyles = `
    /* Webkit Scrollbar Styling */
    ::-webkit-scrollbar {
      width: 14px;
      background-color: ${isDark ? '#000a08' : '#F9F8F6'};
    }
    ::-webkit-scrollbar-track {
      background-color: ${isDark ? '#000a08' : '#F9F8F6'};
    }
    ::-webkit-scrollbar-thumb {
      background-color: ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(164, 137, 104, 0.3)'};
      border-radius: 10px;
      border: 4px solid ${isDark ? '#000a08' : '#F9F8F6'};
    }
    ::-webkit-scrollbar-thumb:hover {
      background-color: ${isDark ? 'rgba(16, 185, 129, 0.5)' : 'rgba(164, 137, 104, 0.5)'};
    }
    /* Firefox */
    * {
      scrollbar-width: thin;
      scrollbar-color: ${isDark ? 'rgba(16, 185, 129, 0.3) #000a08' : 'rgba(164, 137, 104, 0.3) #F9F8F6'};
    }
  `;

  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
    ]}>
      {isWeb && <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />}
      
      {/* Background Image/Gradient Layer könnte hier hin */}
      
      {/* Navigation immer sichtbar im Web - Fixed at top for better UX */}
      <View style={{
        width: '100%',
        zIndex: 99999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        elevation: 99
      }} pointerEvents="box-none">
          <WebNavBar />
      </View>

      {/* Zentrierter Container für Inhalt */}
      <View style={[styles.centerContainer, { zIndex: 1, position: 'relative', paddingTop: 80 }]}>
          
          {/* Hauptinhalt */}
          <View style={styles.contentWrapper}>
            <View style={{ flex: 1, width: '100%' }}>
                {children}
            </View>
          </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Web spezifische Styles für Fullscreen
    ...(Platform.OS === 'web' ? {
        height: '100vh',
        overflow: 'hidden',
        alignItems: 'center', // Zentriert den centerContainer horizontal
    } : {})
  },
  centerContainer: {
    flex: 1,
    width: '100%',
    // maxWidth: 1400, // Removed for full width layout per request
    position: 'relative',
  },
  contentWrapper: {
    flex: 1,
  },
});