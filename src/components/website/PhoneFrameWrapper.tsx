import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';

interface PhoneFrameWrapperProps {
  children: React.ReactNode;
  isDark?: boolean;
}

export const PhoneFrameWrapper: React.FC<PhoneFrameWrapperProps> = React.memo(({ children, isDark = true }) => {
  return (
    <View style={styles.outerFrame}>
      {/* Content Area */}
      <View style={styles.innerContent}>
        {children}
      </View>

      {/* Side Buttons (Optional visual flair) */}
      <View style={[styles.sideButton, { top: 100, left: -2 }]} />
      <View style={[styles.sideButton, { top: 140, left: -2 }]} />
      <View style={[styles.powerButton, { top: 120, right: -2 }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  outerFrame: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0a0a',
    borderRadius: 40,
    borderWidth: 6,
    borderColor: '#222',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
    overflow: 'visible',
    padding: 2,
  },
  innerContent: {
    flex: 1,
    backgroundColor: '#020d0a', // Tiefes Smaragd-Schwarz
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
    padding: 4, // Kleiner Abstand für den Mockup-Effekt
  },
  sideButton: {
    position: 'absolute',
    width: 3,
    height: 30,
    backgroundColor: '#444',
    borderRadius: 2,
  },
  powerButton: {
    position: 'absolute',
    width: 3,
    height: 50,
    backgroundColor: '#444',
    borderRadius: 2,
  },
});
