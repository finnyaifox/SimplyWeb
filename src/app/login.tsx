import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { PhoneFrameWrapper } from '@/components/website/PhoneFrameWrapper';
import { useAuth } from '@/context/AuthContext';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  const handleLogin = async (provider: 'Google' | 'Facebook' | 'Apple') => {
    if (provider === 'Google') {
        console.log('Initiating Google Login...');
        await signInWithGoogle();
        // Redirect passiert via AuthContext/Supabase Listener
    } else {
        console.log(`Login with ${provider} (Not implemented yet)`);
        // Platzhalter-Logik
        // router.replace('/(tabs)'); 
    }
  };

  return (
    <PhoneFrameWrapper>
      <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        
        {/* Background Decor - Ambient Glows */}
        <View style={[styles.bgCircle, { 
            backgroundColor: Colors.primary, 
            opacity: isDark ? 0.15 : 0.2, 
            top: -120, 
            right: -80,
            transform: [{ scale: 1.2 }]
        }]} />
        <View style={[styles.bgCircle, { 
            backgroundColor: Colors.secondary, 
            opacity: isDark ? 0.15 : 0.2, 
            bottom: -100, 
            left: -100,
            transform: [{ scale: 1.5 }]
        }]} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Header Section */}
            <Animated.View entering={FadeInUp.duration(1000).springify()} style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={isDark ? Colors.dark.text : Colors.light.text} />
                </TouchableOpacity>
                
                <View style={styles.logoWrapper}>
                     <Image
                      source={isDark ? require('@/assets/images/logo_escalation_fix_dark.png') : require('@/assets/images/Logo.png')}
                      style={[styles.logoImage, { width: 180, height: 60, borderRadius: 0 }]}
                      resizeMode="contain"
                    />
                </View>
                
                <Text style={[styles.brandName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                    Sympleo
                </Text>
                
                <Text style={[styles.tagline, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
                    Dein intelligenter Begleiter
                </Text>
            </Animated.View>

            {/* Main Action Card */}
            <Animated.View entering={FadeInDown.duration(1000).delay(200).springify()} style={styles.contentContainer}>
                
                <View style={styles.infoTextContainer}>
                    <Text style={[styles.welcomeTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                        Willkommen zurück
                    </Text>
                    <Text style={[styles.welcomeSubtitle, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
                        Keine Registrierung erforderlich. 
                        Mit dem Login erhältst du automatisch deine persönliche ID.
                    </Text>
                </View>

                {/* Social Buttons Stack */}
                <View style={styles.buttonsStack}>
                    
                    {/* Google Button - Primary */}
                    <TouchableOpacity 
                        style={[styles.socialButton, styles.googleButton, { 
                            backgroundColor: isDark ? 'rgba(255,255,255,0.9)' : '#fff',
                            shadowColor: isDark ? '#000' : '#ccc',
                        }]}
                        onPress={() => handleLogin('Google')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-google" size={22} color="#000" />
                        <Text style={[styles.socialButtonText, { color: '#000' }]}>Weiter mit Google</Text>
                    </TouchableOpacity>

                    {/* Apple Button */}
                    <TouchableOpacity 
                        style={[styles.socialButton, styles.appleButton, {
                             backgroundColor: isDark ? '#000' : '#000'
                        }]}
                        onPress={() => handleLogin('Apple')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-apple" size={24} color="#FFF" />
                        <Text style={[styles.socialButtonText, { color: '#FFF' }]}>Weiter mit Apple</Text>
                    </TouchableOpacity>

                    {/* Facebook Button */}
                    <TouchableOpacity 
                        style={[styles.socialButton, styles.facebookButton]}
                        onPress={() => handleLogin('Facebook')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-facebook" size={24} color="#FFF" />
                        <Text style={[styles.socialButtonText, { color: '#FFF' }]}>Weiter mit Facebook</Text>
                    </TouchableOpacity>

                </View>

                <View style={styles.footerNote}>
                     <Ionicons name="shield-checkmark-outline" size={14} color={isDark ? Colors.dark.textSecondary : Colors.light.textSecondary} />
                     <Text style={[styles.secureText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
                        100% Sicher & Privat
                     </Text>
                </View>

            </Animated.View>

        </ScrollView>
      </View>
    </PhoneFrameWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  bgCircle: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    filter: 'blur(90px)', // Web specific
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center', // Center vertically
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    width: '100%',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  logoWrapper: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    marginBottom: 16,
    elevation: 10,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 22,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  infoTextContainer: {
    marginBottom: 32,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
  },
  buttonsStack: {
    width: '100%',
    gap: 14,
    marginBottom: 32,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  googleButton: {
    // Style handled inline for dynamic theming
  },
  appleButton: {
    // Style handled inline
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.7,
  },
  secureText: {
    fontSize: 13,
  },
});