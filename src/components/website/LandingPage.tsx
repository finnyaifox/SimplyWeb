import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Platform, Switch, useWindowDimensions } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withSpring, 
  withTiming,
  Easing,
  withDelay,
  runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { PhoneFrameWrapper } from './PhoneFrameWrapper';
import { useTranslation, Trans } from 'react-i18next';

const { width, height } = Dimensions.get('window');

// --- Helper Components ---

// Digital Clock Component
const DigitalClock = ({ isDark }: { isDark: boolean }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Animated.View 
      entering={FadeInUp.delay(1000)}
      style={[
        styles.clockContainer, 
        { 
          backgroundColor: isDark ? 'rgba(0, 20, 15, 0.6)' : 'rgba(255, 255, 255, 0.6)',
          borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.2)',
        }
      ]}
    >
      <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <Text style={[styles.clockText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        {formatTime(time)}
      </Text>
    </Animated.View>
  );
};

// Animated Abstract Visuals for Hero
const HeroVisuals = ({ isDark }: { isDark: boolean }) => {
  // Animations values
  const bubble1Y = useSharedValue(0);
  const bubble2Y = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const graphHeight1 = useSharedValue(20);
  const graphHeight2 = useSharedValue(40);
  const graphHeight3 = useSharedValue(30);
  const slideTranslateX = useSharedValue(0);

  // Slideshow logic
  const [activeSlide, setActiveSlide] = useState(0);
  const baseSlides = [
    require('@/assets/images/smarter-leben/slide1.jpg'),
    require('@/assets/images/smarter-leben/slide2.jpg'),
    require('@/assets/images/smarter-leben/slide5.jpg'),
  ];
  // Für den Infinite Loop hängen wir das erste Bild ans Ende
  const slides = [...baseSlides, baseSlides[0]];
  const frameWidth = 184; // Netto-Breite des inneren Displaybereichs

  const resetToStart = () => {
    setActiveSlide(0);
    slideTranslateX.value = 0;
  };

  useEffect(() => {
    // Floating Bubbles (Ephemeral Chat / Ordnung)
    bubble1Y.value = withRepeat(withSequence(withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })), -1, true);
    bubble2Y.value = withRepeat(withSequence(withTiming(10, { duration: 2500, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })), -1, true);
    
    // Pulsing (SiLive)
    pulseScale.value = withRepeat(withSequence(withTiming(1.1, { duration: 1500 }), withTiming(1, { duration: 1500 })), -1, true);

    // Dynamic Graph (Insights)
    graphHeight1.value = withRepeat(withSequence(withTiming(50, { duration: 2000 }), withTiming(20, { duration: 2000 })), -1, true);
    graphHeight2.value = withRepeat(withSequence(withTiming(80, { duration: 1800 }), withTiming(40, { duration: 1800 })), -1, true);
    graphHeight3.value = withRepeat(withSequence(withTiming(60, { duration: 2200 }), withTiming(30, { duration: 2200 })), -1, true);

    // Automatic Slideshow Interval (4 seconds for a calm feel)
    const slideInterval = setInterval(() => {
        setActiveSlide((prev) => prev + 1);
    }, 4000);

    return () => clearInterval(slideInterval);
  }, []);

  // Sync horizontal translation with activeSlide
  useEffect(() => {
    const isAtEnd = activeSlide === slides.length - 1;

    slideTranslateX.value = withTiming(-activeSlide * frameWidth, {
        duration: 1200,
        easing: Easing.inOut(Easing.quad)
    }, (finished) => {
        if (finished && isAtEnd) {
            runOnJS(resetToStart)();
        }
    });
  }, [activeSlide]);

  const animatedBubble1 = useAnimatedStyle(() => ({ transform: [{ translateY: bubble1Y.value }, { scale: 0.95 }] }));
  const animatedBubble2 = useAnimatedStyle(() => ({ transform: [{ translateY: bubble2Y.value }, { scale: 0.95 }] }));
  const animatedPulse = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value * 0.95 }] }));
  
  const animatedGraph1 = useAnimatedStyle(() => ({ height: graphHeight1.value }));
  const animatedGraph2 = useAnimatedStyle(() => ({ height: graphHeight2.value }));
  const animatedGraph3 = useAnimatedStyle(() => ({ height: graphHeight3.value }));

  const animatedSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideTranslateX.value }],
  }));

  const cardBg = isDark ? 'rgba(6, 78, 59, 0.4)' : 'rgba(255, 255, 255, 0.6)';
  const cardBorder = isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.2)';

  return (
    <View style={styles.visualsContainer}>
      
      {/* Main Mockup Centerpiece - Now in Background */}
      <View style={styles.logoCenter}>
         <PhoneFrameWrapper isDark={isDark}>
             <Animated.View style={[styles.slideTrack, animatedSlideStyle]}>
                {slides.map((slide, index) => (
                    <View key={`hero-slide-${index}`} style={{ width: frameWidth, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        <Image
                            source={slide}
                            style={[styles.heroLogoImage]}
                            resizeMode="cover"
                        />
                    </View>
                ))}
            </Animated.View>
         </PhoneFrameWrapper>
      </View>

      {/* 1. Ephemeral Chat Bubbles */}
      <Animated.View style={[styles.visualCard, animatedBubble1, { top: 15, left: 15, backgroundColor: cardBg, borderColor: cardBorder, zIndex: 3 }]}>
         <View style={styles.chatRow}>
            <View style={[styles.chatAvatar, { backgroundColor: Colors.primary }]} />
            <View style={[styles.chatLine, { width: 80, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
         </View>
         <View style={[styles.chatRow, { alignSelf: 'flex-end', marginTop: 8 }]}>
            <View style={[styles.chatLine, { width: 60, backgroundColor: Colors.primary, opacity: 0.6 }]} />
            <View style={[styles.chatAvatar, { backgroundColor: Colors.secondary }]} />
         </View>
         <Text style={[styles.visualLabel, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>Ordnung</Text>
      </Animated.View>

      {/* 2. Insights Graph */}
      <Animated.View style={[styles.visualCard, animatedBubble2, { top: 75, right: -15, backgroundColor: cardBg, borderColor: cardBorder, zIndex: 3 }]}>
          <View style={styles.graphContainer}>
             <Animated.View style={[styles.graphBar, animatedGraph1, { backgroundColor: Colors.primary, opacity: 0.4 }]} />
             <Animated.View style={[styles.graphBar, animatedGraph2, { backgroundColor: Colors.primary }]} />
             <Animated.View style={[styles.graphBar, animatedGraph3, { backgroundColor: Colors.primary, opacity: 0.7 }]} />
          </View>
          <Text style={[styles.visualLabel, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>Insights</Text>
      </Animated.View>

      {/* 3. SiLive Pulse */}
      <Animated.View style={[styles.visualCard, animatedPulse, { bottom: 10, left: 35, width: 95, height: 95, borderRadius: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: cardBg, borderColor: cardBorder, zIndex: 3 }]}>
         <View style={[styles.micIcon, { backgroundColor: Colors.primary }]}>
             <Ionicons name="mic" size={24} color="white" />
         </View>
         <View style={[styles.pulseRing, { borderColor: Colors.primary }]} />
      </Animated.View>

    </View>
  );
};


const SectionTitle = ({ title, subtitle, isDark }: { title: string, subtitle?: string, isDark: boolean }) => (
    <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.sectionSubtitle, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>{subtitle}</Text>}
    </View>
);

const FeatureCard = ({ icon, title, desc, delay, isDark }: any) => {
    const { width } = useWindowDimensions();
    // Hover Animation State
    const scale = useSharedValue(1);
    
    // Visibility State for repeated animation
    const [isVisible, setIsVisible] = useState(false);
    const [viewKey, setViewKey] = useState(0);
    const cardRef = React.useRef<any>(null);

    useEffect(() => {
        if (Platform.OS !== 'web' || !cardRef.current) {
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // Increment key to re-trigger entering animation
                    setViewKey(prev => prev + 1);
                } else {
                    setIsVisible(false);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value }
        ]
    }));

    const handleMouseEnter = () => {
        if (Platform.OS === 'web') {
            scale.value = withSpring(1.05);
        }
    };

    const handleMouseLeave = () => {
        if (Platform.OS === 'web') {
            scale.value = withSpring(1);
        }
    };

    return (
        <View 
            ref={cardRef} 
            style={{ 
                width: width > 1200 ? '18%' : (width > 768 ? '45%' : '100%'),
                minHeight: 200
            }}
        >
            {isVisible && (
                <Animated.View
                    key={`feature-${viewKey}`}
                    // Animation von Rechts reinfliegend mit verfeinertem Spring-Effekt
                    entering={FadeInRight.delay(delay).springify().stiffness(100).damping(15).mass(1)}
                    style={[
                        styles.featureCard,
                        animatedStyle,
                        {
                            width: '100%',
                            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                            borderColor: isDark ? Colors.dark.glassBorder : Colors.light.glassBorder,
                            // Cursor pointer für Web
                            cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
                            alignItems: 'center', // Icons über Text
                            textAlign: 'center'
                        } as any
                    ]}
                    //@ts-ignore - Web Props
                    onMouseEnter={handleMouseEnter}
                    //@ts-ignore - Web Props
                    onMouseLeave={handleMouseLeave}
                >
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.1)', marginBottom: 28, width: 72, height: 72, borderRadius: 20 }]}>
                        <Ionicons name={icon} size={40} color={Colors.primary} />
                    </View>
                    <Text style={[styles.featureTitle, { color: isDark ? Colors.dark.text : Colors.light.text, fontSize: 26, marginBottom: 16, textAlign: 'center' }]}>{title}</Text>
                    <Text style={[styles.featureDesc, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary, fontSize: 19, lineHeight: 30, textAlign: 'center' }]}>{desc}</Text>
                </Animated.View>
            )}
        </View>
    );
};

const PricingCard = ({ title, price, period, features, isPopular, isDark, index, priceSubtitle, popularText, chooseText }: any) => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    // Stärkere Hervorhebung für Popular Card (1.1 Scale)
    const scale = useSharedValue(isPopular ? (isMobile ? 1.05 : 1.1) : 1);
    const translateY = useSharedValue(isPopular ? -10 : 0); // Leicht angehoben

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateY: translateY.value }],
        zIndex: isPopular ? 10 : 1, // Überlappt andere Cards
    }));

    const handleMouseEnter = () => {
        if (Platform.OS === 'web') {
            scale.value = withSpring(isPopular ? 1.08 : 1.03);
            translateY.value = withSpring(-10);
        }
    };

    const handleMouseLeave = () => {
        if (Platform.OS === 'web') {
            scale.value = withSpring(isPopular ? 1.05 : 1);
            translateY.value = withSpring(0);
        }
    };

    return (
        <Animated.View
            entering={FadeInUp.delay(200 + (index * 100)).springify()}
            style={[
            styles.pricingCard,
            animatedStyle,
            {
                backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                borderColor: isPopular ? Colors.primary : (isDark ? Colors.dark.glassBorder : Colors.light.glassBorder),
                borderWidth: isPopular ? 2 : 1,
                cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
                padding: isMobile ? 20 : 32,
                // Stärkerer Schatten für Popular
                shadowColor: isPopular ? Colors.primary : 'black',
                shadowOffset: { width: 0, height: isPopular ? 10 : 4 },
                shadowOpacity: isPopular ? 0.3 : 0.1,
                shadowRadius: isPopular ? 20 : 8,
            } as any
        ]}
        //@ts-ignore
        onMouseEnter={handleMouseEnter}
        //@ts-ignore
        onMouseLeave={handleMouseLeave}
        >
            {isPopular && (
                <View style={styles.popularBadge}>
                <Text style={styles.popularText}>{popularText || 'Empfohlen'}</Text>
                </View>
            )}
            <Text style={[styles.pricingTitle, { color: isDark ? Colors.dark.text : Colors.light.text, fontSize: isMobile ? 20 : 24 }]}>{title}</Text>
            {priceSubtitle && (
                <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>{priceSubtitle}</Text>
            )}
            <View style={styles.priceContainer}>
                <Text style={[styles.priceAmount, { color: isDark ? Colors.dark.text : Colors.light.text, fontSize: isMobile ? 36 : 48 }]}>{price}</Text>
                <Text style={[styles.pricePeriod, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>{period}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.featuresList}>
                {features.map((feature: string, index: number) => (
                <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    <Text style={[styles.featureText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>{feature}</Text>
                </View>
                ))}
            </View>
            <TouchableOpacity style={[styles.pricingBtn, { backgroundColor: isPopular ? Colors.primary : 'transparent', borderWidth: 1, borderColor: Colors.primary }]}>
                <Text style={[styles.pricingBtnText, { color: isPopular ? 'white' : Colors.primary }]}>{chooseText || 'Wählen'}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

// --- IMAGE CAROUSEL COMPONENT ---
const ImageCarousel = ({ isDark }: { isDark: boolean }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const { t } = useTranslation();
    const router = useRouter();

    const startApp = () => {
        router.push('/(tabs)?mode=chatOnly' as any);
    };

    const images = [
        require('@/assets/images/smarter-leben/slide1.jpg'),
        require('@/assets/images/smarter-leben/slide2.jpg'),
        require('@/assets/images/smarter-leben/slide3.jpg'),
        require('@/assets/images/smarter-leben/slide4.jpg'),
        require('@/assets/images/smarter-leben/slide5.jpg'),
        require('@/assets/images/smarter-leben/slide6.jpg'),
    ];

    const nextSlide = () => {
        setActiveIndex((prev) => (prev + 1) % images.length);
    };

    const prevSlide = () => {
        setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <View style={styles.carouselContainer}>
             <View style={styles.carouselWrapper}>
                 <View style={styles.carouselTrack}>
                    {images.map((img, index) => {
                        // Berechne relative Position für 3D Effekt
                        let offset = index - activeIndex;
                        if (offset < 0) offset += images.length; // Make positive
                        // Adjust for shortest path wrapping
                        if (offset > images.length / 2) offset -= images.length;
                        
                        // Bestimme Status
                        const isActive = offset === 0;
                        const isLeft = offset === -1 || (index === images.length - 1 && activeIndex === 0 && images.length > 2); // Left neighbor
                        const isRight = offset === 1 || (index === 0 && activeIndex === images.length - 1 && images.length > 2); // Right neighbor
                        
                        // Mobile: Nur aktives Bild anzeigen (oder Stack)
                        if (isMobile && !isActive) return null;

                        let translateX = 0;
                        let scale = 1;
                        let opacity = 1;
                        let zIndex = 1;
                        const spacing = isMobile ? 0 : 280; // Abstand der seitlichen Bilder

                        if (isActive) {
                            translateX = 0;
                            scale = isMobile ? 1 : 1.2;
                            opacity = 1;
                            zIndex = 10;
                        } else if (isLeft) {
                            translateX = -spacing;
                            scale = 0.8;
                            opacity = 0.5;
                            zIndex = 5;
                        } else if (isRight) {
                            translateX = spacing;
                            scale = 0.8;
                            opacity = 0.5;
                            zIndex = 5;
                        } else {
                            // Hidden logic for more than 3 images
                            opacity = 0;
                            zIndex = 0;
                        }

                        // Reanimated Styles inlinen wir hier vereinfacht für React State
                        // Für smoothere Performance wäre useAnimatedStyle besser, aber hier reicht React State Transition mit LayoutAnimation oder CSS transition
                        
                        return (
                            <Animated.View
                                key={index}
                                layout={Platform.OS === 'web' ? undefined :  undefined} // Native Layout Animation
                                style={[
                                    styles.carouselCard,
                                    {
                                        transform: [
                                            { translateX },
                                            { scale }
                                        ],
                                        opacity,
                                        zIndex,
                                        backgroundColor: isDark ? '#1a1a1a' : 'white',
                                        borderColor: isDark ? '#333' : '#e0e0e0',
                                        // CSS Transition für Web Smoothness
                                        //@ts-ignore
                                        transition: Platform.OS === 'web' ? 'all 0.5s ease' : undefined,
                                    }
                                ]}
                            >
                                <Image
                                    source={img}
                                    style={styles.carouselImageContent}
                                    resizeMode="cover"
                                />
                            </Animated.View>
                        );
                    })}
                 </View>

                 {/* Navigation Buttons - Außerhalb der Bilder */}
                 <TouchableOpacity 
                    onPress={prevSlide}
                    style={[styles.navButton, { left: isMobile ? 10 : -60, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                 >
                    <Ionicons name="chevron-back" size={24} color={isDark ? "white" : "black"} />
                 </TouchableOpacity>

                 <TouchableOpacity 
                    onPress={nextSlide}
                    style={[styles.navButton, { right: isMobile ? 10 : -60, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                 >
                    <Ionicons name="chevron-forward" size={24} color={isDark ? "white" : "black"} />
                 </TouchableOpacity>

             </View>

             {/* Carousel Indicators */}
             <View style={styles.carouselIndicators}>
                 {images.map((_, index) => (
                     <TouchableOpacity
                        key={index}
                        onPress={() => setActiveIndex(index)}
                        style={[
                            styles.indicatorDot,
                            {
                                backgroundColor: index === activeIndex ? Colors.primary : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                                width: index === activeIndex ? 24 : 8
                            }
                        ]}
                     />
                 ))}
             </View>

             {/* Description Text */}
             <Text style={[styles.carouselCaption, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
                {t('landing.carousel.caption')}
             </Text>

             {/* DOWNLOAD SECTION */}
             <View style={styles.downloadSection}>
                <TouchableOpacity style={[styles.storeBtn, { backgroundColor: isDark ? 'black' : 'black' }]}>
                    <Ionicons name="logo-apple" size={32} color="white" />
                    <View>
                        <Text style={styles.storeSmallText}>{t('landing.carousel.storeSmallApp')}</Text>
                        <Text style={styles.storeLargeText}>{t('landing.carousel.storeLargeApp')}</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.storeBtn, { backgroundColor: isDark ? 'black' : 'black' }]}>
                    <Ionicons name="logo-google-playstore" size={28} color="white" />
                    <View>
                        <Text style={styles.storeSmallText}>{t('landing.carousel.storeSmallPlay')}</Text>
                        <Text style={styles.storeLargeText}>{t('landing.carousel.storeLargePlay')}</Text>
                    </View>
                </TouchableOpacity>
             </View>
        </View>
    );
};

const GlobalStyles = () => {
  if (Platform.OS !== 'web') return null;
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      ::-webkit-scrollbar {
        width: 10px;
      }
      ::-webkit-scrollbar-track {
        background: #050505;
      }
      ::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 10px;
        border: 2px solid #050505;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #444;
      }
      html {
        scrollbar-width: thin;
        scrollbar-color: #333 #050505;
      }
    `}} />
  );
};

export default function LandingPage() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (Platform.OS === 'web' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        // Polling until the element is found after mount
        const attemptScroll = (retries = 0) => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else if (retries < 10) {
            setTimeout(() => attemptScroll(retries + 1), 100);
          }
        };
        setTimeout(attemptScroll, 100);
      }
    }
  }, []);

  const startApp = () => {
    router.push('/(tabs)?mode=chatOnly' as any);
  };

  const scrollToSection = (sectionId: string) => {
    if (Platform.OS === 'web') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
        <GlobalStyles />
        <ScrollView
            style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}
            contentContainerStyle={{ paddingBottom: 0 }}
            showsVerticalScrollIndicator={true}
        >
        {/* --- HERO SECTION --- */}
        <View nativeID="hero" style={styles.heroSection}>
            {/* Background Gradients */}
            <LinearGradient
                colors={isDark ? [Colors.dark.background, Colors.dark.background] : ['#ecfdf5', '#ffffff']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />
            
            {/* Abstract Background Blobs */}
            <View style={[styles.blob, { top: -100, right: -100, backgroundColor: Colors.primary, opacity: 0.1 }]} />
            <View style={[styles.blob, { top: 200, left: -150, backgroundColor: Colors.secondary, opacity: 0.08, width: 400, height: 400 }]} />

            <View style={styles.heroGrid}>
                {/* Left: Content */}
                <View style={styles.heroContent}>
                    <Animated.View entering={FadeInDown.duration(1000)} style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>{t('landing.hero.badge')}</Text>
                    </Animated.View>

                    <Animated.Text entering={FadeInDown.delay(200).duration(1000)} style={[styles.heroTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                        <Trans
                            t={t}
                            i18nKey="landing.hero.title"
                            components={{ '1': <Text style={{ color: Colors.primary }} /> }}
                        />
                    </Animated.Text>

                    <Animated.Text entering={FadeInDown.delay(400).duration(1000)} style={[styles.heroSubtitle, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
                        {t('landing.hero.subtitle')}
                    </Animated.Text>

                    {/* Mobile Feature Icons */}
                    {isMobile && (
                        <Animated.View entering={FadeInDown.delay(500).duration(1000)} style={styles.mobileHeroFeatures}>
                            <View style={styles.mobileFeatureItem}>
                                <View style={[styles.mobileFeatureIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} />
                                </View>
                                <Text style={[styles.mobileFeatureText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>Chat</Text>
                            </View>
                            <View style={styles.mobileFeatureItem}>
                                <View style={[styles.mobileFeatureIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                    <Ionicons name="stats-chart-outline" size={20} color={Colors.primary} />
                                </View>
                                <Text style={[styles.mobileFeatureText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>Insights</Text>
                            </View>
                            <View style={styles.mobileFeatureItem}>
                                <View style={[styles.mobileFeatureIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                    <Ionicons name="mic-outline" size={20} color={Colors.primary} />
                                </View>
                                <Text style={[styles.mobileFeatureText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>Voice</Text>
                            </View>
                        </Animated.View>
                    )}

                    <Animated.View entering={FadeInDown.delay(600).duration(1000)} style={styles.heroButtonsColumn}>
                        <TouchableOpacity 
                            onPress={() => scrollToSection('features')} 
                            style={[
                                styles.secondaryBtn, 
                                { 
                                    borderColor: isDark ? Colors.dark.border : Colors.light.border, 
                                    borderWidth: 2, // Verstärkte Umrandung
                                    width: '100%', 
                                    justifyContent: 'center' 
                                }
                            ]}
                        >
                            <Text style={[styles.secondaryBtnText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{t('landing.hero.btnLearnMore')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => scrollToSection('carousel')} 
                            style={[
                                styles.primaryBtn, 
                                { 
                                    backgroundColor: Colors.primary, 
                                    shadowColor: Colors.primary, 
                                    width: '100%', 
                                    justifyContent: 'center' 
                                }
                            ]}
                        >
                            <Text style={styles.primaryBtnText}>Simply App</Text>
                            {/* Icon entfernt */}
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Right: Abstract Visuals */}
                <Animated.View
                    entering={FadeInDown.delay(800).springify()}
                    style={[
                        styles.heroVisualsWrapper,
                        { display: width > 900 ? 'flex' : 'none' }
                    ]}
                >
                     <HeroVisuals isDark={isDark} />
                </Animated.View>
            </View>
        </View>

        {/* Global Wrapper for Scaling down other sections */}
        {/* Scale 0.7 erzeugt leeren Raum unten, daher negativer Margin nötig */}
        {/* nativeID hierher verschoben für besseres Scrolling trotz Scale */}
        <View nativeID="features" style={width > 768 ? { transform: [{ scale: 0.7 }], transformOrigin: 'top center', marginTop: -150, marginBottom: -1100 } : undefined}>
            {/* --- FEATURES GRID --- */}
            <View style={[styles.sectionContainer, { paddingTop: 180, paddingBottom: 140 }]}>
                <SectionTitle
                    title={t('landing.features.title')}
                    subtitle={t('landing.features.subtitle')}
                    isDark={isDark}
                />
            
            <View style={styles.gridContainer}>
                {[
                    {
                        icon: "chatbubble-ellipses",
                        title: t('landing.features.f1.title'),
                        desc: t('landing.features.f1.desc')
                    },
                    {
                        icon: "stats-chart",
                        title: t('landing.features.f2.title'),
                        desc: t('landing.features.f2.desc')
                    },
                    {
                        icon: "mic",
                        title: t('landing.features.f3.title'),
                        desc: t('landing.features.f3.desc')
                    },
                    {
                        icon: "calendar",
                        title: t('landing.features.f4.title'),
                        desc: t('landing.features.f4.desc')
                    },
                    {
                        icon: "shield-checkmark",
                        title: t('landing.features.f5.title'),
                        desc: t('landing.features.f5.desc')
                    }
                ].map((feature, index) => (
                    <FeatureCard
                        key={index}
                        icon={feature.icon}
                        title={feature.title}
                        desc={feature.desc}
                        delay={index * 200} // Dynamisches Delay für Stagger-Effekt
                        isDark={isDark}
                    />
                ))}
            </View>
        </View>

        {/* --- CAROUSEL SHOWCASE --- */}
        <View nativeID="carousel" style={[styles.sectionContainer, { paddingVertical: 100 }]}>
            <ImageCarousel isDark={isDark} />
        </View>

        {/* --- PRICING SECTION --- */}
        <View nativeID="preise" style={[styles.sectionContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)' }]}>
            <SectionTitle
                title={t('landing.pricing.title')}
                subtitle={t('landing.pricing.subtitle')}
                isDark={isDark}
            />

            <View style={styles.pricingGrid}>
                <PricingCard
                    title={t('landing.pricing.p1.title')}
                    price={t('landing.pricing.p1.price')}
                    period={t('landing.pricing.p1.period')}
                    features={t('landing.pricing.p1.features', { returnObjects: true })}
                    isPopular={false}
                    isDark={isDark}
                    index={0}
                    popularText={t('landing.pricing.popular')}
                    chooseText={t('landing.pricing.choose')}
                />
                <PricingCard
                    title={t('landing.pricing.p2.title')}
                    price={t('landing.pricing.p2.price')}
                    period={t('landing.pricing.p2.period')}
                    features={t('landing.pricing.p2.features', { returnObjects: true })}
                    isPopular={true}
                    isDark={isDark}
                    index={1}
                    popularText={t('landing.pricing.popular')}
                    chooseText={t('landing.pricing.choose')}
                />
                <PricingCard
                    title={t('landing.pricing.p3.title')}
                    price={t('landing.pricing.p3.price')}
                    priceSubtitle={t('landing.pricing.savings')}
                    period={t('landing.pricing.p3.period')}
                    features={t('landing.pricing.p3.features', { returnObjects: true })}
                    isPopular={false}
                    isDark={isDark}
                    index={2}
                    popularText={t('landing.pricing.popular')}
                    chooseText={t('landing.pricing.choose')}
                />
            </View>
        </View>

        {/* --- ABOUT US SECTION --- */}
        <View nativeID="vision" style={[styles.sectionContainer, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
             <SectionTitle
                title={t('landing.about.title')}
                subtitle={t('landing.about.subtitle')}
                isDark={isDark}
            />
            
            <View style={[styles.aboutContent, { maxWidth: 1000 }]}>
                <Animated.View entering={FadeInUp.duration(800)} style={[styles.aboutTextContainer, { padding: isMobile ? 24 : 60, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Text style={[styles.aboutText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary, fontSize: isMobile ? 18 : 24, lineHeight: isMobile ? 28 : 36 }]}>
                        <Trans
                            t={t}
                            i18nKey="landing.about.text1"
                            components={{
                                '1': <Text style={{ fontWeight: 'bold', color: isDark ? Colors.dark.text : Colors.light.text }} />,
                                '2': <Text style={{ color: Colors.primary, fontWeight: '600' }} />
                            }}
                        />
                    </Text>
                    <View style={{ height: 24 }} />
                    <Text style={[styles.aboutText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary, fontSize: isMobile ? 18 : 24, lineHeight: isMobile ? 28 : 36 }]}>
                        <Trans
                            t={t}
                            i18nKey="landing.about.text2"
                            components={{
                                '1': <Text style={{ fontWeight: 'bold', color: isDark ? Colors.dark.text : Colors.light.text }} />
                            }}
                        />
                    </Text>
                    <View style={{ height: 32 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="code-slash" size={32} color="white" />
                        </View>
                        <View>
                            <Text style={[styles.founderName, { color: isDark ? Colors.dark.text : Colors.light.text, fontSize: 22 }]}>{t('landing.about.founderName', 'Leon')}</Text>
                            <Text style={[styles.founderRole, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary, fontSize: 18 }]}>{t('landing.about.role')}</Text>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </View>

        {/* --- CONTACT SECTION --- */}
        <View nativeID="kontakt" style={[styles.sectionContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)', paddingBottom: 300 }]}>
             <SectionTitle
                title={t('landing.contact.title')}
                // Subtitle entfernt auf User-Wunsch
                isDark={isDark}
            />

            <Animated.View entering={FadeInUp.delay(200)} style={[styles.contactCard, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface, borderColor: isDark ? Colors.dark.glassBorder : Colors.light.glassBorder }]}>
                <LinearGradient
                    colors={isDark ? ['rgba(16, 185, 129, 0.05)', 'transparent'] : ['rgba(16, 185, 129, 0.03)', 'transparent']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <Text style={[styles.contactSub, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
                    {t('landing.contact.subtitle')}
                </Text>
                
                <TouchableOpacity style={[styles.contactBtn, { backgroundColor: Colors.primary }]}>
                    <Ionicons name="mail" size={28} color="white" />
                    <Text style={styles.contactBtnText}>hallo@simplyai.app</Text>
                </TouchableOpacity>

                <View style={styles.socialLinks}>
                     {/* Placeholder Socials */}
                     <TouchableOpacity style={[styles.socialIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                        <Ionicons name="logo-twitter" size={32} color={isDark ? "white" : "black"} />
                     </TouchableOpacity>
                     <TouchableOpacity style={[styles.socialIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                        <Ionicons name="logo-linkedin" size={32} color={isDark ? "white" : "black"} />
                     </TouchableOpacity>
                     <TouchableOpacity style={[styles.socialIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                        <Ionicons name="logo-instagram" size={32} color={isDark ? "white" : "black"} />
                     </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
        </View>

        {/* --- FOOTER (Außerhalb des skalierten Wrappers) --- */}
        <View style={[styles.footer, { backgroundColor: isDark ? Colors.dark.background : '#f0fdf4', paddingTop: 60 }]}>
             <LinearGradient
                colors={isDark ? ['transparent', Colors.dark.background] : ['rgba(240,253,244,0)', '#f0fdf4']}
                style={[StyleSheet.absoluteFill, { top: -50, height: 50 }]}
            />
            <View style={styles.footerContent}>
                <View style={styles.footerCol}>
                <Text style={[styles.footerBrand, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Simply</Text>
                <Text style={[styles.footerText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
                    {t('landing.footer.tagline')}
                </Text>
                </View>
                <View style={styles.footerLinks}>
                    <TouchableOpacity onPress={() => scrollToSection('vision')}>
                        <Text style={[styles.footerLink, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>{t('landing.footer.about')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/datenschutz' as any)}>
                        <Text style={[styles.footerLink, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>{t('landing.footer.privacy')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/impressum' as any)}>
                        <Text style={[styles.footerLink, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>{t('landing.footer.imprint')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/agb' as any)}>
                        <Text style={[styles.footerLink, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>{t('landing.footer.terms')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => scrollToSection('kontakt')}>
                        <Text style={[styles.footerLink, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>{t('landing.footer.contact')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={[styles.footerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
            <Text style={[styles.copyright, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>© {new Date().getFullYear()} Simply.</Text>
        </View>


        </ScrollView>
        
        {/* FIXED CLOCK BOTTOM RIGHT */}
        <DigitalClock isDark={isDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    filter: 'blur(80px)',
  },
  // HERO
  heroSection: {
    minHeight: height > 800 ? '80vh' : 600,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGrid: {
    flexDirection: width > 960 ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 1200,
    width: '100%',
    gap: 60,
  },
  heroContent: {
    flex: 1,
    maxWidth: 600,
    alignItems: width > 960 ? 'flex-start' : 'center',
  },
  heroBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 24,
  },
  heroBadgeText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  heroTitle: {
    fontSize: width > 768 ? 56 : 40,
    fontWeight: '800',
    textAlign: width > 960 ? 'left' : 'center',
    lineHeight: width > 768 ? 68 : 48,
    marginBottom: 20,
  },
  heroSubtitle: {
    fontSize: 18,
    textAlign: width > 960 ? 'left' : 'center',
    maxWidth: 500,
    marginBottom: 40,
    lineHeight: 28,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 60,
    flexWrap: 'wrap',
    justifyContent: width > 960 ? 'flex-start' : 'center',
  },
  heroButtonsColumn: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 60,
    width: '100%',
    maxWidth: 300,
    alignItems: width > 960 ? 'flex-start' : 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 18,
    fontWeight: '600',
  },

  // VISUALS
  heroVisualsWrapper: {
    width: 500,
    height: 500,
    alignItems: 'center',
    justifyContent: 'center',
    display: width > 768 ? 'flex' : 'none',
  },
  visualsContainer: {
    width: 400,
    height: 450,
    position: 'relative',
  },
  visualCard: {
    position: 'absolute',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    backdropFilter: 'blur(10px)', // Web Only
  },
  visualLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  chatLine: {
    height: 8,
    borderRadius: 4,
  },
  graphContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 100,
    width: 100,
    justifyContent: 'center',
    marginBottom: 4,
  },
  graphBar: {
    width: 20,
    borderRadius: 4,
  },
  micIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pulseRing: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderWidth: 2,
    borderRadius: 50,
    zIndex: 1,
  },
  logoCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 200,
    height: 400,
    marginTop: -200,
    marginLeft: -100,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    transform: [{ scale: 0.7 }],
  },
  heroLogoImage: {
    width: '94%', // Ein Stück kleiner für den "Screenshot im Display" Look
    height: '96%', // Oben und unten auch minimaler Abstand
    borderRadius: 24,
  },
  slideTrack: {
    flexDirection: 'row',
    height: '100%',
    paddingTop: 0, // Bündig am oberen Rand
  },

  // FEATURES
  sectionContainer: {
    paddingVertical: 100,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  sectionHeader: {
    marginBottom: 100,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    maxWidth: 600,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 1600,
    width: '100%',
  },
  featureCard: {
    // Width wird jetzt dynamisch im Component gesetzt
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 18, // Größer auf User-Wunsch
    lineHeight: 28,
  },

  // PRICING
  pricingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 48,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pricingGrid: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 900,
  },
  pricingCard: {
    flex: 1,
    minWidth: 300,
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pricingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  pricePeriod: {
    fontSize: 16,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginBottom: 24,
  },
  featuresList: {
    gap: 16,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
  },
  pricingBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  pricingBtnText: {
    fontWeight: 'bold',
    fontSize: 16,
  },

  // ABOUT US
  aboutContent: {
    maxWidth: 800,
    width: '100%',
    alignItems: 'center',
  },
  aboutTextContainer: {
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    width: '100%',
  },
  aboutText: {
    fontSize: 18,
    lineHeight: 28,
  },
  founderName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  founderRole: {
    fontSize: 14,
  },

  // CONTACT
  contactCard: {
      padding: 60,
      borderRadius: 40,
      borderWidth: 1,
      alignItems: 'center',
      maxWidth: 900,
      width: '100%',
      gap: 40,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.15,
      shadowRadius: 40,
      overflow: 'hidden',
  },
  contactHeading: {
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
  },
  contactSub: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 400,
  },
  contactBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: 20,
      paddingHorizontal: 48,
      borderRadius: 100,
      marginTop: 8,
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
  },
  contactBtnText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 22,
      letterSpacing: 0.5,
  },
  socialLinks: {
      flexDirection: 'row',
      gap: 24,
      marginTop: 12,
  },
  socialIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
  },

  // FOOTER
  footer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
  },
  footerContent: {
    width: '100%',
    maxWidth: 1000,
    flexDirection: width > 768 ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: width > 768 ? 'flex-start' : 'center',
    gap: 40,
    marginBottom: 40,
  },
  footerCol: {
    maxWidth: 300,
    alignItems: width > 768 ? 'flex-start' : 'center',
  },
  footerBrand: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: width > 768 ? 'left' : 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 24,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerDivider: {
    width: '100%',
    maxWidth: 1000,
    height: 1,
    marginBottom: 24,
  },
  copyright: {
    fontSize: 12,
    opacity: 0.6,
  },
  
  // CLOCK
  clockContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 100,
  },
  clockText: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  mobileHeroFeatures: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 32,
    marginTop: 8,
    width: '100%',
  },
  mobileFeatureItem: {
    alignItems: 'center',
    gap: 8,
  },
  mobileFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  mobileFeatureText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // CAROUSEL
  carouselContainer: {
      alignItems: 'center',
      width: '100%',
      maxWidth: 1200,
      paddingHorizontal: 20,
      gap: 30,
      overflow: 'visible', // Wichtig für 3D Effekt überlappung
  },
  carouselWrapper: {
      width: '100%',
      height: 600, // Höher für Portrait Bilder
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
  },
  carouselTrack: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
  },
  carouselCard: {
      position: 'absolute',
      width: 260, // Schmaler, damit bei 'cover' weniger abgeschnitten wird
      height: 580,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 5,
  },
  carouselImageContent: {
      width: '100%',
      height: '100%',
  },
  activeLabel: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 100,
  },
  activeLabelText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 14,
  },
  carouselIndicators: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
  },
  indicatorDot: {
      height: 8,
      borderRadius: 4,
  },
  navButton: {
      position: 'absolute',
      top: '50%',
      marginTop: -24,
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      cursor: 'pointer',
  },
  carouselCaption: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 10,
      opacity: 0.7,
  },
  downloadSection: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      justifyContent: 'center',
      marginTop: 32,
  },
  storeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: 'black',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 12,
      minWidth: 160,
      borderWidth: 1,
      borderColor: '#333',
  },
  storeSmallText: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
  },
  storeLargeText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
  },
});
