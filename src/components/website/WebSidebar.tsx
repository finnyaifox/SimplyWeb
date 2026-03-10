import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

const NAV_ITEMS = [
  { name: 'Website', route: '/', icon: 'home-outline', activeIcon: 'home' },
  { name: 'Simply', route: '/(tabs)', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  { name: 'Insights', route: '/(tabs)/insights', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
  { name: 'SiLive', route: '/(tabs)/silive', icon: 'radio-outline', activeIcon: 'radio' },
  { name: 'Settings', route: '/(tabs)/settings', icon: 'settings-outline', activeIcon: 'settings' },
];

export default function WebSidebar({ isChatOnly }: { isChatOnly?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useTheme();

  if (Platform.OS !== 'web') return null;

  return (
    <View style={[
      styles.sidebar,
      { 
        backgroundColor: isDark ? 'rgba(2, 44, 34, 0.4)' : 'rgba(255, 255, 255, 0.5)',
        borderRightColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 0, 0, 0.05)'
      }
    ]}>
      <TouchableOpacity 
        onPress={() => { if (Platform.OS === 'web') window.location.href = '/'; }}
        style={[
          styles.backBar,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }
        ]}
      >
        <Ionicons 
          name="arrow-back" 
          size={14} 
          color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} 
        />
        <Text style={[
          styles.backBarText, 
          { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }
        ]}>
          Zurück zur Website
        </Text>
      </TouchableOpacity>

      <View style={styles.logoContainer}>
         {/* Logo container empty as requested to remove "SimplyAI" text */}
      </View>

      <View style={styles.navContainer}>
        {NAV_ITEMS.map((item) => {
          if (isChatOnly && item.route !== '/' && item.route !== '/(tabs)') return null;
          const isActive = pathname === item.route || (item.route === '/(tabs)' && pathname === '/');
          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
                isActive && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.05)' }
              ]}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons
                name={(isActive ? item.activeIcon : item.icon) as any}
                size={22}
                color={isActive ? Colors.primary : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
              />
              <Text style={[
                styles.navText,
                { color: isActive ? Colors.primary : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' },
                isActive && styles.navTextActive
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
        <TouchableOpacity style={styles.profileItem}>
           <View style={styles.avatarPlaceholder}>
             <Ionicons name="person-circle-outline" size={32} color={Colors.primary} />
           </View>
           <Text style={[styles.profileText, { color: isDark ? '#fff' : '#000' }]}>User</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    height: '100%',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRightWidth: 1,
    backdropFilter: 'blur(20px)', // Web-only
  } as any,
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 20,
    gap: 6,
  },
  backBarText: {
    fontSize: 12,
    fontWeight: '500',
  },
  logoContainer: {
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  navContainer: {
    flex: 1,
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    transition: 'all 0.2s ease-in-out', // Web-only
  } as any,
  navItemActive: {
    // Styling handled in component for dynamic colors
  },
  navText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '500',
  },
  navTextActive: {
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 20,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
  },
});
