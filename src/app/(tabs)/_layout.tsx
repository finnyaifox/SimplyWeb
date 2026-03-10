import { Tabs, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { HapticTab } from '@/components/haptic-tab';
import { PhoneFrameWrapper } from '@/components/website/PhoneFrameWrapper';
import { Ionicons } from '@expo/vector-icons';
import WebSidebar from '@/components/website/WebSidebar';

const AppThemeToggle = () => {
  const { toggleAppTheme, isAppDark } = useTheme();
  return (
    <TouchableOpacity onPress={toggleAppTheme} style={{ marginRight: 15 }}>
      <Ionicons
        name={isAppDark ? 'sunny' : 'moon'}
        size={24}
        color={isAppDark ? '#FFFFFF' : Colors.dark.background}
      />
    </TouchableOpacity>
  );
};

const TabIcon = ({ focused, title }: { focused: boolean; title: string }) => {
    const { isDark } = useTheme();
    const activeColor = '#FFFFFF'; 
    const inactiveColor = 'rgba(255, 255, 255, 0.5)';
    const indicatorColor = '#10B981';

    return (
        <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 90,
            height: 50 
        }}>
            <Text style={{
                color: focused ? activeColor : inactiveColor,
                fontSize: 14, 
                fontWeight: focused ? '600' : '500',
                letterSpacing: 0.5,
                textAlign: 'center',
                marginBottom: focused ? 6 : 0 
            }}>
                {title}
            </Text>
            {focused && (
                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    width: 24, 
                    height: 3,
                    backgroundColor: indicatorColor,
                    borderRadius: 2,
                    shadowColor: indicatorColor,
                    shadowOpacity: 0.6,
                    shadowRadius: 4,
                    elevation: 4,
                }} />
            )}
        </View>
    );
};

export default function TabLayout() {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isWeb = Platform.OS === 'web';
  const isMobileWeb = isWeb && width < 1024;
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isChatOnly = mode === 'chatOnly';

  const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isWeb) {
      return (
        <View style={[
          styles.webContainer,
          isMobileWeb && { padding: 0 }
        ]}>
          <View style={[
            styles.glassCard,
            {
              backgroundColor: isDark ? 'rgba(0, 10, 8, 0.8)' : 'rgba(255, 248, 246, 0.8)',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(164, 137, 104, 0.1)',
              flexDirection: isMobileWeb ? 'column' : 'row',
              borderRadius: isMobileWeb ? 0 : 32,
              height: isMobileWeb ? '100vh' : '85vh',
              maxWidth: isMobileWeb ? '100%' : 1200,
            }
          ]}>
            {!isMobileWeb && <WebSidebar isChatOnly={isChatOnly} />}
            <View style={styles.webContent}>
              {children}
            </View>
          </View>
        </View>
      );
    }
    return (
      <PhoneFrameWrapper>
        {children}
      </PhoneFrameWrapper>
    );
  };

  return (
    <LayoutWrapper>
      <View style={{ flex: 1, backgroundColor: isDark ? Colors.dark.background : Colors.light.background }}>
        {isWeb && (
          <View style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            zIndex: 10,
          }}>
            <TouchableOpacity
              onPress={() => router.push('/')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
              }}
            >
              <Ionicons name="arrow-back" size={20} color={isDark ? '#FFFFFF' : '#000000'} style={{ marginRight: 6 }} />
              <Text style={{ color: isDark ? '#FFFFFF' : '#000000', fontWeight: '600', fontSize: 15 }}>
                Zurück zur Website
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              headerShown: true,
              headerRight: () => <AppThemeToggle />,
              headerStyle: {
                backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
                borderBottomWidth: 0,
                elevation: 0,
                shadowOpacity: 0,
              },
              headerTintColor: isDark ? '#FFFFFF' : Colors.light.text,
              headerTitleStyle: {
                  fontWeight: 'bold',
              },
            tabBarButton: HapticTab,
            tabBarShowLabel: false,
            tabBarIconStyle: {
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            },
            tabBarStyle: {
              position: 'absolute',
              bottom: 0,
              borderTopWidth: 0,
              elevation: 0,
              height: Platform.OS === 'ios' ? 100 : 80,
              backgroundColor: Colors.dark.tabBarBackground,
              paddingBottom: Platform.OS === 'ios' ? 30 : 15,
              paddingTop: 10,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -5 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              borderTopColor: 'transparent',
              display: isWeb || isChatOnly ? 'none' : 'flex',
            },
          }}>
          <Tabs.Screen
            name="index"
            options={{
              headerTitle: '',
              headerShown: false,
              tabBarIcon: ({ focused }) => <TabIcon focused={focused} title="Simply" />,
            }}
          />
          <Tabs.Screen
            name="insights"
            options={{
              title: 'Insights',
              headerShown: false,
              tabBarIcon: ({ focused }) => <TabIcon focused={focused} title="Insights" />,
              href: isChatOnly ? null : undefined,
            }}
          />
          <Tabs.Screen
            name="silive"
            options={{
              title: 'SiLive',
              headerShown: false,
              tabBarIcon: ({ focused }) => <TabIcon focused={focused} title="SiLive" />,
              href: isChatOnly ? null : undefined,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              headerShown: false,
              tabBarIcon: ({ focused }) => <TabIcon focused={focused} title="Settings" />,
              href: isChatOnly ? null : undefined,
            }}
          />
          <Tabs.Screen
            name="keyword-details"
            options={{
              href: null,
            }}
          />
          </Tabs>
        </View>
      </View>
    </LayoutWrapper>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#011C16', // Dunkler Website-Background
  },
  glassCard: {
    width: '100%',
    maxWidth: 1200,
    height: '85vh',
    flexDirection: 'row',
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 10,
    backdropFilter: 'blur(30px)', // Web-only
  } as any,
  webContent: {
    flex: 1,
  },
});
