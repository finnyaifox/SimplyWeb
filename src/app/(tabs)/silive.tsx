import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SectionList, ActivityIndicator, Dimensions, Linking, Alert, Modal, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { searchEvents, EventResult, EventSearchResponse } from '@/services/aiService';
import { getSiLiveRecommendations, trackSiLiveInteraction } from '@/services/siLiveService';
import { playClickSound } from '@/services/soundService';
import { scheduleNotification } from '@/services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

const { width: windowWidth } = Dimensions.get('window');
const contentMaxWidth = 600;

interface SectionData {
  title: string;
  data: EventResult[];
  emptyMessage: string;
}

// --- Demo Data ---
const DEMO_EVENTS: SectionData[] = [
  {
    title: "In deiner Nähe (Demo Köln)",
    data: [
      {
        title: "Digital Tech Summit Köln",
        location: "Xpost Köln",
        date: "25.01.2026",
        description: "Das größte Tech-Event der Region mit Fokus auf KI und Innovation.",
        distance: "2.5 km",
        link: "https://www.koeln.de"
      },
      {
        title: "Street Food Festival",
        location: "Heliosgelände",
        date: "Morgen",
        description: "Kulinarische Highlights aus aller Welt im Herzen von Ehrenfeld.",
        distance: "1.2 km",
        link: "https://www.koeln.de"
      }
    ],
    emptyMessage: "Keine lokalen Events gefunden."
  },
  {
    title: "In der Region (Demo NRW)",
    data: [
      {
        title: "Museumsnacht Düsseldorf",
        location: "Altstadt Düsseldorf",
        date: "30.01.2026",
        description: "Über 40 Museen öffnen ihre Türen für eine magische Nacht.",
        distance: "38 km",
        link: "https://www.duesseldorf.de"
      }
    ],
    emptyMessage: "Keine regionalen Highlights gefunden."
  }
];

export default function SiLiveScreen() {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const { city } = useSettings();
  const { user, isLoading: authLoading } = useAuth();
  
  const [query, setQuery] = useState('');
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Saved Events State
  const [savedEvents, setSavedEvents] = useState<EventResult[]>([]);

  // Load saved events on mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('@saved_events');
        if (jsonValue != null) {
          setSavedEvents(JSON.parse(jsonValue));
        }
      } catch (e) {
        console.error("Failed to load saved events", e);
      }
    };
    loadEvents();
  }, []);

  // Persist saved events on change
  useEffect(() => {
    const saveEvents = async () => {
      try {
        await AsyncStorage.setItem('@saved_events', JSON.stringify(savedEvents));
      } catch (e) {
        console.error("Failed to save events", e);
      }
    };
    saveEvents();
  }, [savedEvents]);

  // Reminder Modal State
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventResult | null>(null);
  const [reminderType, setReminderType] = useState<'push' | 'email'>('push');
  const [reminderTime, setReminderTime] = useState<'1h' | '3h' | '24h' | '2d'>('24h');

  const { eventId } = useLocalSearchParams();

  // Computed Sections including "Gemerkt"
  const allEvents = [...savedEvents, ...sections.flatMap(s => s.data)];
  const targetEvent = eventId ? allEvents.find(e => e.title === eventId) : null;

  const displaySections = eventId
    ? (targetEvent
        ? [{ title: "Event Details", data: [targetEvent], emptyMessage: "" }]
        : [{ title: "Event Details", data: [], emptyMessage: t('tabs.silive.eventNotFound') }]
      )
    : [
        ...(savedEvents.length > 0 ? [{
          title: t('tabs.silive.saved'),
          data: savedEvents,
          emptyMessage: t('tabs.silive.noSaved')
        }] : []),
        ...sections
      ];

  // Initial Load: Recommendations if user is logged in
  useEffect(() => {
    if (!authLoading) {
        if (user && city && !hasSearched) {
            checkInsightsAndLoad(true);
        } else if (!user || !city) {
            // Demo Fallback
            setSections(DEMO_EVENTS);
            setHasSearched(true);
        }
    }
  }, [user, city, authLoading, hasSearched]);

  const checkInsightsAndLoad = async (isAutoLoad = false) => {
      if (loading) return;

      if (!user) {
          if (!isAutoLoad) Alert.alert(t('tabs.silive.alerts.notLoggedInTitle'), t('tabs.silive.alerts.notLoggedInMsg'));
          return;
      }
      if (!city) {
          if (!isAutoLoad) Alert.alert(t('tabs.silive.alerts.noCityTitle'), t('tabs.silive.alerts.noCityMsg'));
          return;
      }

      if (!isAutoLoad) playClickSound();

      setLoading(true);
      setHasSearched(true);
      setSections([]); // Optional: Alte Events behalten bis neue da sind? Lieber clear für Feedback.

      try {
          // Wir versuchen es immer, auch mit wenigen Insights.
          // Der Service kümmert sich um Fallbacks (z.B. "Events in Berlin" allgemein).
          trackSiLiveInteraction(user.id, isAutoLoad ? 'auto_load' : 'open_tab', undefined, city);
          
          // Force Refresh nur bei manuellem Laden (!isAutoLoad)
          const recs: EventSearchResponse = await getSiLiveRecommendations(user.id, city, !isAutoLoad);
          
          const newSections = [
            { title: "In deiner Nähe (bis 50km)", data: recs.zone50, emptyMessage: "Keine lokalen Events gefunden." },
            { title: "In der Region (bis 200km)", data: recs.zone200, emptyMessage: "Keine regionalen Highlights gefunden." }
          ];

          setSections(newSections);
          
          const totalEvents = recs.zone50.length + recs.zone200.length;
          if (totalEvents === 0 && !isAutoLoad) {
              Alert.alert("Keine Treffer", "Wir konnten aktuell keine passenden Events finden.");
          }

      } catch (e) {
          console.error('Failed to load SiLive recommendations', e);
          if (!isAutoLoad) Alert.alert("Fehler", "Konnte keine Empfehlungen laden.");
      } finally {
          setLoading(false);
      }
  };

  const handleSearch = async () => {
    if (!query.trim() || loading) return;
    
    playClickSound();
    setLoading(true);
    setHasSearched(true);
    setSections([]);

    try {
      // Manuelle Suche überschreibt temporär die Empfehlungen
      // Erstelle ein temporäres userProfile Objekt für die Suche
      const tempProfile = {
        interests: [],
        keywords: [query.trim()]
      };
      
      const results: EventSearchResponse = await searchEvents(tempProfile, city);
      
      const newSections = [
        { title: "In deiner Nähe (bis 50km)", data: results.zone50, emptyMessage: "Keine lokalen Events gefunden." },
        { title: "In der Region (bis 200km)", data: results.zone200, emptyMessage: "Keine regionalen Highlights gefunden." }
      ];

      setSections(newSections);
      
      if (user) trackSiLiveInteraction(user.id, 'manual_refresh', 'search', city);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = async (url?: string) => {
    if (!url) return;
    playClickSound();
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error("Konnte Link nicht öffnen", e);
      Linking.openURL(url);
    }
  };

  const handleShare = async (event: EventResult) => {
    playClickSound();
    try {
        const downloadLink = 'https://simplyai.app/download';
        const message = `${event.title}\n📅 ${event.date}\n📍 ${event.location}\n\n${event.description}\n\nEntdeckt mit SimplyWeb: ${downloadLink}`;
        
        await Share.share({
            message: message,
            url: downloadLink,
            title: event.title
        });
    } catch (error) {
        console.error("Error sharing", error);
    }
  };

  const openReminderModal = (event: EventResult) => {
    playClickSound();
    setSelectedEvent(event);
    setReminderModalVisible(true);
  };

  const saveReminder = async () => {
    playClickSound();
    
    if (selectedEvent) {
        const seconds = reminderTime === '1h' ? 3600 : reminderTime === '3h' ? 10800 : reminderTime === '24h' ? 86400 : 172800;
        await scheduleNotification(selectedEvent.title, `Erinnerung: ${selectedEvent.title}`, seconds);
    }

    // Wenn noch nicht gemerkt, füge es zu gemerkten Events hinzu
    if (selectedEvent && !savedEvents.find(e => e.title === selectedEvent.title)) {
        setSavedEvents(prev => [...prev, selectedEvent]);
    }

    Alert.alert("Erinnerung gesetzt", `Wir erinnern dich ${reminderTime === '1h' ? '1 Stunde' : reminderTime === '3h' ? '3 Stunden' : reminderTime === '24h' ? '24 Stunden' : '2 Tage'} vorher via ${reminderType === 'push' ? 'Push-Nachricht' : 'E-Mail'}.`);
    setReminderModalVisible(false);
  };

  const toggleSaveEvent = (event: EventResult) => {
    playClickSound();
    setSavedEvents(prev => {
        const isSaved = prev.find(e => e.title === event.title);
        if (isSaved) {
            return prev.filter(e => e.title !== event.title);
        } else {
            return [...prev, event];
        }
    });
  };

  if (authLoading) {
    return (
        <View style={styles.container}>
          <LinearGradient
            colors={isDark ? ['#022c22', '#064e3b', '#021814'] : [Colors.light.background, '#EFEEEA', '#E5E3DE']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={[styles.centerContent, { flex: 1 }]}>
               <ActivityIndicator size="large" color={isDark ? '#34d399' : '#059669'} />
            </View>
          </SafeAreaView>
        </View>
    );
  }

  const renderEventItem = ({ item }: { item: EventResult }) => {
    // Fallback falls kein Link von AI: Google Search URL
    const linkToOpen = item.link || `https://www.google.com/search?q=${encodeURIComponent(item.title + ' ' + item.location)}`;
    const isSaved = savedEvents.find(e => e.title === item.title);

    return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(16, 185, 129, 0.15)'
        }
      ]}
    >
      <View style={styles.cardContentWrapper}>
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleOpenLink(linkToOpen)}
            style={styles.cardMainContent}
        >
            <View style={styles.cardHeader}>
            <View style={[styles.dateBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5' }]}>
                <Ionicons name="calendar-outline" size={12} color={isDark ? '#34d399' : '#059669'} />
                <Text style={[styles.dateText, { color: isDark ? '#34d399' : '#059669' }]}>{item.date}</Text>
            </View>
            {item.distance && (
                <View style={[styles.distanceBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb' }]}>
                    <Ionicons name="navigate-outline" size={10} color={isDark ? '#fbbf24' : '#d97706'} />
                    <Text style={[styles.dateText, { color: isDark ? '#fbbf24' : '#d97706', fontSize: 10 }]}>{item.distance}</Text>
                </View>
            )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name="location-sharp" size={12} color={isDark ? '#60a5fa' : '#2563eb'} style={{ marginRight: 4 }} />
            <Text style={[styles.locationText, { color: isDark ? '#60a5fa' : '#2563eb' }]} numberOfLines={1}>
                {item.location}
            </Text>
            </View>
            
            <Text style={[styles.eventTitle, { color: isDark ? '#fff' : '#064e3b' }]} numberOfLines={1}>
            {item.title}
            </Text>
            
            <Text style={[styles.eventDescription, { color: isDark ? 'rgba(255,255,255,0.6)' : '#4b5563' }]} numberOfLines={2}>
            {item.description}
            </Text>
        </TouchableOpacity>

        <View style={[styles.sideActions, { borderLeftColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <TouchableOpacity 
                style={[styles.sideActionButton, { backgroundColor: isSaved ? (isDark ? 'rgba(52, 211, 153, 0.2)' : '#ecfdf5') : 'transparent' }]}
                onPress={() => openReminderModal(item)}
            >
                <Ionicons 
                    name={isSaved ? "notifications" : "notifications-outline"} 
                    size={22} 
                    color={isSaved ? '#10b981' : (isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af')} 
                />
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.sideActionButton}
                onPress={() => handleShare(item)}
            >
                <Ionicons name="share-social-outline" size={22} color={isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af'} />
            </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.cardActionRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: isDark ? '#10B981' : '#059669' }]}
            onPress={() => handleOpenLink(linkToOpen)}
          >
              <Text style={styles.actionButtonTextPrimary}>Details & Tickets</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
      </View>
    </View>
    );
  };

  const renderSectionHeader = ({ section: { title, data, emptyMessage } }: { section: SectionData }) => {
     // Zeige Header immer, außer wenn keine Daten UND wir nicht gesucht haben (initialer State)
     if (!hasSearched) return <View />;

     return (
        <View style={[styles.sectionHeader, { backgroundColor: 'transparent' }]}>
            <Text style={[styles.sectionHeaderText, { color: isDark ? '#fff' : '#064e3b' }]}>
                {title}
            </Text>
            {data.length === 0 && (
                <Text style={[styles.emptySectionText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>
                    {emptyMessage}
                </Text>
            )}
        </View>
     );
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={isDark ? ['#022c22', '#064e3b', '#021814'] : [Colors.light.background, '#EFEEEA', '#E5E3DE']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <SectionList
            sections={displaySections}
            keyExtractor={(item, index) => item.title + index}
            renderItem={renderEventItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false} 
            ListHeaderComponent={
                <View style={styles.headerWrapper}>
                    {eventId ? (
                        <View style={{ paddingTop: 20, paddingBottom: 10 }}>
                            <TouchableOpacity
                                onPress={() => router.setParams({ eventId: undefined })}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}
                            >
                                <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#064e3b'} />
                                <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: '700', color: isDark ? '#fff' : '#064e3b' }}>
                                    Zurück zur Übersicht
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                    <>
                    <View style={styles.headerContainer}>
                        <TouchableOpacity
                            onPress={() => {
                                playClickSound();
                                toggleTheme();
                            }}
                            style={[styles.headerThemeToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={isDark ? "moon" : "sunny"} size={22} color={isDark ? "#fff" : Colors.light.text} />
                        </TouchableOpacity>

                        <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#064e3b' }]}>SiLive</Text>
                        <Text style={[styles.headerSubtitle, { color: isDark ? 'rgba(255,255,255,0.6)' : '#059669' }]}>
                            {city ? `Events in und um ${city}` : 'Entdecke Events in deiner Nähe'}
                        </Text>
                    </View>

                    {!user && (
                        <TouchableOpacity
                            style={[styles.warningContainer, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#dbeafe' }]}
                            onPress={() => router.push('/(tabs)/settings')}
                        >
                            <Ionicons name="log-in-outline" size={18} color={isDark ? '#60a5fa' : '#2563eb'} />
                            <Text style={[styles.warningText, { color: isDark ? '#60a5fa' : '#2563eb' }]}>
                                Bitte einloggen für personalisierte Empfehlungen basierend auf deinen Chats.
                            </Text>
                        </TouchableOpacity>
                    )}

                    {user && !city && (
                        <TouchableOpacity
                            style={[styles.warningContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fee2e2' }]}
                            onPress={() => router.push('/(tabs)/settings')}
                        >
                            <Ionicons name="alert-circle-outline" size={18} color={isDark ? '#f87171' : '#dc2626'} />
                            <Text style={[styles.warningText, { color: isDark ? '#f87171' : '#dc2626' }]}>
                                Bitte Stadt in den Einstellungen hinterlegen für lokale Events.
                            </Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.searchContainer}>
                        <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[
                            styles.inputWrapper,
                            {
                                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.05)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.15)'
                            }
                        ]}>
                            <Ionicons name="search" size={18} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(6, 78, 59, 0.4)"} style={{ marginLeft: 12 }} />
                            <TextInput
                                style={[styles.searchInput, { color: isDark ? '#fff' : '#064e3b' }]}
                                placeholder={t('tabs.silive.searchPlaceholder')}
                                placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "rgba(6, 78, 59, 0.4)"}
                                value={query}
                                onChangeText={setQuery}
                                onSubmitEditing={handleSearch}
                                returnKeyType="search"
                            />
                            {query.length > 0 && (
                                <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 8 }}>
                                    <Ionicons name="close-circle" size={16} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(6, 78, 59, 0.4)"} />
                                </TouchableOpacity>
                            )}
                        </BlurView>
                        
                        <TouchableOpacity
                            onPress={handleSearch}
                            style={[styles.searchButton, { backgroundColor: isDark ? '#10B981' : '#059669' }]}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <TouchableOpacity
                            onPress={() => checkInsightsAndLoad(false)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(16, 185, 129, 0.08)',
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.2)'
                            }}
                        >
                            <Ionicons name="refresh" size={14} color={isDark ? '#34d399' : '#059669'} style={{ marginRight: 6 }} />
                            <Text style={{ color: isDark ? '#34d399' : '#059669', fontSize: 12, fontWeight: '600' }}>
                                {t('tabs.silive.refreshBtn')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    </>
                    )}
                </View>
            }
            ListFooterComponent={loading ? (
                <View style={[styles.centerContent, { marginTop: 20, marginBottom: 40 }]}>
                    <ActivityIndicator size="small" color={isDark ? '#34d399' : '#059669'} />
                    <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(6, 78, 59, 0.5)' }]}>{t('tabs.silive.loading')}</Text>
                </View>
            ) : <View style={{ height: 100 }} />}
            ListEmptyComponent={!loading ? (
                <View style={styles.centerContent}>
                        {hasSearched ? (
                        <Text style={[styles.emptyText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(6, 78, 59, 0.4)' }]}>
                            {t('tabs.silive.noResults')}
                        </Text>
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="sparkles-outline" size={40} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(6, 78, 59, 0.15)'} />
                            <Text style={[styles.emptyText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(6, 78, 59, 0.4)' }]}>
                                {t('tabs.silive.searchPrompt')}
                            </Text>
                        </View>
                    )}
                </View>
            ) : null}
        />
      </SafeAreaView>

      {/* Reminder Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={reminderModalVisible}
        onRequestClose={() => setReminderModalVisible(false)}
      >
        <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setReminderModalVisible(false)}
        >
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            
            <TouchableOpacity 
                activeOpacity={1} 
                onPress={() => {}} // Verhindert Schließen beim Klick auf Content
                style={[
                    styles.modalContent,
                    { 
                        backgroundColor: isDark ? '#064e3b' : '#fff',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.1)'
                    }
                ]}
            >
                <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderIcon}>
                        <Ionicons name="notifications" size={24} color={isDark ? '#34d399' : '#059669'} />
                    </View>
                    <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#064e3b' }]}>{t('tabs.silive.reminder.title')}</Text>
                    <TouchableOpacity onPress={() => setReminderModalVisible(false)} style={styles.modalCloseBtn}>
                        <Ionicons name="close" size={24} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'} />
                    </TouchableOpacity>
                </View>

                {selectedEvent && (
                    <View style={styles.modalEventInfo}>
                        <Text style={[styles.modalEventTitle, { color: isDark ? '#fff' : '#064e3b' }]}>{selectedEvent.title}</Text>
                        <View style={styles.modalEventMeta}>
                            <Ionicons name="calendar-outline" size={14} color={isDark ? '#34d399' : '#059669'} />
                            <Text style={[styles.modalEventMetaText, { color: isDark ? '#34d399' : '#059669' }]}>{selectedEvent.date}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280' }]}>{t('tabs.silive.reminder.type')}</Text>
                    <View style={styles.optionRow}>
                        <TouchableOpacity 
                            onPress={() => { playClickSound(); setReminderType('push'); }}
                            style={[
                                styles.optionBtn, 
                                reminderType === 'push' && [styles.optionBtnActive, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.2)' : '#ecfdf5', borderColor: '#10b981' }]
                            ]}
                        >
                            <Ionicons name="phone-portrait-outline" size={18} color={reminderType === 'push' ? '#10b981' : isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af'} />
                            <Text style={[styles.optionBtnText, { color: reminderType === 'push' ? (isDark ? '#34d399' : '#059669') : (isDark ? 'rgba(255,255,255,0.4)' : '#6b7280') }]}>{t('tabs.silive.reminder.push')}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            onPress={() => { playClickSound(); setReminderType('email'); }}
                            style={[
                                styles.optionBtn, 
                                reminderType === 'email' && [styles.optionBtnActive, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.2)' : '#ecfdf5', borderColor: '#10b981' }]
                            ]}
                        >
                            <Ionicons name="mail-outline" size={18} color={reminderType === 'email' ? '#10b981' : isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af'} />
                            <Text style={[styles.optionBtnText, { color: reminderType === 'email' ? (isDark ? '#34d399' : '#059669') : (isDark ? 'rgba(255,255,255,0.4)' : '#6b7280') }]}>{t('tabs.silive.reminder.email')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280' }]}>{t('tabs.silive.reminder.time')}</Text>
                    <View style={styles.optionGrid}>
                        {(['1h', '3h', '24h', '2d'] as const).map((time) => (
                            <TouchableOpacity 
                                key={time}
                                onPress={() => { playClickSound(); setReminderTime(time); }}
                                style={[
                                    styles.gridOptionBtn, 
                                    reminderTime === time && [styles.optionBtnActive, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.2)' : '#ecfdf5', borderColor: '#10b981' }]
                                ]}
                            >
                                <Text style={[styles.optionBtnText, { color: reminderTime === time ? (isDark ? '#34d399' : '#059669') : (isDark ? 'rgba(255,255,255,0.4)' : '#6b7280') }]}>
                                    {time === '1h' ? t('tabs.silive.reminder.t1h') : time === '3h' ? t('tabs.silive.reminder.t3h') : time === '24h' ? t('tabs.silive.reminder.t24h') : t('tabs.silive.reminder.t2d')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity 
                    onPress={saveReminder}
                    style={[styles.saveBtn, { backgroundColor: isDark ? '#10B981' : '#059669' }]}
                    activeOpacity={0.8}
                >
                    <Text style={styles.saveBtnText}>{t('tabs.silive.reminder.save')}</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  headerWrapper: {
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
  },
  headerContainer: {
    paddingTop: 10,
    paddingBottom: 15,
    alignItems: 'center',
    position: 'relative',
  },
  headerThemeToggle: {
    position: 'absolute',
    right: 0,
    top: 5,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 8,
    fontSize: 15,
    fontWeight: '500',
  },
  searchButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    maxWidth: contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center'
  },
  sectionHeader: {
      paddingVertical: 8,
      marginBottom: 8,
      marginTop: 15,
  },
  sectionHeaderText: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      opacity: 0.8,
  },
  emptySectionText: {
      fontSize: 13,
      fontStyle: 'italic',
      marginTop: 4,
  },
  card: {
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardMainContent: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
  },
  warningContainer: {
      marginBottom: 12,
      padding: 10,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
  },
  warningText: {
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
      lineHeight: 18,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
    lineHeight: 22,
  },
  eventDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardContentWrapper: {
    flexDirection: 'row',
  },
  sideActions: {
    padding: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    gap: 15,
  },
  sideActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActionRow: {
    padding: 8,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalEventInfo: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
  },
  modalEventTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalEventMetaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridOptionBtn: {
    width: '48%', // Ungefähr halbe Breite minus Gap
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionBtnActive: {
    borderWidth: 1.5,
  },
  optionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

