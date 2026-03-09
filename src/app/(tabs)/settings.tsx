import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Platform
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { playClickSound } from '@/services/soundService';
import { deleteAllInsights } from '@/services/databaseService';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import {
  User,
  Clock,
  BarChart2,
  Bell,
  Shield,
  Star,
  LogOut,
  ChevronRight,
  Save,
  Trash2,
  Info,
  X,
  CreditCard,
  Settings as SettingsIcon,
  Crown,
  Zap,
  TrendingUp,
  Lock,
  MessageSquare,
  Key,
  BadgeCheck
} from 'lucide-react-native';

const EditableCityInput = ({ initialValue, onSave }: { initialValue: string, onSave: (value: string) => void }) => {
  const { isDark } = useTheme();
  const currentTheme = isDark ? Colors.dark : Colors.light;
  const [text, setText] = useState(initialValue);

  useEffect(() => {
    setText(initialValue);
  }, [initialValue]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
            style={[styles.input, { 
                flex: 1,
                color: currentTheme.text, 
                backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', 
                borderColor: currentTheme.border 
            }]}
            value={text}
            onChangeText={setText}
            placeholderTextColor={currentTheme.textSecondary}
        />
        <TouchableOpacity 
            onPress={() => onSave(text)}
            style={{
                backgroundColor: Colors.primary,
                width: 44,
                height: 44,
                borderRadius: 12,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: Colors.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 10,
                elevation: 8,
            }}
        >
            <Ionicons name="checkmark" size={24} color="#fff" />
        </TouchableOpacity>
    </View>
  );
};

export default function SettingsScreen() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { ephemeralTime, setEphemeralTime, city, setCity, autoPlayAudioResponse, setAutoPlayAudioResponse } = useSettings();
  const { user, signInWithGoogle, signOut, isLoading } = useAuth();
  const currentTheme = isDark ? Colors.dark : Colors.light;

  // --- State: Profil ---
  const [username, setUsername] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || 'Gast');
  const [email, setEmail] = useState(user?.email || '');
  const [country, setCountry] = useState('Deutschland');

  // Update local state when user context changes
  useEffect(() => {
    console.log('👤 Settings Screen - User Update:', user?.email);
    if (user) {
      setUsername(user.user_metadata?.full_name || user.user_metadata?.name || 'Gast');
      setEmail(user.email || '');
      // Falls wir Land/Stadt in Metadata speichern würden:
      if (user.user_metadata?.country) setCountry(user.user_metadata.country);
      if (user.user_metadata?.city) {
        setCity(user.user_metadata.city);
      }
    } else {
      setUsername('Gast');
      setEmail('');
    }
  }, [user]);

  // --- State: Insights ---
  const [analyticsDashboard, setAnalyticsDashboard] = useState(true);
  const [autoCategorization, setAutoCategorization] = useState(true);
  const [keywordTracking, setKeywordTracking] = useState(true);
  const [sentimentAnalysis, setSentimentAnalysis] = useState(true);
  const [insightNotifications, setInsightNotifications] = useState(true);
  const [deleteInsightsDays, setDeleteInsightsDays] = useState(30);
  const [autoDeleteInsights, setAutoDeleteInsights] = useState(false);

  // --- State: Benachrichtigungen ---
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [aiReminders, setAiReminders] = useState(true);

  // --- State: Modals ---
  const [showDataModal, setShowDataModal] = useState(false);

  // --- Helper Functions ---
  const handleSaveProfile = () => {
    playClickSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('Profil gespeichert:', { username, email, country, city });
    Alert.alert('Funktion noch nicht verfügbar', 'Das Speichern des Profils ist in dieser Version noch nicht implementiert.');
  };

  const handleLogin = async () => {
    playClickSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signInWithGoogle();
  };

  const handleLogout = async () => {
    console.log('🔴 Settings Screen: Logout pressed');
    playClickSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await signOut();
  };

  const handleDownloadInsights = () => {
    playClickSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Download Insights gedrückt');
    Alert.alert('Funktion noch nicht verfügbar', 'Der Download von Insights ist noch nicht verfügbar.');
  };

  const handleSaveCity = (newCity: string) => {
    playClickSound();
    setCity(newCity, user);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Gespeichert', `Deine Stadt wurde auf "${newCity}" aktualisiert.`);
  };

  const handleDeleteAllInsights = () => {
    playClickSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    if (!user) {
        Alert.alert('Fehler', 'Du musst eingeloggt sein, um Daten zu löschen.');
        return;
    }

    Alert.alert(
      'Insights wirklich löschen?',
      'Dies wird unwiderruflich alle gesammelten Analytics-Daten, Keywords und Interessen löschen, die mit deinem Account verknüpft sind.',
      [
        {
          text: 'Abbrechen',
          style: 'cancel',
          onPress: () => console.log('Delete cancelled')
        },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            console.log('Delete confirmed');
            const success = await deleteAllInsights(user.id);
            if (success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Erfolg', 'Alle Insights-Daten wurden gelöscht. Dein Dashboard ist nun leer.');
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Fehler', 'Es gab ein Problem beim Löschen der Daten. Bitte versuche es später erneut.');
            }
          }
        }
      ]
    );
  };

  // --- Debugging Funktionen ---
  const handleCheckUserStatus = async () => {
    playClickSound();
    console.log('🔵 [DEBUG] Checking User Status...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log('✅ [DEBUG] User found:', user.id);
      Alert.alert(
        'User Status: OK ✅',
        `User ID: ${user.id}\nEmail: ${user.email}\nLast Sign In: ${new Date(user.last_sign_in_at || '').toLocaleString()}`
      );
    } else {
      console.error('❌ [DEBUG] No User found!');
      Alert.alert('User Status: Error ❌', 'Kein Benutzer eingeloggt (user ist null).');
    }
  };

  const handleTestConnection = async () => {
    playClickSound();
    console.log('🔵 [DEBUG] Testing Supabase Connection...');
    
    try {
      // Versuch, die Version oder einfach einen Health Check zu machen (z.B. user session check)
      const { data, error } = await supabase.from('chat_analytics').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('❌ [DEBUG] Connection Test Failed:', error);
        Alert.alert('Verbindung: Fehler ❌', `Supabase Error:\n${error.message}\nCode: ${error.code}`);
      } else {
        console.log('✅ [DEBUG] Connection Test Success. Row count:', data);
        Alert.alert('Verbindung: OK ✅', 'Verbindung zu Supabase hergestellt und Tabelle "chat_analytics" erreichbar.');
      }
    } catch (e: any) {
      console.error('❌ [DEBUG] Unexpected Error:', e);
      Alert.alert('Verbindung: Crash ❌', `Unerwarteter Fehler:\n${e.message}`);
    }
  };

  const handleTestInsert = async () => {
    playClickSound();
    console.log('🔵 [DEBUG] Testing Supabase Insert...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Insert Test: Abgebrochen ❌', 'Bitte erst einloggen!');
      return;
    }

    try {
      const testData = {
        user_id: user.id,
        session_id: '00000000-0000-0000-0000-000000000000', // Valid UUID for test
        sentiment_positive_count: 0,
        sentiment_negative_count: 0,
        sentiment_neutral_count: 0,
        total_messages_count: 1,
        avg_message_length: 5,
        session_duration_seconds: 1
      };

      console.log('🔵 [DEBUG] Inserting test data:', testData);

      const { error } = await supabase
        .from('chat_analytics')
        .insert([testData]);

      if (error) {
        console.error('❌ [DEBUG] Insert Failed:', error);
        Alert.alert(
          'Insert Test: Fehlgeschlagen ❌',
          `Mögliche Ursache: RLS Policy blockiert Schreibzugriff.\n\nError: ${error.message}\nHint: ${error.hint || 'Kein Hint'}`
        );
      } else {
        console.log('✅ [DEBUG] Insert Success');
        Alert.alert('Insert Test: Erfolgreich ✅', 'Test-Datensatz wurde erfolgreich in "chat_analytics" eingefügt.');
      }
    } catch (e: any) {
      console.error('❌ [DEBUG] Insert Crash:', e);
      Alert.alert('Insert Test: Crash ❌', `Fehler: ${e.message}`);
    }
  };

  // --- Components ---

  const SectionTitle = ({ title, icon: Icon, rightIcon: RightIcon, iconColor }: { title: string; icon: any, rightIcon?: any, iconColor?: string }) => (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }]}>
          <Icon size={18} color={iconColor || Colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : currentTheme.text }]}>{title}</Text>
      </View>
      {RightIcon && (
        <View style={{ opacity: 0.5 }}>
          <RightIcon size={14} color={currentTheme.textSecondary} />
        </View>
      )}
    </View>
  );

  const SettingContainer = ({ children }: { children: React.ReactNode }) => (
    <BlurView 
      intensity={isDark ? 30 : 50} 
      tint={isDark ? 'dark' : 'light'} 
      style={[styles.card, { borderColor: isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}
    >
      {children}
    </BlurView>
  );

  const InputField = ({ label, value, onChangeText }: { label: string; value: string; onChangeText: (t: string) => void }) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: currentTheme.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: currentTheme.text, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderColor: currentTheme.border }]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={currentTheme.textSecondary}
      />
    </View>
  );

  const ToggleRow = ({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) => (
    <View style={styles.row}>
      <Text style={[styles.rowText, { color: currentTheme.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={(val) => {
            playClickSound();
            Haptics.selectionAsync();
            onValueChange(val);
        }}
        trackColor={{ false: '#767577', true: Colors.primary }}
        thumbColor={Platform.OS === 'ios' ? '#fff' : value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );

  const RadioOption = ({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) => (
    <TouchableOpacity
      onPress={() => {
        playClickSound();
        Haptics.selectionAsync();
        onSelect();
      }}
      style={styles.radioRow}
    >
      <Text style={[styles.rowText, { color: currentTheme.text }]}>{label}</Text>
      <View style={[styles.radioCircle, { borderColor: selected ? Colors.primary : currentTheme.textSecondary }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: Colors.primary }]} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={isDark ? ['#022c22', '#043d30', '#01120f'] : [Colors.light.background, '#F0F2ED', '#E5E9E0']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>EINSTELLUNGEN</Text>
          <TouchableOpacity
            onPress={() => {
              playClickSound();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleTheme();
            }}
            style={styles.themeToggle}
          >
             <Ionicons name={isDark ? "moon" : "sunny"} size={24} color={currentTheme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* 1. Premium (NEU: Ganz oben) */}
          <SectionTitle title="Premium" icon={Star} rightIcon={Crown} iconColor="#eab308" />
          <SettingContainer>
            <LinearGradient
                colors={isDark ? ['#064e3b', '#065f46', '#d4af37'] : ['#10B981', '#34D399', '#D4AF37']}
                locations={[0, 0.6, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumCard}
            >
                <View style={styles.premiumContent}>
                    <View>
                        <Text style={styles.premiumTitle}>Upgrade auf Premium</Text>
                        <Text style={styles.premiumPrice}>Nur 2,99€ / Monat</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.premiumButton}
                      onPress={() => {
                        playClickSound();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        console.log('Upgrade Button gedrückt');
                        Alert.alert('Funktion noch nicht verfügbar', 'Premium-Funktionen kommen bald!');
                      }}
                    >
                        <Text style={styles.premiumButtonText}>Upgrade</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
            
            <View style={styles.row}>
                <Text style={[styles.rowText, { color: currentTheme.textSecondary }]}>Status:</Text>
                <Text style={[styles.rowText, { color: currentTheme.text, fontWeight: 'bold' }]}>Premium: Inaktiv</Text>
            </View>
             <View style={[styles.divider, { backgroundColor: currentTheme.border }]} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                playClickSound();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                console.log('Abo verwalten gedrückt');
                Alert.alert('Funktion noch nicht verfügbar', 'Abo-Verwaltung kommt bald!');
              }}
            >
                <Text style={[styles.actionText, { color: currentTheme.text }]}>Abo verwalten</Text>
                <CreditCard size={20} color={currentTheme.textSecondary} />
            </TouchableOpacity>
          </SettingContainer>

          {/* 2. Profil */}
          <SectionTitle title="Profil" icon={User} rightIcon={BadgeCheck} iconColor="#06b6d4" />
          <SettingContainer>
            {user ? (
                <>
                    {/* Read-Only Google Data */}
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}>
                         {user.user_metadata?.avatar_url && (
                             <View style={{width: 50, height: 50, borderRadius: 25, overflow: 'hidden', marginRight: 15, borderWidth: 1, borderColor: currentTheme.border}}>
                                 {/* Image would go here, using a View placeholder for now as Image requires import */}
                                 {/* <Image source={{uri: user.user_metadata.avatar_url}} style={{width: '100%', height: '100%'}} /> */}
                                 <View style={{flex: 1, backgroundColor: '#ccc'}} />
                             </View>
                         )}
                         <View>
                             <Text style={{color: currentTheme.text, fontSize: 16, fontWeight: '600'}}>{user.user_metadata?.full_name || 'User'}</Text>
                             <Text style={{color: currentTheme.textSecondary, fontSize: 12}}>{user.email}</Text>
                         </View>
                    </View>
                    
                    <View style={[styles.divider, { backgroundColor: currentTheme.border, marginBottom: 15 }]} />

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: currentTheme.textSecondary }]}>Land</Text>
                            <View style={[styles.input, { 
                                justifyContent: 'center', 
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', 
                                borderColor: currentTheme.border 
                            }]}>
                                <Text style={{ color: currentTheme.textSecondary }}>Deutschland</Text>
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { color: currentTheme.textSecondary }]}>Stadt (für SiLive Events)</Text>
                            <EditableCityInput initialValue={city} onSave={handleSaveCity} />
                        </View>
                    </View>
                </>
            ) : (
                <View style={{ alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: currentTheme.textSecondary, marginBottom: 15, textAlign: 'center' }}>
                        Melde dich an, um dein Profil zu bearbeiten und Einstellungen zu speichern.
                    </Text>
                    <TouchableOpacity style={[styles.button, { backgroundColor: Colors.primary, width: '100%' }]} onPress={handleLogin}>
                        <Text style={styles.buttonText}>Jetzt Anmelden</Text>
                    </TouchableOpacity>
                </View>
            )}
          </SettingContainer>

          {/* 2. Ephemeral Chat */}
          <SectionTitle title="Ephemeral Chat" icon={Clock} rightIcon={Zap} iconColor="#f59e0b" />
          <SettingContainer>
             <Text style={[styles.helperText, { color: currentTheme.textSecondary }]}>Nachrichten automatisch löschen nach:</Text>
             <RadioOption label="1 Minute" selected={ephemeralTime === 1} onSelect={() => setEphemeralTime(1)} />
             <RadioOption label="3 Minuten (Standard)" selected={ephemeralTime === 3} onSelect={() => setEphemeralTime(3)} />
             <RadioOption label="5 Minuten" selected={ephemeralTime === 5} onSelect={() => setEphemeralTime(5)} />
             <View style={[styles.divider, { backgroundColor: currentTheme.border, marginVertical: 10 }]} />
             <ToggleRow label="Auto-Play Audio Antwort" value={autoPlayAudioResponse} onValueChange={setAutoPlayAudioResponse} />
          </SettingContainer>

          {/* 3. Insights */}
          <SectionTitle title="Insights" icon={BarChart2} rightIcon={TrendingUp} iconColor="#a855f7" />
          <SettingContainer>
            <ToggleRow label="Analytics Dashboard" value={analyticsDashboard} onValueChange={setAnalyticsDashboard} />
            <ToggleRow label="Auto-Kategorisierung" value={autoCategorization} onValueChange={setAutoCategorization} />
            <ToggleRow label="Keyword Tracking" value={keywordTracking} onValueChange={setKeywordTracking} />
            <ToggleRow label="Sentiment Analyse" value={sentimentAnalysis} onValueChange={setSentimentAnalysis} />
            <ToggleRow label="Insights Mitteilungen" value={insightNotifications} onValueChange={setInsightNotifications} />
            <ToggleRow label="Automatisch löschen" value={autoDeleteInsights} onValueChange={setAutoDeleteInsights} />
            
            <View style={[styles.sliderContainer, { opacity: autoDeleteInsights ? 1 : 0.5 }]} pointerEvents={autoDeleteInsights ? 'auto' : 'none'}>
                <Text style={[styles.rowText, { color: currentTheme.text }]}>
                    Insights löschen nach: <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>{deleteInsightsDays} Tage</Text>
                </Text>
                <Slider
                    style={{ width: '100%', height: 40 }}
                    minimumValue={7}
                    maximumValue={90}
                    step={1}
                    value={deleteInsightsDays}
                    onValueChange={(val) => {
                         let newValue = 30;
                         if (val < 18) newValue = 7;
                         else if (val < 60) newValue = 30;
                         else newValue = 90;

                         if (newValue !== deleteInsightsDays) {
                             playClickSound();
                             Haptics.selectionAsync();
                             setDeleteInsightsDays(newValue);
                         }
                    }}
                    minimumTrackTintColor={Colors.primary}
                    maximumTrackTintColor={currentTheme.textSecondary}
                    thumbTintColor={Colors.primary}
                />
                <View style={styles.sliderLabels}>
                    <Text style={[styles.sliderLabel, { color: currentTheme.textSecondary }]}>7</Text>
                    <Text style={[styles.sliderLabel, { color: currentTheme.textSecondary }]}>30</Text>
                    <Text style={[styles.sliderLabel, { color: currentTheme.textSecondary }]}>90</Text>
                </View>
            </View>
          </SettingContainer>

          {/* 4. Benachrichtigungen */}
          <SectionTitle title="Benachrichtigungen" icon={Bell} rightIcon={MessageSquare} iconColor="#ec4899" />
          <SettingContainer>
            <ToggleRow label="Wöchentliche Zusammenfassung" value={weeklySummary} onValueChange={setWeeklySummary} />
            <ToggleRow label="KI Erinnerungen" value={aiReminders} onValueChange={setAiReminders} />
          </SettingContainer>

          {/* 5. Daten & Sicherheit */}
          <SectionTitle title="Daten & Sicherheit" icon={Shield} rightIcon={Lock} iconColor="#22c55e" />
          <SettingContainer>
            <TouchableOpacity style={styles.actionRow} onPress={handleDownloadInsights}>
                <Text style={[styles.actionText, { color: currentTheme.text }]}>Insights herunterladen</Text>
                <ChevronRight size={20} color={currentTheme.textSecondary} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: currentTheme.border }]} />
            
            <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAllInsights}>
                <Text style={[styles.actionText, { color: Colors.error }]}>Insights komplett löschen</Text>
                <Trash2 size={20} color={Colors.error} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: currentTheme.border }]} />

            <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                    playClickSound();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowDataModal(true);
                }}
            >
                <Text style={[styles.actionText, { color: currentTheme.text }]}>Was speichern wir?</Text>
                <Info size={20} color={currentTheme.textSecondary} />
            </TouchableOpacity>
             <View style={[styles.divider, { backgroundColor: currentTheme.border }]} />
             
            <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                    playClickSound();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert('Funktion noch nicht verfügbar', 'Datenschutzerklärung kommt bald.');
                }}
            >
                <Text style={[styles.actionText, { color: currentTheme.text }]}>Datenschutz</Text>
                <ChevronRight size={20} color={currentTheme.textSecondary} />
            </TouchableOpacity>
          </SettingContainer>

          {/* 6. Premium (Entfernt - jetzt oben) */}

          {/* Debugging Section */}
          <SectionTitle title="System Check & Debugging" icon={Zap} rightIcon={Info} iconColor="#F59E0B" />
          <SettingContainer>
            <TouchableOpacity style={styles.actionRow} onPress={handleCheckUserStatus}>
              <Text style={[styles.actionText, { color: currentTheme.text }]}>Check User Status</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Text style={{ marginRight: 5, color: currentTheme.textSecondary }}>🔍</Text>
                 <ChevronRight size={20} color={currentTheme.textSecondary} />
              </View>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: currentTheme.border }]} />

            <TouchableOpacity style={styles.actionRow} onPress={handleTestConnection}>
              <Text style={[styles.actionText, { color: currentTheme.text }]}>Test Supabase Connection</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Text style={{ marginRight: 5, color: currentTheme.textSecondary }}>📡</Text>
                 <ChevronRight size={20} color={currentTheme.textSecondary} />
              </View>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: currentTheme.border }]} />

            <TouchableOpacity style={styles.actionRow} onPress={handleTestInsert}>
               <Text style={[styles.actionText, { color: currentTheme.text }]}>Test DB Insert (Analytics)</Text>
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Text style={{ marginRight: 5, color: currentTheme.textSecondary }}>💾</Text>
                 <ChevronRight size={20} color={currentTheme.textSecondary} />
              </View>
            </TouchableOpacity>
          </SettingContainer>

          {/* 7. Konto */}
          <SectionTitle title="Konto" icon={LogOut} rightIcon={Key} iconColor="#6b7280" />
          <SettingContainer>
            {user ? (
             <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
                <Text style={[styles.actionText, { color: currentTheme.text }]}>Abmelden ({user.email})</Text>
                <LogOut size={20} color={currentTheme.textSecondary} />
            </TouchableOpacity>
            ) : (
             <TouchableOpacity style={styles.actionRow} onPress={handleLogin} disabled={isLoading}>
                <Text style={[styles.actionText, { color: currentTheme.text }]}>{isLoading ? 'Lädt...' : 'Login mit Google'}</Text>
                <ChevronRight size={20} color={currentTheme.textSecondary} />
            </TouchableOpacity>
            )}
          </SettingContainer>

          <View style={styles.footer}>
             <Text style={[styles.versionText, { color: currentTheme.textSecondary }]}>App Version: v2.1.0</Text>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Modal: Was speichern wir? */}
      <Modal
        visible={showDataModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDataModal(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: currentTheme.background, borderColor: currentTheme.border }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Was speichern wir?</Text>
                    <TouchableOpacity onPress={() => {
                        playClickSound();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowDataModal(false);
                    }}>
                        <X size={24} color={currentTheme.text} />
                    </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 300 }}>
                    <Text style={[styles.modalText, { color: currentTheme.textSecondary }]}>
                        Wir speichern deine Profilinformationen (Username, Email) lokal auf deinem Gerät.
                        {"\n\n"}
                        Deine Chat-Verläufe sind "Ephemeral" und werden standardmäßig nach der eingestellten Zeit gelöscht.
                        {"\n\n"}
                        Insights-Daten werden lokal analysiert und für den gewählten Zeitraum gespeichert, um dir Statistiken anzuzeigen. Es erfolgt kein Upload auf externe Server ohne deine Zustimmung.
                    </Text>
                </ScrollView>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: Colors.primary, marginTop: 20 }]}
                    onPress={() => {
                        playClickSound();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowDataModal(false);
                    }}
                >
                    <Text style={styles.buttonText}>Verstanden</Text>
                </TouchableOpacity>
            </View>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 10,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  themeToggle: {
    position: 'absolute',
    right: 20,
    top: 10,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowText: {
    fontSize: 16,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 14,
    marginBottom: 12,
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sliderContainer: {
    marginTop: 12,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginTop: -5,
  },
  sliderLabel: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    width: '100%',
    opacity: 0.3,
  },
  premiumCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  premiumContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  premiumPrice: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  premiumButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  premiumButtonText: {
    color: '#064e3b',
    fontWeight: '800',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  versionText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
  },
});
