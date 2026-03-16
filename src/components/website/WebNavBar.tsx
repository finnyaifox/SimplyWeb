import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Dimensions, ScrollView, Modal } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useWebColorScheme } from '@/hooks/use-web-color-scheme';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight, FadeOutRight, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

const logoLight = require('@/assets/images/logo_header_light.png');
const logoDark = require('@/assets/images/logo_header_dark.png');
const { width: windowWidth } = Dimensions.get('window');

export default function WebNavBar() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
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

  const isMobile = width < 1024; // Erhöht auf 1024 für besseren Tablet-Support

  const handleLogoPress = () => {
    console.log('[WebNavBar] Logo pressed! Current path:', pathname);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
    
    if (Platform.OS === 'web') {
      const heroEl = document.getElementById('hero');
      if (heroEl) {
          console.log('[WebNavBar] Hero element found, scrolling to top.');
          heroEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.history.pushState(null, '', '/');
      } else {
          console.log('[WebNavBar] Hero element NOT found, using client-side routing via router.push');
          router.push('/');
      }
    } else {
      router.push('/');
    }
  };

  const scrollToSection = async (sectionId: string) => {
    console.log('[WebNavBar] scrollToSection called with:', sectionId, 'Current Path:', pathname, 'isMobile:', isMobile);
    
    if (isMobile) {
        setIsMobileMenuOpen(false);
        // Kleine Verzögerung für Mobile, damit das Modal sauber schließt bevor gescrollt wird
        await new Promise(resolve => setTimeout(resolve, 300));
    } else {
        setIsMobileMenuOpen(false);
    }
    
    // Check if it's a page link instead of a section
    const pageLinks = ['impressum', 'agb', 'datenschutz'];
    if (pageLinks.includes(sectionId)) {
        router.push(`/${sectionId}` as any);
        return;
    }

    if (Platform.OS === 'web') {
        const element = document.getElementById(sectionId === 'hero' ? 'hero' : sectionId);
        
        if (element) {
            console.log('[WebNavBar] Section element found, scrolling.');
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.history.pushState(null, '', sectionId === 'hero' ? '/' : `/#${sectionId}`);
        } else {
             // Element nicht gefunden -> wir sind wahrscheinlich nicht auf der Startseite
             console.log('[WebNavBar] Section element NOT found, using client-side routing via router.push');
             router.push((sectionId === 'hero' ? '/' : `/?section=${sectionId}`) as any);
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
  { label: t('nav.home'), id: 'hero' },
  { label: t('nav.features'), id: 'features' },
  { label: t('nav.pricing'), id: 'preise' },
  { label: t('nav.about'), id: 'vision' },
  { label: t('nav.contact'), id: 'kontakt' }
];

  return (
    <Animated.View entering={FadeInDown.duration(800)} style={styles.container} pointerEvents="box-none">
      <View
        pointerEvents="auto"
        style={[styles.backgroundContainer, {
          backgroundColor: isDark ? 'rgba(0, 10, 8, 0.8)' : 'rgba(249, 248, 246, 0.85)',
          borderBottomColor: isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(164, 137, 104, 0.15)',
          // @ts-ignore - Web specific property
          backdropFilter: 'blur(20px) saturate(190%)',
          WebkitBackdropFilter: 'blur(20px) saturate(190%)',
      }]}>
        <View style={styles.contentContainer}>
            {/* Logo Area */}
            <TouchableOpacity
                onPress={handleLogoPress}
                activeOpacity={0.7}
                style={styles.logoContainer}
            >
                <Image
                  source={isDark ? logoDark : logoLight}
                  style={{ width: 140, height: 45 }}
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
                                            ? (hoveredItem === item.id ? '#FFFFFF' : 'rgba(236, 253, 245, 0.65)')
                                            : (hoveredItem === item.id ? Colors.primary : 'rgba(45, 42, 38, 0.7)'),
                                        // @ts-ignore - Web specific transition
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        textShadowColor: isDark ? 'rgba(16, 185, 129, 0.5)' : 'rgba(16, 185, 129, 0.2)',
                                        textShadowOffset: { width: 0, height: 0 },
                                        textShadowRadius: hoveredItem === item.id ? 12 : 0,
                                        transform: [{ scale: hoveredItem === item.id ? 1.05 : 1 }]
                                    }
                                ]}>
                                    {item.label}
                                </Text>
                                {hoveredItem === item.id && (
                                    <Animated.View
                                        entering={FadeInDown.duration(200)}
                                        style={[styles.activeIndicator, { backgroundColor: Colors.primary }]}
                                    />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Right Side Actions */}
            <View style={styles.actions} zIndex={30}>
                
                {/* Language Toggle Button */}
                <LanguageToggle language={language} setLanguage={setLanguage} isDark={isDark} />

                {/* Theme Toggle Button */}
                <ThemeToggle isDark={isDark} toggleTheme={toggleMasterTheme} />

                {!isMobile && (
                    <>
                        {/* Permanent App Open Button */}
                        <TouchableOpacity
                            style={[styles.secondaryBtn, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}
                            onPress={() => {
                                router.push('/(tabs)');
                            }}
                        >
                            <Text style={[styles.secondaryBtnText, { color: isDark ? 'white' : 'black' }]}>
                                {t('nav.openApp')}
                            </Text>
                        </TouchableOpacity>

                        {/* Login / Logout Button & Popover */}
                        {user ? (
                            <TouchableOpacity
                                style={[styles.ctaBtn, { backgroundColor: Colors.primary }]}
                                onPress={() => signOut()}
                            >
                                <Text style={styles.ctaText}>{t('nav.logout')}</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{ position: 'relative', zIndex: 40 }}>
                                <TouchableOpacity
                                    style={[styles.ctaBtn, { backgroundColor: Colors.primary }]}
                                    onPress={() => setIsLoginPopoverVisible(!isLoginPopoverVisible)}
                                >
                                    <Text style={styles.ctaText}>{t('nav.login')}</Text>
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
                                            
                                            <TouchableOpacity style={[styles.authBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]} onPress={() => {
                                                if (Platform.OS !== 'web') {
                                                    setIsLoginPopoverVisible(false);
                                                    signInWithGoogle();
                                                }
                                            }}>
                                                <Ionicons name="logo-google" size={20} color={isDark ? "white" : "black"} style={{ marginRight: 10 }} />
                                                <Text style={[styles.authBtnText, { color: isDark ? 'white' : 'black' }]}>{t('nav.loginGoogle')}</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity style={[styles.authBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]} onPress={() => {
                                                if (Platform.OS !== 'web') {
                                                    // TODO: Apple Login
                                                }
                                            }}>
                                                <Ionicons name="logo-apple" size={20} color={isDark ? "white" : "black"} style={{ marginRight: 10 }} />
                                                <Text style={[styles.authBtnText, { color: isDark ? 'white' : 'black' }]}>{t('nav.loginApple')}</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity style={[styles.authBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]} onPress={() => {
                                                if (Platform.OS !== 'web') {
                                                    // TODO: Facebook Login
                                                }
                                            }}>
                                                <Ionicons name="logo-facebook" size={20} color={isDark ? "white" : "#1877F2"} style={{ marginRight: 10 }} />
                                                <Text style={[styles.authBtnText, { color: isDark ? 'white' : 'black' }]}>{t('nav.loginFacebook')}</Text>
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
                        style={[styles.mobileMenuBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                    >
                        <Ionicons name="menu" size={26} color={isDark ? "white" : "black"} />
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
            animationType="none"
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
                <Animated.View
                    entering={FadeInRight.springify().damping(20)}
                    exiting={FadeOutRight}
                    style={[styles.mobileSidebar, {
                        backgroundColor: isDark ? 'rgba(0, 15, 12, 0.95)' : 'rgba(249, 248, 246, 0.95)',
                        // @ts-ignore
                        backdropFilter: 'blur(25px)',
                        WebkitBackdropFilter: 'blur(25px)',
                    }]}
                >
                    <View style={styles.mobileHeader}>
                        <TouchableOpacity onPress={handleLogoPress} activeOpacity={0.7}>
                            <Image
                                source={isDark ? logoDark : logoLight}
                                style={{ width: 120, height: 40 }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setIsMobileMenuOpen(false)}
                            style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(0,0,0,0.05)' }]}
                        >
                            <Ionicons name="close" size={24} color={isDark ? Colors.primary : "black"} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.mobileScroll} showsVerticalScrollIndicator={false}>
                         <View style={styles.mobileSection}>
                            <Text style={[styles.mobileSectionTitle, { color: isDark ? 'rgba(52, 211, 153, 0.5)' : 'rgba(164, 137, 104, 0.6)' }]}>
                                {t('nav.menu')}
                            </Text>
                            {navItems.map((item, index) => (
                                <Animated.View
                                    key={item.id}
                                    entering={FadeInRight.delay(index * 50).duration(400)}
                                >
                                    <TouchableOpacity
                                        onPress={() => scrollToSection(item.id)}
                                        style={[styles.mobileNavItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                    >
                                        <Text style={[styles.mobileNavText, { color: isDark ? 'white' : '#2D2A26' }]}>{item.label}</Text>
                                        <Ionicons name="chevron-forward" size={18} color={isDark ? Colors.primary : "rgba(0,0,0,0.2)"} />
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </View>

                        <View style={styles.mobileSection}>
                             <Text style={[styles.mobileSectionTitle, { color: isDark ? 'rgba(52, 211, 153, 0.5)' : 'rgba(164, 137, 104, 0.6)' }]}>
                                Account
                            </Text>
                            <TouchableOpacity
                                style={[styles.mobileNavItem, { borderBottomWidth: 0 }]}
                                onPress={() => {
                                    setIsMobileMenuOpen(false);
                                    if (Platform.OS === 'web') {
                                        console.log('[WebNavBar] Opening /chat-view in new window (causes 404 on static hosts without cleanUrls or SPA config)');
                                        window.open('/chat-view', '_blank');
                                    } else {
                                        router.push('/chat-view');
                                    }
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="apps-outline" size={20} color={isDark ? Colors.primary : Colors.primary} style={{ marginRight: 12 }} />
                                    <Text style={[styles.mobileNavText, { color: isDark ? 'white' : '#2D2A26' }]}>{t('nav.openApp')}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.mobileDivider} />
                        
                        <TouchableOpacity
                            style={[styles.ctaBtn, {
                                backgroundColor: Colors.primary,
                                justifyContent: 'center',
                                marginTop: 10,
                                shadowOpacity: 0.4,
                                shadowRadius: 15
                            }]}
                            onPress={() => {
                                setIsMobileMenuOpen(false);
                                if (user) {
                                    if (Platform.OS === 'web') {
                                        console.log('[WebNavBar] User logged in, opening /chat-view in new window (causes 404 on static hosts)');
                                        window.open('/chat-view', '_blank');
                                    } else {
                                        router.push('/chat-view');
                                    }
                                } else {
                                    if (Platform.OS !== 'web') {
                                        signInWithGoogle();
                                    }
                                }
                            }}
                        >
                            <Text style={styles.ctaText}>{user ? t('nav.openApp') : t('nav.login')}</Text>
                            <Ionicons name="arrow-forward" size={18} color="white" style={{marginLeft: 8}} />
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
            activeOpacity={0.7}
            style={[styles.themeToggle, {
                backgroundColor: isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(164, 137, 104, 0.1)',
                borderColor: isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(164, 137, 104, 0.2)'
            }]}
        >
            <Ionicons
                name={isDark ? "sunny" : "moon"}
                size={20}
                color={isDark ? "#FDB813" : Colors.primary}
            />
        </TouchableOpacity>
    );
};

const LanguageToggle = ({ language, setLanguage, isDark }: { language: string, setLanguage: (lang: string) => void, isDark: boolean }) => {
    return (
        <TouchableOpacity
            onPress={() => setLanguage(language === 'de' ? 'en' : 'de')}
            activeOpacity={0.7}
            style={[styles.themeToggle, {
                backgroundColor: isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(164, 137, 104, 0.1)',
                borderColor: isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(164, 137, 104, 0.2)'
            }]}
        >
            <Text style={{ color: isDark ? 'white' : '#2D2A26', fontWeight: '800', fontSize: 13 }}>
                {language.toUpperCase()}
            </Text>
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
    paddingVertical: 14,
    paddingHorizontal: 32,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
    minHeight: 80,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
    padding: 8,
    marginLeft: -8, // Compensate padding for alignment
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
    gap: 20, // Reduziert von 36 für mehr Flexibilität
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  navLink: {
    paddingVertical: 10,
    position: 'relative',
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '15%',
    right: '15%',
    height: 3,
    borderRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Reduziert von 18
    zIndex: 40, // Erhöht
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
    paddingVertical: 13,
    paddingHorizontal: 26,
    borderRadius: 100,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    // @ts-ignore
    transition: 'all 0.3s ease',
  },
  ctaText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  mobileMenuBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
  },
  // Mobile Styles
  mobileOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      flexDirection: 'row',
      justifyContent: 'flex-end',
  },
  mobileBackdrop: {
      flex: 1,
  },
  mobileSidebar: {
      width: '85%',
      maxWidth: 340,
      height: '100%',
      paddingTop: 30,
      paddingHorizontal: 28,
      borderLeftWidth: 1,
      borderLeftColor: 'rgba(255,255,255,0.05)',
      shadowColor: '#000',
      shadowOffset: { width: -10, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
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
