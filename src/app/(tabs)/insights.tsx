import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, AppState, DeviceEventEmitter } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import Svg, { Circle, Path, G, Text as SvgText, Line } from 'react-native-svg';
import { getDashboardData, getRealDashboardData, DashboardData } from '@/services/databaseService';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

const { width: windowWidth } = Dimensions.get('window');
const width = Math.min(windowWidth, 600); // Max width for content container
const cardWidth = (width - 60) / 2; // 2 column layout
const fullWidth = width - 40;

// Empty States (Fallback)
const emptyPieData = [];
const emptyKeywordsList = [];
const emptyBarData = {
  labels: [],
  datasets: [{ data: [] }]
};

// Hilfsfunktion für Icons
const getIconForCategory = (category: string) => {
    const cat = (category || "").toLowerCase();
    if (cat.includes('sport') || cat.includes('fussball') || cat.includes('football')) return 'football-outline';
    if (cat.includes('fitness') || cat.includes('training') || cat.includes('workout')) return 'fitness-outline';
    if (cat.includes('tech') || cat.includes('computer') || cat.includes('handy')) return 'hardware-chip-outline';
    if (cat.includes('finanz') || cat.includes('aktie') || cat.includes('wirtschaft')) return 'trending-up-outline';
    if (cat.includes('essen') || cat.includes('kochen') || cat.includes('restaurant')) return 'restaurant-outline';
    if (cat.includes('reise') || cat.includes('urlaub')) return 'airplane-outline';
    if (cat.includes('gesundheit') || cat.includes('medizin') || cat.includes('körper')) return 'fitness-outline';
    if (cat.includes('musik')) return 'musical-notes-outline';
    if (cat.includes('film') || cat.includes('kino') || cat.includes('unterhaltung')) return 'videocam-outline';
    if (cat.includes('shopping') || cat.includes('kauf')) return 'cart-outline';
    if (cat.includes('bildung') || cat.includes('schule') || cat.includes('lernen')) return 'book-outline';
    if (cat.includes('natur') || cat.includes('umwelt')) return 'leaf-outline';
    return 'chatbubble-ellipses-outline'; // Default
};

// Hilfsfunktion für Sentiment-Icons
const getSentimentIcon = (sentiment: string) => {
    const s = (sentiment || "").toLowerCase();
    if (s.includes('sport')) return 'fitness-outline';
    if (s.includes('humor')) return 'happy-outline';
    if (s.includes('interessiert') || s.includes('neugierig')) return 'search-outline';
    if (s.includes('motiviert') || s.includes('begeistert')) return 'flame-outline';
    if (s.includes('skeptisch') || s.includes('kritisch')) return 'help-circle-outline';
    if (s.includes('frustriert') || s.includes('genervt')) return 'alert-circle-outline';
    if (s.includes('entspannt')) return 'leaf-outline';
    if (s.includes('analytisch') || s.includes('sachlich')) return 'bar-chart-outline';
    return 'pulse-outline'; // Default
};

// --- Demo Data ---
const DEMO_DASHBOARD_DATA: DashboardData = {
    pieData: [
        { name: 'Tech', population: 45, color: '#3B82F6', legendFontColor: '#7F7F7F', legendFontSize: 12 },
        { name: 'Fitness', population: 25, color: '#10B981', legendFontColor: '#7F7F7F', legendFontSize: 12 },
        { name: 'Finanzen', population: 20, color: '#FACC15', legendFontColor: '#7F7F7F', legendFontSize: 12 },
        { name: 'Reisen', population: 10, color: '#EF4444', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    ],
    recentKeywords: [
        { text: 'KI Trends 2026', icon: 'tech' },
        { text: 'Marathon Training', icon: 'sport' },
        { text: 'Bitcoin Kurs', icon: 'finanz' },
        { text: 'Urlaub in Japan', icon: 'reise' },
    ],
    topKeywords: [
        { text: 'Künstliche Intelligenz', count: 12, percentage: 85 },
        { text: 'React Native', count: 9, percentage: 72 },
        { text: 'Gesunde Ernährung', count: 8, percentage: 65 },
        { text: 'Finanzielle Freiheit', count: 7, percentage: 58 },
        { text: 'Produktivität', count: 7, percentage: 55 },
        { text: 'Deep Focus', count: 6, percentage: 50 },
        { text: 'Morgenroutine', count: 5, percentage: 45 },
        { text: 'KI-Automatisierung', count: 5, percentage: 42 },
        { text: 'Wellness & Biohacking', count: 4, percentage: 38 },
        { text: 'Kreatives Schreiben', count: 4, percentage: 35 },
        { text: 'Smart Home Setup', count: 3, percentage: 30 },
        { text: 'Zeitmanagement', count: 3, percentage: 28 },
        { text: 'Nachhaltigkeit', count: 2, percentage: 22 },
        { text: 'Digitaler Minimalismus', count: 2, percentage: 18 },
        { text: 'Networking', count: 1, percentage: 12 },
    ],
    barData: {
        labels: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
        datasets: [{ data: [5, 12, 8, 15, 20, 10, 5] }]
    },
    sentimentStats: {
        positive: 65,
        neutral: 25,
        negative: 10,
        total: 100,
        detailed_sentiment: 'Motiviert & Produktiv',
        dynamic_recommendation: 'Du bist diese Woche sehr fokussiert auf Tech-Themen. Schau dir mal neue TypeScript Features an.',
        dynamic_reminder: 'Vergiss nicht dein Training heute Nachmittag!'
    }
};

const SentimentGauge = ({ theme, stats }: { theme: any, stats?: { positive: number, neutral: number, negative: number, total: number, detailed_sentiment?: string } }) => {
    // Berechne Prozente
    const total = stats?.total || 1;
    const posP = stats ? stats.positive / total : 0.6;
    const neuP = stats ? stats.neutral / total : 0.3;
    const negP = stats ? stats.negative / total : 0.1;

    // Score: 0 (Ganz Negativ) bis 1 (Ganz Positiv)
    const score = (posP * 1.0 + neuP * 0.5 + negP * 0.0);
    const indicatorPosition = score * 100; // 0% bis 100%

    const sentimentLabel = stats?.detailed_sentiment || "Neutral";
    const iconName = getSentimentIcon(sentimentLabel);

    return (
        <View style={{ width: '100%', paddingVertical: 20, alignItems: 'center' }}>
            {/* Sentiment Label - Harmonized Size */}
            <Text style={{ 
                fontSize: 22, 
                fontWeight: '800', 
                color: theme.text, 
                letterSpacing: 1.5,
                marginBottom: 15,
                textTransform: 'uppercase',
                opacity: 0.9
            }}>
                {sentimentLabel}
            </Text>

            {/* Mood Bar Container */}
            <View style={{ width: '100%', height: 12, justifyContent: 'center' }}>
                <LinearGradient
                    colors={['#EF4444', '#FACC15', '#4ADE80']} // Rot -> Gelb -> Grün
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ 
                        width: '100%', 
                        height: 8, 
                        borderRadius: 4,
                        opacity: 0.8
                    }}
                />

                <View style={{ 
                    position: 'absolute', 
                    left: `${indicatorPosition}%`, 
                    marginLeft: -20, 
                    width: 40,
                    height: 40,
                    backgroundColor: theme.surface || (theme.text === '#000' ? '#fff' : '#1e1e1e'),
                    borderRadius: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: theme.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 4,
                    zIndex: 10
                }}>
                    <Ionicons 
                        name={iconName as any} 
                        size={22} 
                        color={Colors.primary} 
                    />
                </View>
            </View>

            <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                width: '100%', 
                marginTop: 15,
                paddingHorizontal: 5
            }}>
                <Text style={{ color: theme.textSecondary, fontSize: 10, fontWeight: '600' }}>NEGATIV</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 10, fontWeight: '600' }}>POSITIV</Text>
            </View>
        </View>
    );
}

const HeatmapGrid = ({ theme }: { theme: any }) => {
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    // Layout-Berechnung für exakte Spaltenausrichtung
    const labelWidth = 30;
    const gap = 2;
    const availableWidth = fullWidth - labelWidth - 10;
    const squareSize = Math.floor((availableWidth / 24) - gap);
    const totalGridWidth = (squareSize + gap) * 24;

    // Logische Aktivitätsdaten-Generierung
    const getActivityValue = (h: number) => {
        // Sparse Pattern: Sorge für eine "spritzigere", natürlichere Verteilung
        // Höhere Wahrscheinlichkeit für Inaktivität (leere Felder)
        const activityRoll = Math.random();
        
        // Zeitabhängige Wahrscheinlichkeit für *irgendeine* Aktivität
        let baseChance = 0.15; // Nachts: sehr gering (15%)
        if (h >= 8 && h <= 22) {
            baseChance = 0.45; // Tagsüber/Abends: moderate Chance (45%)
        }

        if (activityRoll > baseChance) return 0;

        // Wenn aktiv, Verteilung der Intensität (Power-Law-ähnlich)
        const intensityRoll = Math.random();
        
        // Nur vereinzelte Felder zeigen hohe Aktivität (Dunkelorange)
        if (intensityRoll > 0.90) return 0.9; 
        // Die meisten aktiven Felder zeigen wenig bis moderate Aktivität
        if (intensityRoll > 0.60) return 0.6;
        if (intensityRoll > 0.30) return 0.3;
        return 0.15;
    };

    const getHeatColor = (val: number) => {
        if (val >= 0.8) return '#EA580C'; // Dunkles Orange für Peaks (Peak Activity)
        if (val >= 0.6) return '#10B981'; // Emerald 500 (High Activity)
        if (val >= 0.3) return '#6EE7B7'; // Emerald 300 (Medium Activity)
        if (val > 0) return '#A7F3D0';    // Emerald 200 (Low Activity)
        return 'rgba(16, 185, 129, 0.08)'; // Dezentere Basis (No Activity)
    };

    return (
        <View style={{ marginTop: 10, width: '100%', alignItems: 'center' }}>
            <View style={{ width: totalGridWidth + labelWidth }}>
                {days.map((day, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ color: theme.textSecondary, width: labelWidth, fontSize: 10, fontWeight: '600' }}>{day}</Text>
                        <View style={{ flexDirection: 'row', gap: gap }}>
                            {hours.map((h) => {
                                // Wir nutzen h als Seed-Basis für konsistente "Zufallsdaten" pro Zelle beim Re-Render (optional)
                                // Aber hier lassen wir es dynamisch für den "Live"-Effekt
                                const heatValue = getActivityValue(h);
                                return (
                                    <View key={h} style={{
                                        width: squareSize,
                                        height: squareSize,
                                        borderRadius: 2,
                                        backgroundColor: getHeatColor(heatValue),
                                    }} />
                                );
                            })}
                        </View>
                    </View>
                ))}
                
                {/* Zeit-Labels exakt an den Spalten ausgerichtet */}
                <View style={{
                    flexDirection: 'row',
                    marginLeft: labelWidth,
                    marginTop: 8,
                    position: 'relative',
                    height: 15
                }}>
                    {[0, 4, 8, 12, 16, 20, 23].map((hour) => {
                        const leftOffset = hour * (squareSize + gap);
                        return (
                            <View
                                key={hour}
                                style={{
                                    position: 'absolute',
                                    left: leftOffset,
                                    width: squareSize,
                                    alignItems: 'center'
                                }}
                            >
                                <Text style={{
                                    color: theme.textSecondary,
                                    fontSize: 9,
                                    fontWeight: '700',
                                    opacity: 0.6
                                }}>
                                    {hour.toString().padStart(2, '0')}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    )
}

export default function InsightsScreen() {
  const { theme: contextTheme, toggleTheme, isDark } = useTheme();
  const theme = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);
  
  const loadData = async (manual = false) => {
      if (manual) setIsDemoMode(false);

      if (!user) {
          if (isMounted.current) setDashboardData(null);
          return;
      }

      if (manual && isLoading) return;
      if (manual) setIsLoading(true);
      
      try {
         const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 25000)
         );

         const dataPromise = getRealDashboardData(user.id, manual);
         
         // @ts-ignore
         const data = await Promise.race([dataPromise, timeoutPromise]);
         
         if (isMounted.current) {
             setDashboardData(data);
             const hasData = data && (
                (data.pieData && data.pieData.length > 0) ||
                (data.recentKeywords && data.recentKeywords.length > 0)
             );
          
             if (!hasData && manual) {
                 Alert.alert("Hinweis", "Keine neuen Insights gefunden.");
             }
         }
      } catch (e) {
         console.error("Failed to load dashboard data", e);
         if (manual && isMounted.current) {
             const errMsg = e instanceof Error && e.message === 'Timeout'
                ? "Die Verbindung ist langsam. Versuche es später erneut."
                : "Daten konnten nicht aktualisiert werden.";
             if (manual) {
                 Alert.alert("Hinweis", errMsg);
             }
         }
      } finally {
         if (manual && isMounted.current) {
             setIsLoading(false);
         }
      }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadData(false);
      } else {
        let attempts = 0;
        const maxAttempts = 10;
        const interval = setInterval(() => {
          attempts++;
          if (user) {
            loadData(false);
            clearInterval(interval);
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
          }
        }, 500);
        return () => clearInterval(interval);
      }
    }
  }, [user, authLoading]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadData(false);
      }
    }, [user])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active' && user) {
            loadData(false);
        }
    });
    return () => {
        subscription.remove();
    };
  }, [user]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('event.insights.refresh', () => {
        if (user) {
            loadData(false);
        }
    });
    return () => subscription.remove();
  }, [user]);

  if (authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient
            colors={isDark ? ['#022c22', '#064e3b', '#021814'] : [Colors.light.background, '#EFEEEA', '#E5E3DE']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        />
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  const isUserLoggedIn = !!user;
  const hasRealData = dashboardData && (
    (dashboardData.pieData && dashboardData.pieData.length > 0) ||
    (dashboardData.recentKeywords && dashboardData.recentKeywords.length > 0)
  );

  const activeData = (isDemoMode || (!isUserLoggedIn) || (isUserLoggedIn && !hasRealData && !isLoading)) 
    ? DEMO_DASHBOARD_DATA 
    : (dashboardData || DEMO_DASHBOARD_DATA);

  const displayPieData = (activeData.pieData || []);
  const displayKeywords = (activeData.recentKeywords || []);
  // @ts-ignore
  const displayTopKeywords = (activeData.topKeywords || []);
  const displayBarData = (activeData.barData || { labels: [], datasets: [{ data: [] }] });
  
  const displaySentiment = activeData.sentimentStats;
  const safeSentiment = displaySentiment ? {
      ...displaySentiment,
      total: displaySentiment.total === 0 ? 1 : displaySentiment.total
  } : { positive: 0, neutral: 0, negative: 0, total: 1 };

  const dynamicRecommendation = displaySentiment?.dynamic_recommendation || "Schau dir unseren neuen Kurs zu KI-Anwendungen an.";
  const dynamicReminder = displaySentiment?.dynamic_reminder || "Dein Ziel, mehr zu lesen, ist noch offen.";

  return (
    <View style={styles.container}>
       <LinearGradient
            colors={isDark ? ['#022c22', '#064e3b', '#021814'] : [Colors.light.background, '#EFEEEA', '#E5E3DE']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Simply Insights</Text>
                <View 
                    style={{ 
                        backgroundColor: Colors.primary, 
                        paddingHorizontal: 8, 
                        paddingVertical: 2, 
                        borderRadius: 6,
                        shadowColor: Colors.primary,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 5,
                        elevation: 3
                    }}
                >
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>DEMO</Text>
                </View>
            </View>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            onPress={() => loadData(true)}
            style={{
                alignSelf: 'center',
                marginBottom: 20,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center'
            }}
            disabled={isLoading}
          >
             {isLoading ? <ActivityIndicator size="small" color={theme.text} style={{marginRight: 8}} /> : <Ionicons name="refresh" size={16} color={theme.text} style={{marginRight: 8}} />}
             <Text style={{color: theme.text, fontWeight: '500', fontSize: 14}}>{isLoading ? 'Lade Daten...' : 'Daten aktualisieren'}</Text>
          </TouchableOpacity>

          {/* Row 1: Pie & List */}
          <View style={styles.row}>
            {/* Pie Chart Card */}
            <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={[styles.card, styles.halfCard, { borderColor: theme.border }]}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(tabs)/keyword-details', params: { category: 'All' } })}
                activeOpacity={0.8}
              >
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10}}>
                    <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Kategorien</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                  </View>
                  {displayPieData.length > 0 ? (
                      <>
                      <PieChart
                        data={displayPieData}
                        width={cardWidth - 5}
                        height={120}
                        chartConfig={{ color: () => theme.text }}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        hasLegend={false}
                        center={[35, 0]}
                        absolute
                      />
                      <View style={styles.legendContainer}>
                          {displayPieData.map((item, index) => (
                              <View key={index} style={styles.legendItem}>
                                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                  <Text style={[styles.legendText, { color: theme.textSecondary }]}>{item.name}</Text>
                              </View>
                          ))}
                      </View>
                      </>
                  ) : (
                      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', height: 100}}>
                          <Ionicons name="pie-chart-outline" size={32} color={theme.textSecondary} style={{opacity: 0.5}} />
                          <Text style={{fontSize: 10, color: theme.textSecondary, marginTop: 5}}>Keine Daten</Text>
                      </View>
                  )}
              </TouchableOpacity>
            </BlurView>

            {/* Top Keywords List Card */}
            <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={[styles.card, styles.halfCard, { borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Verlauf</Text>
              <View style={{marginTop: 10}}>
                  {displayKeywords.length > 0 ? (
                      displayKeywords.map((item, idx) => (
                          <View key={idx} style={[styles.keywordRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', padding: 6, borderRadius: 8, marginBottom: 6 }]}>
                             <Ionicons
                                name={getIconForCategory(item.icon) as any}
                                size={14}
                                color={Colors.primary}
                                style={{marginRight: 6}}
                             />
                             <Text style={[styles.keywordText, { color: theme.text, flex: 1 }]} numberOfLines={1}>{item.text}</Text>
                          </View>
                      ))
                  ) : (
                      <View style={{height: 100, justifyContent: 'center', alignItems: 'center'}}>
                          <Text style={{fontSize: 10, color: theme.textSecondary}}>Keine Keywords</Text>
                      </View>
                  )}
              </View>
            </BlurView>
          </View>

          {/* Row 2: Bar Chart */}
          <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={[styles.card, { borderColor: theme.border }]}>
             <View style={styles.barHeaderRow}>
                <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Top Kategorien Fokus</Text>
             </View>
             
             <View style={{height: 220, marginTop: 10, paddingHorizontal: 10}}>
                {displayPieData.length > 0 ? (
                    <View style={{flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 160}}>
                        {displayPieData.slice(0, 5).map((item, index) => {
                            const totalPop = displayPieData.reduce((acc, curr) => acc + curr.population, 0);
                            const percentage = totalPop > 0 ? Math.round((item.population / totalPop) * 100) : 0;
                            const maxPop = Math.max(...displayPieData.map(i => i.population), 1);
                            const heightPercentage = (item.population / maxPop) * 100;

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={{alignItems: 'center', width: '18%'}}
                                    activeOpacity={0.7}
                                    onPress={() => router.push({ pathname: '/(tabs)/keyword-details', params: { category: item.name } })}
                                >
                                    <Text style={{ color: theme.text, fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>
                                        {percentage}%
                                    </Text>

                                    <View style={{height: 140, width: '100%', justifyContent: 'flex-end'}}>
                                        <LinearGradient
                                            colors={item.color ? [item.color, Colors.primaryDark] : ['#4ade80', '#15803d']}
                                            style={{
                                                height: `${Math.max(heightPercentage, 10)}%`,
                                                width: '100%',
                                                borderTopLeftRadius: 8,
                                                borderTopRightRadius: 8,
                                                borderWidth: 1,
                                                borderColor: 'rgba(255,255,255,0.3)',
                                            }}
                                        />
                                    </View>
                                    
                                    <Text style={{marginTop: 8, fontSize: 9, fontWeight: '600', color: theme.textSecondary, textAlign: 'center'}} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : (
                    <View style={{height: 160, justifyContent: 'center', alignItems: 'center'}}>
                         <Text style={{color: theme.textSecondary}}>Keine Kategorien verfügbar</Text>
                    </View>
                )}
                <View style={{position: 'absolute', bottom: 45, left: 10, right: 10, height: 1, backgroundColor: theme.border, zIndex: -1, opacity: 0.3}} />
                <View style={{ alignItems: 'center', marginTop: 15 }}>
                     <Text style={{ fontSize: 11, color: theme.textSecondary, fontStyle: 'italic', opacity: 0.7 }}>
                         Details durch Tippen auf die Balken
                     </Text>
                </View>
             </View>
          </BlurView>

          {/* Heatmap (Full Width) */}
          <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={[styles.card, { borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Aktivitäts-Heatmap</Text>
            <HeatmapGrid theme={theme} />
          </BlurView>

          {/* Sentiment (Full Width Centered) */}
          <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={[styles.card, { borderColor: theme.border, alignItems: 'center' }]}>
            <Text style={[styles.cardTitle, { color: theme.textSecondary, textAlign: 'center' }]}>Stimmungs-Analyse</Text>
            <SentimentGauge theme={theme} stats={safeSentiment} />
          </BlurView>

          <View style={{height: 20}} />
          <Text style={[styles.headerTitle, { color: theme.text, fontSize: 20, textAlign: 'left', marginLeft: 5 }]}>Top 15 Keywords</Text>

          {/* Progress Bars */}
          {displayTopKeywords.length > 0 && (
              <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={[styles.card, { borderColor: theme.border }]}>
                  <Text style={[styles.cardTitle, { color: theme.textSecondary, marginBottom: 15 }]}>Keyword Relevanz</Text>
                  {displayTopKeywords.slice(0, 15).map((item: any, index: number) => (
                      <View key={index} style={styles.progressRow}>
                          <Text style={[styles.progressLabel, { color: theme.textSecondary, width: 100 }]} numberOfLines={1}>{item.text}</Text>
                          <View style={[styles.progressBarContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                              <LinearGradient
                                  colors={[Colors.primary, '#3B82F6']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 0 }}
                                  style={[styles.progressBarFill, { width: `${Math.max(item.percentage, 5)}%` }]}
                              />
                          </View>
                          <Text style={[styles.progressVal, { color: theme.text, fontWeight: '700' }]}>{item.count}</Text>
                      </View>
                  ))}
              </BlurView>
          )}

          {/* Notification Cards */}
          <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={[styles.card, styles.notificationCard, { borderColor: theme.border }]}>
              <View style={[styles.iconCircle, { borderColor: Colors.primary }]}>
                  <Ionicons name="bulb" size={26} color={Colors.primary} />
              </View>
              <View style={styles.notificationTextContainer}>
                  <Text style={[styles.notificationTitle, { color: theme.text }]}>{t('tabs.insights.notificationAI')}</Text>
                  <Text style={[styles.notificationBody, { color: theme.textSecondary }]}>{dynamicRecommendation}</Text>
              </View>
          </BlurView>

          <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={[styles.card, styles.notificationCard, { borderColor: theme.border }]}>
              <View style={[styles.iconCircle, { borderColor: '#3B82F6' }]}>
                  <Ionicons name="notifications" size={26} color="#3B82F6" />
              </View>
              <View style={styles.notificationTextContainer}>
                  <Text style={[styles.notificationTitle, { color: theme.text }]}>{t('tabs.insights.notificationSmart')}</Text>
                  <Text style={[styles.notificationBody, { color: theme.textSecondary }]}>{dynamicReminder}</Text>
              </View>
          </BlurView>
          
          <View style={{height: 100}} />

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 15,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  themeToggle: {
    position: 'absolute',
    right: 0,
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  halfCard: {
    width: cardWidth + 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.7,
  },
  legendContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
      gap: 6,
  },
  legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 4,
  },
  legendText: {
      fontSize: 10,
      fontWeight: '600',
  },
  keywordRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  keywordText: {
      fontSize: 13,
      fontWeight: '600',
  },
  barHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
  },
  progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      height: 20,
  },
  progressLabel: {
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'left',
      marginRight: 10,
  },
  progressBarContainer: {
      flex: 1,
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
      position: 'relative',
      justifyContent: 'center',
  },
  progressBarFill: {
      height: '100%',
      borderRadius: 5,
  },
  progressVal: {
      width: 30,
      textAlign: 'right',
      fontSize: 12,
      marginLeft: 8,
  },
  notificationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
  },
  iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
      backgroundColor: 'rgba(255,255,255,0.05)',
  },
  notificationTextContainer: {
      flex: 1,
  },
  notificationTitle: {
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 2,
  },
  notificationBody: {
      fontSize: 13,
      lineHeight: 18,
      opacity: 0.8,
  }
});
