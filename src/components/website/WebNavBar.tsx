import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Dimensions, ScrollView, Modal } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useWebColorScheme } from '@/hooks/use-web-color-scheme';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/context/AuthContext';

const logoLight = require('@/assets/images/logo_header_light.png');
const logoDark = require('@/assets/images/logo_header_dark.png');
const { width: windowWidth } = Dimensions.get('window');

export default function WebNavBar() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const { toggleMasterTheme, webTheme } = useTheme(); // useTheme destructuring corrected based on context usage
  const webColorScheme = useWebColorScheme();
  const isDark = webColorScheme === 'dark';
  const router = useRouter();
  const pathname = usePathname();
  const [width, setWidth] = useState(windowWidth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isLoginPopoverVisible, setIsLoginPopoverVisible] = useState(false);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const isMobile = width < 768;

  const scrollToSection = async (sectionId: string) => {
    // console.log('[WebNavBar] scrollToSection:', sectionId, 'Current Path:', pathname);
    setIsMobileMenuOpen(false);
    
    // Check if it's a page link instead of a section
    const pageLinks = ['impressum', 'agb', 'datenschutz'];
    if (pageLinks.includes(sectionId)) {
        router.push(`/${sectionId}` as any);
        return;
    }

    if (Platform.OS === 'web') {
        const isHomePage = pathname === '/' || pathname === '/index';

        if (!isHomePage) {
            // 1. Navigation zur Startseite erzwingen via Router
            // window.location.href ist zu aggressiv und lädt die App neu, was wir vermeiden wollen wenn möglich
            // router.push('/') unmountet die App-Screens sauberer.
            router.push('/');

            // 2. Warten, bis Navigation erfolgt ist und DOM bereitsteht
            // Da wir keine Callback für "ComponentDidMount" der LandingPage hier haben,
            // nutzen wir einen Polling-Mechanismus oder Timeout.
            setTimeout(() => {
                const attemptScroll = (retries = 0) => {
                    const element = document.getElementById(sectionId);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        window.history.pushState(null, '', `/#${sectionId}`);
                    } else if (retries < 5) {
                        // Retry ein paar Mal (max 500ms total) falls Rendering dauert
                        setTimeout(() => attemptScroll(retries + 1), 100);
                    }
                };
                attemptScroll();
            }, 100);
            return;
        }

        // Wir sind schon auf der Startseite -> Direkt scrollen
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.history.pushState(null, '', `/#${sectionId}`);
        } else {
             // Fallback falls Element noch nicht da (z.B. bei schnellem Wechsel)
             setTimeout(() => {
                 const el = document.getElementById(sectionId);
                 if (el) {
                     el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                     window.history.pushState(null, '', `/#${sectionId}`);
                 }
             }, 100);
        }
    }
  };

  const handleLoginAction = () => {
    if (user) {
        router.push('/(tabs)');
    } else {
        signInWithGoogle();
    }
  };

  const navItems = [
  { label: 'Startseite', id: 'hero' },
  { label: 'Funktionen', id: 'features' },
  { label: 'Preise', id: 'preise' },
  { label: 'Über Uns', id: 'vision' },
  { label: 'Kontakt', id: 'kontakt' }
];

  return (
    <Animated.View entering={FadeInDown.duration(800)} style={styles.container} pointerEvents="box-none">
      <View style={[styles.backgroundContainer, {
          backgroundColor: isDark ? 'rgba(0, 15, 12, 0.7)' : 'rgba(255, 255, 255, 0.75)',
          borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          // @ts-ignore - Web specific property
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      }]}>
        <View style={styles.contentContainer}>
            {/* Logo Area */}
            <TouchableOpacity onPress={() => scrollToSection('hero')} style={styles.logoContainer}>
                <Image
                  source={isDark ? logoDark : logoLight}
                  style={{ width: 140, height: 50 }}
                  resizeMode="contain"
                />
            </TouchableOpacity>

            {/* Desktop Navigation Links - Absolute Center Wrapper */}
            {!isMobile && (
                <View style={styles.absoluteCenter} pointerEvents="box-none">
                    <View style={styles.navLinks} pointerEvents="auto">
                        {navItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => scrollToSection(item.id)}
                                // @ts-ignore - Web specific hover events
                                onMouseEnter={() => setHoveredItem(item.id)}
                                onMouseLeave={() => setHoveredItem(null)}
                                style={styles.navLink}
                            >
                                <Text style={[
                                    styles.navLinkText, 
                                    { 
                                        color: isDark
                                            ? (hoveredItem === item.id ? '#FFFFFF' : 'rgba(255,255,255,0.85)')
                                            : (hoveredItem === item.id ? Colors.primary : 'rgba(0,0,0,0.75)'),
                                        textShadowColor: isDark ? 'rgba(16, 185, 129, 0.7)' : 'rgba(16, 185, 129, 0.3)',
                                        textShadowOffset: { width: 0, height: 0 },
                                        textShadowRadius: hoveredItem === item.id ? 15 : 8,
                                        transform: [{ scale: hoveredItem === item.id ? 1.05 : 1 }]
                                    }
                                ]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Right Side Actions */}
            <View style={styles.actions} zIndex={30}>
                
                {/* Theme Toggle Button */}
                <ThemeToggle isDark={isDark} toggleTheme={toggleMasterTheme} />

                {!isMobile && (
                    <>
                        {/* Permanent App Open Button */}
                        <TouchableOpacity
                            style={[styles.secondaryBtn, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}
                            onPress={() => router.push('/(tabs)')}
                        >
                            <Text style={[styles.secondaryBtnText, { color: isDark ? 'white' : 'black' }]}>
                                App öffnen
                            </Text>
                        </TouchableOpacity>

                        {/* Login / Logout Button & Popover */}
                        {user ? (
                            <TouchableOpacity
                                style={[styles.ctaBtn, { backgroundColor: Colors.primary }]}
                                onPress={() => signOut()}
                            >
                                <Text style={styles.ctaText}>Abmelden</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{ position: 'relative', zIndex: 40 }}>
                                <TouchableOpacity
                                    style={[styles.ctaBtn, { backgroundColor: Colors.primary }]}
                                    onPress={() => setIsLoginPopoverVisible(!isLoginPopoverVisible)}
                                >
                                    <Text style={styles.ctaText}>Anmelden</Text>
                                </TouchableOpacity>

                                {isLoginPopoverVisible && (
                                    <>
                                        <TouchableOpacity
                                            style={styles.popoverOverlay}
                                            activeOpacity={1}
                                            onPress={() => setIsLoginPopoverVisible(false)}
                                        />
                                        <Animated.View
                                            entering={FadeInDown.duration(200)}
                                            style={[styles.loginPopover, {
                                                backgroundColor: isDark ? '#1A1A1A' : 'white',
                                                shadowColor: isDark ? '#000' : '#000',
                                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                                            }]}
                                        >
                                            <Image
                                                source={isDark ? logoDark : logoLight}
                                                style={{ width: 100, height: 40, alignSelf: 'center', marginBottom: 16 }}
                                                resizeMode="contain"
                                            />
                                            
                                            <TouchableOpacity style={[styles.authBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]} onPress={() => { signInWithGoogle(); setIsLoginPopoverVisible(false); }}>
                                                <Ionicons name="logo-google" size={20} color={isDark ? "white" : "black"} style={{ marginRight: 10 }} />
                                                <Text style={[styles.authBtnText, { color: isDark ? 'white' : 'black' }]}>Mit Google anmelden</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity style={[styles.authBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]}>
                                                <Ionicons name="logo-apple" size={20} color={isDark ? "white" : "black"} style={{ marginRight: 10 }} />
                                                <Text style={[styles.authBtnText, { color: isDark ? 'white' : 'black' }]}>Mit Apple anmelden</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity style={[styles.authBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]}>
                                                <Ionicons name="logo-facebook" size={20} color={isDark ? "white" : "#1877F2"} style={{ marginRight: 10 }} />
                                                <Text style={[styles.authBtnText, { color: isDark ? 'white' : 'black' }]}>Mit Facebook anmelden</Text>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    </>
                                )}
                            </View>
                        )}
                    </>
                )}

                {/* Mobile Menu Toggle */}
                {isMobile && (
                    <TouchableOpacity 
                        onPress={() => setIsMobileMenuOpen(true)}
                        style={styles.mobileMenuBtn}
                    >
                        <Ionicons name="menu" size={28} color={isDark ? "white" : "black"} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
      </View>

      {/* Mobile Sidebar / Menu Overlay */}
      {isMobile && (
        <Modal
            visible={isMobileMenuOpen}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsMobileMenuOpen(false)}
        >
            <View style={styles.mobileOverlay}>
                {/* Backdrop click to close */}
                <TouchableOpacity 
                    style={styles.mobileBackdrop} 
                    activeOpacity={1} 
                    onPress={() => setIsMobileMenuOpen(false)} 
                />
                
                {/* Sidebar Content */}
                <Animated.View entering={FadeInDown} style={[styles.mobileSidebar, { 
                    backgroundColor: isDark ? 'rgba(0, 20, 15, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                    // @ts-ignore
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                }]}>
                    <View style={styles.mobileHeader}>
                         <Image
                            source={isDark ? logoDark : logoLight}
                            style={{ width: 120, height: 40 }}
                            resizeMode="contain"
                        />
                        <TouchableOpacity onPress={() => setIsMobileMenuOpen(false)} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                            <Ionicons name="close" size={24} color={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)"} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.mobileScroll}>
                         <View style={styles.mobileSection}>
                            <Text style={[styles.mobileSectionTitle, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>Menü</Text>
                            {navItems.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    onPress={() => scrollToSection(item.id)}
                                    style={[styles.mobileNavItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                                >
                                    <Text style={[styles.mobileNavText, { color: isDark ? 'white' : 'black' }]}>{item.label}</Text>
                                    <Ionicons name="chevron-forward" size={16} color={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"} />
                                </TouchableOpacity>
                            ))}
                        </View>

                         <View style={styles.mobileDivider} />
                        
                        <TouchableOpacity
                            style={[styles.ctaBtn, { backgroundColor: Colors.primary, justifyContent: 'center', marginTop: 20 }]}
                            onPress={() => {
                                setIsMobileMenuOpen(false);
                                handleLoginAction();
                            }}
                        >
                            <Text style={styles.ctaText}>{user ? 'App öffnen' : 'Anmelden'}</Text>
                            <Ionicons name="arrow-forward" size={16} color="white" style={{marginLeft: 4}} />
                        </TouchableOpacity>

                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
      )}

    </Animated.View>
  );
}

const ThemeToggle = ({ isDark, toggleTheme }: { isDark: boolean, toggleTheme: () => void }) => {
    return (
        <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.themeToggle, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
        >
            <Ionicons
                name={isDark ? "sunny" : "moon"}
                size={20}
                color={isDark ? "#FDB813" : Colors.primary}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 9999, // Ensure navbar is always on top
  },
  backgroundContainer: {
    width: '100%',
    borderBottomWidth: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 24,
    maxWidth: 1400, 
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
    minHeight: 70,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  absoluteCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 32,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  navLink: {
    paddingVertical: 8,
  },
  navLinkText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    zIndex: 20,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  ctaText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  mobileMenuBtn: {
      padding: 8,
  },
  // Mobile Styles
  mobileOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      flexDirection: 'row',
      justifyContent: 'flex-end',
  },
  mobileBackdrop: {
      flex: 1,
  },
  mobileSidebar: {
      width: '80%',
      maxWidth: 300,
      height: '100%',
      paddingTop: 20,
      paddingHorizontal: 20,
      borderLeftWidth: 1,
      borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  mobileHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
  },
  closeBtn: {
      padding: 8,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 20,
  },
  mobileScroll: {
      flex: 1,
  },
  mobileSection: {
      marginBottom: 20,
  },
  mobileSectionTitle: {
      fontSize: 12,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.4)',
      marginBottom: 10,
      letterSpacing: 1,
  },
  mobileNavItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  mobileNavText: {
      fontSize: 16,
      color: 'white',
      fontWeight: '500',
  },
  mobileDivider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
      marginVertical: 10,
  },
  secondaryBtn: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 100,
      borderWidth: 1,
      marginRight: 8,
  },
  secondaryBtnText: {
      fontSize: 15,
      fontWeight: '600',
  },
  loginPopover: {
      position: 'absolute',
      top: 55,
      right: 0,
      width: 280,
      padding: 24,
      borderRadius: 16,
      borderWidth: 1,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 10,
      zIndex: 100,
  },
  popoverOverlay: {
      position: Platform.OS === 'web' ? 'fixed' : 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 90,
      width: '100vw',
      height: '100vh',
      // @ts-ignore
      cursor: 'default',
  } as any,
  authBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      marginBottom: 10,
  },
  authBtnText: {
      fontWeight: '600',
      fontSize: 14,
  }
});
