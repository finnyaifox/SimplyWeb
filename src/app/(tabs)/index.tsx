import ChatInput from '@/components/ChatInput';
import TypingIndicator from '@/components/TypingIndicator';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { playClickSound } from '@/services/soundService';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, Keyboard, KeyboardAvoidingView, Platform, Share, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View, useWindowDimensions } from 'react-native';
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableScrollbar from '../../components/ui/DraggableScrollbar';
import { useChat } from '../../hooks/useChat';
import { transcribeAudio } from '../../services/aiService';
import { playTTS } from '../../services/ttsService';

const logoLight = require('@/assets/images/logo_header_light.png');
const logoDark = require('@/assets/images/logo_header_dark.png');

const { width } = Dimensions.get('window');

// Kleine Timer-Komponente für die Nachrichten
const EphemeralTimer = React.memo(({ timestamp, durationMinutes, isUser, isDark }: { timestamp: number, durationMinutes: number, isUser: boolean, isDark: boolean }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!timestamp || !durationMinutes) return;

    const endTime = timestamp + durationMinutes * 60 * 1000;
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = endTime - now;
      
      if (remaining <= 0) {
        setTimeLeft('0:00');
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [timestamp, durationMinutes]);

  if (!timeLeft) return null;

  return (
    <Text style={{
      fontSize: 12,
      color: isUser
        ? 'rgba(255, 255, 255, 0.6)'
        : (isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.4)'),
      alignSelf: 'flex-end',
      marginTop: 4,
      marginBottom: -2,
      fontVariant: ['tabular-nums'],
      fontWeight: '500',
      letterSpacing: 0.5
    }}>
      {timeLeft}
    </Text>
  );
});

export default function ChatScreen() {
  const { t } = useTranslation();
  const { theme: contextTheme, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobileWeb = isWeb && windowWidth < 1024;
  const { user } = useAuth();
  const { autoPlayAudioResponse, ephemeralTime } = useSettings();
  const { toggleAppTheme } = useTheme(); // Toggle Funktion holen
  
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isChatOnly = mode === 'chatOnly';
  const { addMessage, messages, clearMessages, isLoading } = useChat();
  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  // NEU: State um Chat-Ansicht erst freizugeben, wenn wirklich aktiv (Verhindert "Reinlaufen" von Text)
  const [isChatOpen, setIsChatOpen] = useState(false);
  // State für Interaktions-Modus ('text' oder 'audio')
  const [interactionMode, setInteractionMode] = useState<'text' | 'audio' | null>(null);
  const isStoppingRef = useRef(false);

  // Header Animation für Fokus
  // Header Animation für Fokus (Text ausblenden)
  const textOpacityAnim = useSharedValue(1);
  const textHeightAnim = useSharedValue(1); // 1 = full height, 0 = collapsed
  const homeFocusAnim = useSharedValue(0); // 0 = normal home, 1 = focused home (scaled down)

  const headerAnimatedStyle = useAnimatedStyle(() => {
    // Wenn Home Focus aktiv ist (homeFocusAnim -> 1)
    const homeScale = interpolate(homeFocusAnim.value, [0, 1], [1, 0.8], Extrapolation.CLAMP);
    // USER FEEDBACK: Slogan nur minimal tiefer (weniger hochschieben als -70, eher -30 oder 0 zurücksetzen?)
    // "Slogan und Unterschrift minimal tiefer" -> im Vergleich zu VORHER oder im Vergleich zum JETZTIGEN Zustand?
    // User: "Logo wieder dahin wo es war und slogan mit unterschrift minimal tiefer sonst nix"
    // Das interpretiere ich so: Logo NICHT hochschieben bei Fokus. Slogan nur ein bisschen.
    
    // Logo soll da bleiben wo es war -> homeTranslateY für Logo = 0
    // Slogan minimal tiefer -> heißt wohl, er soll nicht so stark nach oben? Oder generell tiefer positioniert sein?
    // "minimal tiefer" bezieht sich wahrscheinlich auf die Startposition oder die Endposition?
    // Da der User sagte "beim ersten mal das Slogan und die unterschrift ca. 1cm höher", und jetzt "Logo wieder dahin wo es war",
    // nehme ich an, das Logo soll sich NICHT bewegen (0), und der Slogan soll sich bewegen, aber vllt etwas tiefer als die vorherige extreme verschiebung.
    // Aber "minimal tiefer" klingt eher nach Positionierung, nicht Animation.
    // Ich setze die Animation für den Slogan zurück auf moderate Werte und entferne die Logo-Animation.
    
    const homeTranslateY = interpolate(homeFocusAnim.value, [0, 1], [0, -30], Extrapolation.CLAMP);

    return {
      opacity: textOpacityAnim.value, // Im Chat-Mode wird dies 0
      transform: [
        { translateY: interpolate(textOpacityAnim.value, [0, 1], [-50, 0], Extrapolation.CLAMP) + homeTranslateY },
        { scale: homeScale }
      ],
      height: interpolate(textHeightAnim.value, [0, 1], [0, 80], Extrapolation.CLAMP),
      overflow: 'visible', // Visible für Scaling
      marginBottom: interpolate(textOpacityAnim.value, [0, 1], [0, 140], Extrapolation.CLAMP),
    };
  });

  const logoAnimatedStyle = useAnimatedStyle(() => {
     // Bei Chat Fokus: Logo komplett ausblenden (textOpacityAnim -> 0)
     // Bei Home Fokus: Logo skalieren (homeFocusAnim -> 1)
     
     // Home Transformations
     // USER FEEDBACK: "Logo wieder dahin wo es war" -> Keine Y-Verschiebung, kein Scale?
     // Ich nehme die Y-Verschiebung komplett raus.
     const homeScale = interpolate(homeFocusAnim.value, [0, 1], [1, 0.8], Extrapolation.CLAMP); // Leichtes Scaling ok? User sagte "dahin wo es war". Ich lasse Scale mal moderat.
     const homeTranslateY = interpolate(homeFocusAnim.value, [0, 1], [0, 0], Extrapolation.CLAMP); // KEINE Verschiebung

     // Chat Transformations (textOpacityAnim geht gegen 0)
     const chatScale = interpolate(textOpacityAnim.value, [0, 1], [0, 1], Extrapolation.CLAMP);
     const chatTranslateY = interpolate(textOpacityAnim.value, [0, 1], [-50, 0], Extrapolation.CLAMP);
     const chatHeight = interpolate(textHeightAnim.value, [0, 1], [0, 200], Extrapolation.CLAMP);
     const chatOpacity = interpolate(textOpacityAnim.value, [0, 1], [0, 1], Extrapolation.CLAMP);

     // Wir müssen entscheiden, welche Animation Vorrang hat oder kombiniert wird.
     // Wenn textOpacityAnim < 1 ist (Chat Mode active), nutzen wir die Chat Values.
     // Wenn textOpacityAnim == 1 (könnte Home Mode sein), nutzen wir Home Values.
     
     // Workaround: Wir nutzen homeFocusAnim nur, wenn textOpacityAnim quasi 1 ist.
     
     return {
         transform: [
             { scale: textOpacityAnim.value < 0.9 ? chatScale : homeScale },
             { translateY: textOpacityAnim.value < 0.9 ? chatTranslateY : homeTranslateY }
         ],
         height: textOpacityAnim.value < 0.9 ? chatHeight : 200, // 200 ist fix für Home
         opacity: textOpacityAnim.value < 0.9 ? chatOpacity : 1, // Home immer sichtbar
         marginBottom: interpolate(textOpacityAnim.value, [0, 1], [0, 5], Extrapolation.CLAMP),
     };
  });

  // Animation für das CenterMic auf der Startseite
  const centerMicAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(homeFocusAnim.value, [0, 1], [1, 0.7], Extrapolation.CLAMP);
    const translateY = interpolate(homeFocusAnim.value, [0, 1], [0, 20], Extrapolation.CLAMP);
    
    return {
        transform: [{ scale }, { translateY }],
        opacity: 1
    };
  });

  // Speech States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const [loadingAudioMessageId, setLoadingAudioMessageId] = useState<string | null>(null);
  const [isWaitingForAudioResponse, setIsWaitingForAudioResponse] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Scroll-Sync State für DraggableScrollbar
  const [scrollOffset, setScrollOffset] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const SCROLL_NEAR_END_THRESHOLD = 80; // px
  const [isNearBottom, setIsNearBottom] = useState(true);
  
  // Animationen
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;

  // Drag & Drop Logic (Reanimated)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const context = useSharedValue({ x: 0, y: 0 });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + context.value.x;
      translateY.value = event.translationY + context.value.y;
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: -45 + translateY.value }, // Initial offset preserved
        { translateX: translateX.value },
      ],
    };
  });

  // Recording Logic (Beibehalten)
  async function startRecording() {
    // Verhindere Loop: Wenn KI spricht, erst stoppen!
    if (isSpeaking) {
        if (currentSoundRef.current) {
            await currentSoundRef.current.stopAsync();
            await currentSoundRef.current.unloadAsync();
            currentSoundRef.current = null;
        }
        setIsSpeaking(false);
        setSpeakingMessageId(null);
    }

    try {
      isStoppingRef.current = false;
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
      } else {
        Alert.alert(t('tabs.home.alerts.micPermissionTitle'), t('tabs.home.alerts.micPermissionMsg'));
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording || isStoppingRef.current) return;
    isStoppingRef.current = true;
    
    setIsRecording(false);
    setIsProcessingAudio(true); // Status: Verarbeitung beginnt
    
    try {
        await recording.stopAndUnloadAsync();

        // WICHTIG: Audio-Modus SOFORT auf Wiedergabe (Lautsprecher) zurücksetzen, bevor irgendetwas anderes passiert!
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false, // Aufnahme deaktivieren -> schaltet Mikrofon aus
                playsInSilentModeIOS: true, // Auch im Stumm-Modus abspielen
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
        } catch (e) {
            console.warn("Could not reset audio mode after recording:", e);
        }

        const uri = recording.getURI();
        setRecording(null);

        if (uri) {
            const response = await fetch(uri);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = reader.result?.toString().split(',')[1];
                if (base64data) {
                    try {
                        // 1. Transkribieren
                        const transcribedText = await transcribeAudio(base64data);
                        
                        // 2. Als User-Nachricht hinzufügen (triggert automatisch useChat -> AI Antwort + Insights)
                        // WICHTIG: Nur hinzufügen, wenn auch wirklich Text da ist und nicht nur "00:00" oder Unsinn
                        const cleanText = transcribedText ? transcribedText.trim() : "";
                        if (cleanText.length > 0 && cleanText !== "00:00") {
                            setIsChatOpen(true); // FIX: Chat öffnen nach Aufnahme
                            setInteractionMode('audio'); // Modus auf Audio setzen
                            // Sicherstellen, dass der Fokus weg ist, damit Audio-Modus voll greift
                            Keyboard.dismiss();
                            setIsInputFocused(false);
                            
                            await addMessage(cleanText, 'user'); // skipAiResponse = false (default)
                            // Flag setzen, damit wir wissen, dass wir auf eine Antwort warten, die wir vorlesen wollen
                            setIsWaitingForAudioResponse(true);
                        } else {
                            // Leere Aufnahme -> Nichts tun, Chat bleibt leer
                        }
                    } catch (err) {
                        console.error("Transcription Error:", err);
                        addMessage(t('tabs.home.alerts.audioProcessingErrorMsg'), 'ai');
                    } finally {
                        setIsProcessingAudio(false);
                        isStoppingRef.current = false;
                    }
                } else {
                    setIsProcessingAudio(false);
                    isStoppingRef.current = false;
                }
            };
        } else {
            setIsProcessingAudio(false);
            isStoppingRef.current = false;
        }
    } catch (error) {
        console.error("Error processing audio:", error);
        setIsProcessingAudio(false);
        isStoppingRef.current = false;
        Alert.alert(t('tabs.home.alerts.errorTitle'), t('tabs.home.alerts.audioErrorMsg'));
    }
  }

  const handleMicPress = () => {
      playClickSound();
      
      // UI/UX FIX: Wenn Aufnahme gestartet wird (egal von wo),
      // MUSS der Audio-Modus forciert werden, wenn wir noch nicht drin sind.
      // Das sorgt dafür, dass sich das UI wie auf der Startseite verhält.
      if (!isRecording) {
          // Vorbereitungen für Aufnahme-Start
          if (isInputFocused) {
            Keyboard.dismiss(); // Tastatur weg
            setIsInputFocused(false); // Fokus weg
          }
          // Wenn wir im Text-Modus waren, wechseln wir implizit zu Audio für die kommende Interaktion
          if (interactionMode === 'text') {
             // Wir setzen es hier noch nicht hart auf 'audio', das passiert erst NACH erfolgreicher Aufnahme in stopRecording.
             // Aber wir müssen sicherstellen, dass das UI nicht im Text-Fokus bleibt.
          }
          startRecording();
      } else {
          stopRecording();
      }
  };

  // Animationen starten
  const startAnimations = () => {
    // Reset-Werte
    pulseAnim.setValue(1);
    waveAnim.setValue(0);
    arrowAnim.setValue(0);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();

    // Wave Animation
    Animated.loop(
        Animated.sequence([
            Animated.timing(waveAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(waveAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
    ).start();

    // Pulse Animation (Dauerhaft)
    Animated.loop(
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.12,
                duration: 2000,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.ease),
            }),
        ])
    ).start();

    // Arrow Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 5, duration: 800, useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 800, useNativeDriver: true })
      ])
    ).start();
  };

  useEffect(() => {
    startAnimations();
  }, []);

  // Auto-Play AI Response after Audio Message
  useEffect(() => {
    // Nur abspielen, wenn wir explizit auf eine Audio-Antwort warten UND im Audio-Modus sind
    if (isWaitingForAudioResponse && messages.length > 0 && interactionMode === 'audio') {
        const lastMsg = messages[messages.length - 1];
        // Wenn die letzte Nachricht von der AI kommt, ist es die Antwort auf unser Audio
        if (lastMsg.sender === 'ai') {
            setIsWaitingForAudioResponse(false);
            if (autoPlayAudioResponse) {
                // Kurze Verzögerung für natürlicheren Fluss
                setTimeout(() => {
                    handleSpeech(lastMsg.text, lastMsg.id);
                }, 500);
            }
        }
    }
  }, [messages, isWaitingForAudioResponse, autoPlayAudioResponse, interactionMode]);

  
  
  // Keyboard Listener
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
          Keyboard.dismiss();
          setIsInputFocused(false);
          textOpacityAnim.value = withTiming(1, { duration: 300 });
          textHeightAnim.value = withTiming(1, { duration: 300 });
      }
    );
    
    // Auto-Scroll wenn Tastatur aufklappt
    const keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        () => {
             if (messages.length > 0 && flatListRef.current) {
                 setTimeout(() => {
                     flatListRef.current?.scrollToEnd({ animated: true });
                 }, 100);
             }
        }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, [messages]); // Dependency on messages added so we scroll to end of CURRENT messages

  // Scroll to bottom Logic
  // Wurde ersetzt durch onContentSizeChange in der FlatList für robusteres Verhalten
  useEffect(() => {
      // Fallback: Initiales Scrollen beim Laden
      if (messages.length > 0 && flatListRef.current) {
          setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
      }
  }, []);

  const handleSend = useCallback(() => {
    playClickSound();
    if (inputText.trim()) {
      setIsChatOpen(true); // Chat öffnen
      setInteractionMode('text'); // Modus auf Text setzen
      addMessage(inputText.trim(), 'user');
      setInputText('');
    }
  }, [inputText, addMessage]);

  const handleInputFocus = useCallback(() => {
    setIsInputFocused(true);
    
    if (messages.length === 0) {
        // Startseite Fokus: Logo & Mic skalieren
        homeFocusAnim.value = withTiming(1, { duration: 300 });
    } else {
        // Chat Fokus: Header minimieren
        textOpacityAnim.value = withTiming(0, { duration: 200 });
        textHeightAnim.value = withTiming(0, { duration: 300 });
    }
  }, [messages.length]);

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
    
    // Reset alle Animationen
    homeFocusAnim.value = withTiming(0, { duration: 300 });
    textOpacityAnim.value = withTiming(1, { duration: 300 });
    textHeightAnim.value = withTiming(1, { duration: 300 });
  }, []);

  // Chat manuell leeren und zur Startseite wechseln
  const handleClearChat = async () => {
    playClickSound();
    
    // UI Reset
    Keyboard.dismiss();
    setIsInputFocused(false);
    
    // Animation Reset Values (wichtig für sauberen State)
    homeFocusAnim.value = withTiming(0, { duration: 300 });
    textOpacityAnim.value = withTiming(1, { duration: 300 });
    textHeightAnim.value = withTiming(1, { duration: 300 });

    try {
      if (currentSoundRef.current) {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
        currentSoundRef.current = null;
      }
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    } catch {}
    
    clearMessages();
    setIsChatOpen(false); // Status zurücksetzen
    setInteractionMode(null); // Modus zurücksetzen
    
    // Neustart der Animationen sicherstellen
    startAnimations();
    
    // optional: Nach Reset auf die Startseite (Tab) zurück
    try {
      router.replace('/(tabs)');
    } catch {}
  };

  const handleShare = async (text: string) => {
    playClickSound();
    try {
      await Share.share({
        message: `${text}\n\nSimplyAi - The New Simply Ki Chat`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSpeech = async (text: string, messageId: string) => {
    playClickSound();

    // Verhindere Loop: Niemals abspielen, wenn Aufnahme läuft!
    if (isRecording) {
        return;
    }

    try {
        // Wenn genau diese Nachricht gerade spricht -> Stoppen
        if (isSpeaking && speakingMessageId === messageId) {
            if (currentSoundRef.current) {
                await currentSoundRef.current.stopAsync();
                await currentSoundRef.current.unloadAsync();
                currentSoundRef.current = null;
            }
            setIsSpeaking(false);
            setSpeakingMessageId(null);
            return;
        }

        // Wenn eine andere Nachricht spricht oder einfach nur alter Sound da ist -> Stoppen & Cleanup
        if (currentSoundRef.current) {
            try {
                await currentSoundRef.current.stopAsync();
                await currentSoundRef.current.unloadAsync();
            } catch (e) { }
            currentSoundRef.current = null;
        }

        // Lade-Status setzen
        setLoadingAudioMessageId(messageId);
        
        // Erst wenn Sound geladen ist, setzen wir Speaking State
        // (Wird unten nach playTTS gemacht)

        const sound = await playTTS(text);
        
        // Laden beendet
        setLoadingAudioMessageId(null);

        if (sound) {
            setSpeakingMessageId(messageId);
            setIsSpeaking(true);

            currentSoundRef.current = sound;
            // Listener für das Ende der Wiedergabe hinzufügen
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsSpeaking(false);
                    setSpeakingMessageId(null);
                    // Optional: Sound unloaden
                    sound.unloadAsync().catch(() => {});
                    currentSoundRef.current = null;
                }
            });
        } else {
             // Fallback falls TTS fehlschlägt
             setIsSpeaking(false);
             setSpeakingMessageId(null);
             Alert.alert(t('tabs.home.alerts.errorTitle'), t('tabs.home.alerts.audioPlayErrorMsg'));
        }

    } catch (error) {
        console.error("Speech error", error);
        setLoadingAudioMessageId(null);
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        Alert.alert(t('tabs.home.alerts.errorTitle'), t('tabs.home.alerts.speechErrorMsg'));
    }
  };

  const handleBackgroundPress = () => {
    Keyboard.dismiss();
    setIsInputFocused(false);
    textOpacityAnim.value = withTiming(1, { duration: 300 });
    textHeightAnim.value = withTiming(1, { duration: 300 });
  };

  const renderMessageItem = ({ item }: { item: any }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[
        styles.messageRow,
        isUser ? styles.userMessageRow : styles.aiMessageRow,
      ]}>
        {!isUser && (
          <View style={styles.botIcon}>
             <Ionicons name="sparkles" size={14} color="#fff" />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : [styles.aiBubble, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : Colors.light.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.light.border
          }]
        ]}>
          <Text
            style={[
            styles.messageText,
            { color: isUser ? '#fff' : (isDark ? '#e5e7eb' : '#1f2937') }
          ]}>{item.text}</Text>
          
          {!isUser && (
            <View style={styles.actionRow}>
                <TouchableOpacity
                onPress={() => handleSpeech(item.text, item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  backgroundColor: isSpeaking && speakingMessageId === item.id ? (isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)') : 'transparent',
                  padding: 4,
                  borderRadius: 20,
                  marginLeft: -4 // Optischer Ausgleich für Padding
                }}
                >
                {loadingAudioMessageId === item.id ? (
                     <ActivityIndicator size="small" color={isDark ? '#34d399' : '#059669'} style={{ transform: [{ scale: 0.8 }] }} />
                ) : (
                    <Ionicons
                        name={isSpeaking && speakingMessageId === item.id ? "stop-circle" : "play-circle-outline"}
                        size={22}
                        color={isSpeaking && speakingMessageId === item.id ? (isDark ? '#34d399' : '#059669') : (isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)")}
                    />
                )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleShare(item.text)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name="share-outline"
                        size={18}
                        color={isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)"}
                    />
                </TouchableOpacity>
            </View>
          )}

          {/* Ephemeral Timer */}
          <EphemeralTimer
            timestamp={item.timestamp}
            durationMinutes={ephemeralTime}
            isUser={isUser}
            isDark={isDark}
          />
        </View>
      </View>
    );
  };

  // --- UI COMPONENTS ---

  const renderCenterMic = () => (
      <View style={styles.centerContainer}>
          {/* Sound Waves Left */}
          <Animated.View style={[styles.waveContainer, { opacity: waveAnim, transform: [{ translateX: -10 }] }]}>
              <View style={[styles.waveDot, { height: 8 }]} />
              <View style={[styles.waveDot, { height: 16 }]} />
              <View style={[styles.waveDot, { height: 8 }]} />
          </Animated.View>

          {/* Main Mic */}
          <View style={styles.micWrapper}>
              <View style={{
                  position: 'absolute',
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: '#047857', // Dunkelgrüner Hintergrund-Kreis hinter dem Mikro (Hell & Dunkel)
                  zIndex: 0
              }} />
              <Animated.View style={[styles.pulseRing, {
                  transform: [{ scale: pulseAnim }],
                  borderColor: '#10B981', // Grüner Pulsierender Ring (Hell & Dunkel gleich)
                  zIndex: 1
              }]} />
              <LinearGradient
                  colors={
                      isRecording ? ['#ef4444', '#b91c1c'] :
                      isProcessingAudio ? ['#d97706', '#b45309'] :
                      ['#10B981', '#047857'] // Zurück zu Grün (Hintergrund) - User Request
                  }
                  style={styles.micButton}
              >
                  <TouchableOpacity
                      onPress={handleMicPress}
                      style={styles.micTouchable}
                      activeOpacity={0.8}
                      disabled={isProcessingAudio}
                  >
                      {isProcessingAudio ? (
                          <Ionicons name="hourglass-outline" size={32} color="#fff" style={{ opacity: 0.9 }} />
                      ) : (
                          <Ionicons name={isRecording ? "stop" : "mic"} size={42} color="#fff" /> // Icon ist jetzt WEISS
                      )}
                  </TouchableOpacity>
              </LinearGradient>
          </View>
          
          {/* Status Text for Processing */}
          {isProcessingAudio && (
              <View style={{ position: 'absolute', bottom: -30 }}>
                  <Text style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', fontSize: 12 }}>{t('tabs.home.processing')}</Text>
              </View>
          )}

          {/* Sound Waves Right */}
          <Animated.View style={[styles.waveContainer, { opacity: waveAnim, transform: [{ translateX: 10 }] }]}>
              <View style={[styles.waveDot, { height: 8 }]} />
              <View style={[styles.waveDot, { height: 16 }]} />
              <View style={[styles.waveDot, { height: 8 }]} />
          </Animated.View>
      </View>
  );
  
    // Kleiner Mic-Button (Statisch oben unter Logo im Fokus-Modus, ODER schwebend im Chat)
  const renderFloatingMic = (isStatic = false) => {
      // Wenn statisch, dann andere Styles verwenden, sonst draggable
      if (isStatic) {
          return (
            <View style={[
                styles.floatingMicContainer,
                // Statische Positionierung ohne absolute Werte für sauberes Layout im Header
                { position: 'relative', top: 0, right: 0, marginTop: 0 }
            ]}>
              <View style={styles.floatingMicRow}>
                   {/* Sound Waves Left (klein) */}
                   <Animated.View style={[styles.waveContainerSmall, { opacity: waveAnim, transform: [{ translateX: -6 }] }]}>
                   <View style={[styles.waveDot, { height: 6, backgroundColor: Colors.light.gold }]} />
                   <View style={[styles.waveDot, { height: 12, backgroundColor: Colors.light.gold }]} />
                   <View style={[styles.waveDot, { height: 6, backgroundColor: Colors.light.gold }]} />
                   </Animated.View>
         
                   {/* Small Mic */}
                   <View style={styles.micWrapperSmall}>
                   {/* Dunkler Hintergrundkreis für Kontrast */}
                   <View style={{
                      position: 'absolute',
                      width: 68,
                      height: 68,
                      borderRadius: 34,
                      backgroundColor: '#047857',
                      zIndex: 0
                   }} />
                   <Animated.View style={[styles.pulseRingSmall, { transform: [{ scale: pulseAnim }], borderColor: '#10B981' }]} />
                   <LinearGradient
                       colors={isRecording ? ['#ef4444', '#b91c1c'] : isProcessingAudio ? ['#d97706', '#b45309'] : ['#10B981', '#047857']}
                       style={styles.micButtonSmall}
                   >
                       <TouchableOpacity
                       onPress={handleMicPress}
                       style={styles.micTouchable}
                       activeOpacity={0.8}
                       disabled={isProcessingAudio}
                       >
                       {isProcessingAudio ? (
                           <Ionicons name="hourglass-outline" size={20} color="#fff" style={{ opacity: 0.9 }} />
                       ) : (
                           <Ionicons name={isRecording ? "stop" : "mic"} size={28} color="#fff" /> // Weiss Icon
                       )}
                       </TouchableOpacity>
                   </LinearGradient>
                   </View>

                  {/* Sound Waves Right (klein) */}
                  <Animated.View style={[styles.waveContainerSmall, { opacity: waveAnim, transform: [{ translateX: 6 }] }]}>
                  <View style={[styles.waveDot, { height: 6, backgroundColor: Colors.light.gold }]} />
                  <View style={[styles.waveDot, { height: 12, backgroundColor: Colors.light.gold }]} />
                  <View style={[styles.waveDot, { height: 6, backgroundColor: Colors.light.gold }]} />
                  </Animated.View>
              </View>
            </View>
          );
      }

    return (
    <GestureDetector gesture={panGesture}>
      <Reanimated.View style={[
          styles.floatingMicContainer,
          { top: '50%', right: 0 },
          animatedStyle
      ]}>
        {/* Mic Row Container */}
        <View style={styles.floatingMicRow}>
            {/* Sound Waves Left (klein) */}
            <Animated.View style={[styles.waveContainerSmall, { opacity: waveAnim, transform: [{ translateX: -6 }] }]}>
            <View style={[styles.waveDot, { height: 6, backgroundColor: Colors.light.gold }]} />
            <View style={[styles.waveDot, { height: 12, backgroundColor: Colors.light.gold }]} />
            <View style={[styles.waveDot, { height: 6, backgroundColor: Colors.light.gold }]} />
            </Animated.View>

            {/* Small Mic */}
            <View style={styles.micWrapperSmall}>
            {/* Dunkler Hintergrundkreis für Kontrast */}
            <View style={{
                position: 'absolute',
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: '#047857',
                zIndex: 0
            }} />
            <Animated.View style={[styles.pulseRingSmall, { transform: [{ scale: pulseAnim }], borderColor: '#10B981' }]} />
            <LinearGradient
                colors={isRecording ? ['#ef4444', '#b91c1c'] : isProcessingAudio ? ['#d97706', '#b45309'] : ['#10B981', '#047857']}
                style={styles.micButtonSmall}
            >
                <TouchableOpacity
                onPress={handleMicPress}
                style={styles.micTouchable}
                activeOpacity={0.8}
                disabled={isProcessingAudio}
                >
                {isProcessingAudio ? (
                    <Ionicons name="hourglass-outline" size={20} color="#fff" style={{ opacity: 0.9 }} />
                ) : (
                    <Ionicons name={isRecording ? "stop" : "mic"} size={28} color="#fff" />
                )}
                </TouchableOpacity>
            </LinearGradient>
            </View>

            {/* Sound Waves Right (klein) */}
            <Animated.View style={[styles.waveContainerSmall, { opacity: waveAnim, transform: [{ translateX: 6 }] }]}>
            <View style={[styles.waveDot, { height: 6, backgroundColor: Colors.light.gold }]} />
            <View style={[styles.waveDot, { height: 12, backgroundColor: Colors.light.gold }]} />
            <View style={[styles.waveDot, { height: 6, backgroundColor: Colors.light.gold }]} />
            </Animated.View>
        </View>

        {/* Clear Chat Button (X) - Nur anzeigen wenn mindestens eine KI-Nachricht da ist */}
        {messages.some(m => m.sender === 'ai') && (
            <TouchableOpacity
                onPress={handleClearChat}
                style={styles.floatingCloseButton}
                activeOpacity={0.7}
            >
                <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
        )}
      </Reanimated.View>
    </GestureDetector>
  );
};

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={isDark ? ['#022c22', '#064e3b', '#021814'] : [Colors.light.background, '#EFEEEA', '#E5E3DE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={[
        styles.safeArea,
        isWeb ? {
          maxWidth: isMobileWeb ? '100%' : 600,
          width: '100%',
          alignSelf: 'center',
          paddingTop: isMobileWeb ? 0 : 80
        } : {}
      ]} edges={isMobileWeb ? [] : ['top']}>
          {/* Custom Header */}
          <View style={[styles.headerContainer, { overflow: 'visible' }]}>
              {/* Hintergrund Blur für Chat Header (Fokus) */}
              {(messages.length > 0 && isInputFocused) && (
                   <BlurView
                      intensity={Platform.OS === 'ios' ? 40 : 80} // iOS braucht weniger, Android mehr
                      tint={isDark ? 'dark' : 'light'}
                      style={StyleSheet.absoluteFill}
                   />
              )}

              {/* Mini Mic im Chat Modus (Fokus) oder bei Text-Interaktion - Oben Links */}
              {(messages.length > 0 && (isInputFocused || interactionMode === 'text')) && (
                  <TouchableOpacity
                      onPress={handleMicPress}
                      style={{
                          position: 'absolute',
                          top: 10, // UI/UX: Korrigiert auf Höhe Theme-Icon (war 30)
                          left: 20,
                          padding: 8,
                          borderRadius: 20,
                          backgroundColor: isRecording ? '#ef4444' : (isProcessingAudio ? '#d97706' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')),
                          zIndex: 2000, // Erhöht für bessere Klickbarkeit
                          elevation: 10, // Für Android
                          alignItems: 'center',
                          justifyContent: 'center'
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Klickbereich vergrößern
                  >
                       <Ionicons
                        name={isProcessingAudio ? "hourglass-outline" : (isRecording ? "stop" : "mic")}
                        size={18}
                        color={(isDark || isRecording || isProcessingAudio) ? '#fff' : Colors.light.icon}
                       />
                  </TouchableOpacity>
              )}

             {/* Theme Toggle Absolute Top Right */}
             {/* Nur anzeigen wenn nicht im Fokus-Modus im Chat, oder immer? User sagte "Theme-Icon schweben nackt" -> Soll header haben. Also lassen wir es da. */}

             {!isMobileWeb && (
               <TouchableOpacity onPress={toggleAppTheme} style={styles.themeToggle}>
                    <Ionicons
                        name={isDark ? 'moon' : 'sunny'}
                        size={22}
                        color={isDark ? 'rgba(255,255,255,0.6)' : Colors.light.icon}
                    />
                </TouchableOpacity>
             )}
              
              <View style={styles.headerContent}>
              {/* Logo prominent für Mobile Web */}
              {isMobileWeb && (
                <Reanimated.View style={[
                  { alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginTop: 20 },
                  headerAnimatedStyle
                ]}>
                  <Image
                    source={isDark ? logoDark : logoLight}
                    style={{ width: 180, height: 60 }}
                    resizeMode="contain"
                  />
                </Reanimated.View>
              )}
              
              {/* Slogan und Untertitel - Versteckt auf Mobile Web für minimalistische Ansicht */}
              {!isMobileWeb && (
                <Reanimated.View style={[styles.headerTextContainer, headerAnimatedStyle, { marginTop: 80 }]}>
                    <Text style={[styles.headerTitle, { color: isDark ? '#ECFDF5' : '#2D2A26', marginTop: 0 }]} numberOfLines={1} adjustsFontSizeToFit>
                        {t('tabs.home.title')}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: isDark ? '#6EE7B7' : '#8C7B68', marginTop: 15 }]}>
                        {t('tabs.home.subtitle')}
                    </Text>
                </Reanimated.View>
              )}
          </View>
      </View>

        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // Android braucht oft ein kleines Offset
        >
                <View style={{ flex: 1, height: '100%' }}>
                    {/* Main Content */}
                    <View style={styles.contentContainer} onLayout={(e) => { setViewportHeight(e.nativeEvent.layout.height); }}>
                        {(!isChatOpen || messages.length === 0) ? (
                            <TouchableWithoutFeedback onPress={handleBackgroundPress}>
                                <Animated.View style={{ opacity: fadeAnim, flex: 1, justifyContent: 'center', paddingBottom: isInputFocused ? 40 : 0 }}>
                                    <Reanimated.View style={[centerMicAnimatedStyle, (Platform.OS === 'web' && width > 768) && { display: 'none' }]}>
                                        {/* Mikrofon wird jetzt auch bei Fokus angezeigt, aber transformiert */}
                                        {renderCenterMic()}
                                    </Reanimated.View>
                                </Animated.View>
                            </TouchableWithoutFeedback>
                        ) : (
                            <Animated.View style={{ flex: 1, opacity: 1 }}>
                                <FlatList
                                    ref={flatListRef}
                                    style={{ flex: 1 }}
                                    data={messages}
                                    renderItem={renderMessageItem}
                                    keyExtractor={item => item.id}
                                    contentContainerStyle={[styles.chatList, { flexGrow: 1 }]}
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                    keyboardDismissMode="on-drag"
                                    onContentSizeChange={(w, h) => {
                                        setContentHeight(h);
                                        
                                        // Auto-Scroll Logik
                                        if ((messages.length > 0 || isLoading) && flatListRef.current) {
                                            const lastMsg = messages[messages.length - 1];
                                            
                                            // 1. Wenn User sendet oder lädt -> Immer sofort scrollen
                                            if (isLoading || (lastMsg && lastMsg.sender === 'user')) {
                                                flatListRef.current.scrollToEnd({ animated: true });
                                                return;
                                            }

                                            // 2. Wenn AI antwortet (sender === 'ai')
                                            // Prüfen ob wir "near bottom" sind oder Tastatur offen ist (Input focused)
                                            // Dies stellt sicher, dass wir den User nicht stören, wenn er hochgescrollt hat
                                            if (isNearBottom || isInputFocused) {
                                                // Verzögertes Scrollen für AI Nachrichten (Layout Stabilisierung & Tastatur-Handling)
                                                // Mehrfaches Scrollen schadet hier nicht, stellt aber sicher, dass wir am Ende landen
                                                setTimeout(() => {
                                                    flatListRef.current?.scrollToEnd({ animated: true });
                                                }, 100);
                                                
                                                // Zweiter Check etwas später für langsames Layout/Rendering
                                                setTimeout(() => {
                                                     flatListRef.current?.scrollToEnd({ animated: true });
                                                }, 300);
                                            }
                                        }
                                    }}
                                    onScroll={({ nativeEvent }) => {
                                        const y = nativeEvent.contentOffset.y;
                                        // const ch = nativeEvent.contentSize.height; // Jetzt via onContentSizeChange
                                        const ch = contentHeight || nativeEvent.contentSize.height; // Fallback
                                        const vh = nativeEvent.layoutMeasurement.height;
                                        
                                        setScrollOffset(y);
                                        // setContentHeight(ch); // Redundant zu onContentSizeChange, aber schadet nicht
                                        setViewportHeight(vh);
                                        
                                        const distanceFromBottom = Math.max(0, ch - vh - y);
                                        setIsNearBottom(distanceFromBottom < SCROLL_NEAR_END_THRESHOLD);
                                    }}
                                    scrollEventThrottle={16}
                                    ListFooterComponent={
                                        <View style={{ paddingBottom: 20 }}>
                                            {isLoading && (
                                                <TypingIndicator />
                                            )}
                                            {isProcessingAudio && (
                                                <View style={{ padding: 15, marginLeft: 10 }}>
                                                    <Text style={{ color: isDark ? 'rgba(255,255,255,0.6)' : Colors.light.textSecondary, fontSize: 24, letterSpacing: 2 }}>•••</Text>
                                                </View>
                                            )}
                                            {/* X-Button am Ende des Chats - NUR IM TEXT-MODUS UND NACH ERSTER KI-ANTWORT */}
                                            {(messages.some(m => m.sender === 'ai') && interactionMode === 'text') && (
                                                <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 10 }}>
                                                    {/* marginTop reduziert (war 20), näher an der Nachricht */}
                                                    <TouchableOpacity
                                                        onPress={handleClearChat}
                                                        style={{
                                                            padding: 10,
                                                            borderRadius: 30,
                                                            backgroundColor: 'transparent', // Transparent wie gewünscht
                                                        }}
                                                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                                    >
                                                        <Ionicons name="close" size={24} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} />
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    }
                                />
                                
                                {/* Overlay Scrollbar rechts für flüssiges Drag-Scrolling */}
                                <DraggableScrollbar
                                    scrollOffset={scrollOffset}
                                    contentHeight={contentHeight}
                                    viewportHeight={viewportHeight}
                                    onRequestScrollTo={(offset) => {
                                        flatListRef.current?.scrollToOffset({ offset, animated: false });
                                    }}
                                />
                            </Animated.View>
                        )}
                    </View>

                    {/* Bottom Controls */}
                    <View style={[
                        styles.bottomControls,
                        {
                            zIndex: 1000,
                            // FIX: Wenn kein Fokus, massiver Abstand nach unten (120), damit Input & Banner
                            // ÜBER der TabBar/HomeIndicator schweben und voll sichtbar sind.
                            // Bei Fokus (Keyboard offen) erhöhen wir das Padding auf 40, um sicherzustellen,
                            // dass der Banner unter dem Input nicht von der Tastaturkante abgeschnitten wird.
                            paddingBottom: isInputFocused ? 40 : (isMobileWeb ? 40 : 120)
                        }
                    ]}>
                {/* Bottom Navigation: X unten links - ENTFERNT */}
                
                {/* Input Field */}
                <ChatInput
                    inputText={inputText}
                    setInputText={setInputText}
                    onSend={handleSend}
                    isDark={isDark}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                />

                {/* Banner - Sichtbarkeit sicherstellen */}
                {/* Nur anzeigen wenn KEIN Chat offen ist */}
                {/* Banner nur anzeigen, wenn keine Nachrichten da sind und kein Fokus */}
                {/* Banner immer anzeigen, wenn keine Nachrichten da sind (auch bei Fokus) */}
                {(messages.length === 0 && !isInputFocused && !isChatOnly && !isMobileWeb) && (
                <TouchableOpacity onPress={() => {
                    playClickSound();
                    router.push('/(tabs)/insights');
                }} activeOpacity={0.9}>
                    <LinearGradient
                        colors={isDark ? ['rgba(16, 185, 129, 0.25)', 'rgba(6, 78, 59, 0.9)'] : ['#064e3b', '#065f46']} // Dark Green in Light Mode requested
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.bannerContainer, {
                            marginTop: 10,
                            marginBottom: 5,
                            borderWidth: 1.5, // Dickerer Rand
                            borderColor: isDark ? 'rgba(52, 211, 153, 0.6)' : Colors.light.border,
                            shadowColor: isDark ? '#10B981' : '#8C7B68',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                            elevation: 3
                        }]}
                    >
                        <View style={[styles.bannerTextContainer, { flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.bannerTitle, { color: '#fff', fontSize: 13, marginRight: 8 }]}>{t('tabs.home.insightsActivate')}</Text>
                                <Animated.View style={{ transform: [{ translateX: arrowAnim }] }}>
                                    <Ionicons name="arrow-forward" size={14} color={'#34d399'} style={{ marginRight: 8 }} />
                                </Animated.View>
                                <Text style={[styles.bannerTitle, { color: '#fff', fontSize: 13 }]}>{t('tabs.home.patternsRecognize')}</Text>
                            </View>
                            <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2, fontWeight: '500' }}>{t('tabs.home.insightsDemo')}</Text>
                        </View>
                        
                        {/* NEW Badge */}
                        <LinearGradient
                            colors={['#8b5cf6', '#3b82f6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.badge, { right: 8, bottom: 8, top: undefined, opacity: 0.8, transform: [{scale: 0.85}] }]}
                        >
                            <Text style={styles.badgeText}>{t('tabs.home.newBadge')}</Text>
                        </LinearGradient>
                    </LinearGradient>
                </TouchableOpacity>
                )}

            </View>
            {/* Schwebendes Mikro im Chat - NUR IM AUDIO-MODUS (und wenn kein Fokus, obwohl Fokus im Audio Modus selten ist) */}
            {(messages.length > 0 && !isInputFocused && interactionMode === 'audio') && renderFloatingMic()}
          </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 0,
    paddingBottom: 5, // Kompakter
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 100,
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 200,
    height: 200,
  },
  headerTextContainer: {
    alignItems: 'center',
    gap: 4, // Minimaler Abstand zwischen Titel und Untertitel
    width: '100%',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.9,
  },
  themeToggle: {
    position: 'absolute',
    top: 10,
    right: 20,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  centerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 30, // Erhöht für massiven Abstand zum Header
      paddingBottom: 60,
  },
  micWrapper: {
      width: 160,
      height: 160,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 20,
      position: 'relative',
      zIndex: 2, // über den Wellen
  },
  micButton: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 3, // über Pulse-Ring
      // Kein Border für cleanen Look, nur Gradient
  },
  micTouchable: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
  },
  pulseRing: {
      position: 'absolute',
      width: 150,
      height: 150,
      borderRadius: 75,
      borderWidth: 1, // Dünner (war 1.5)
      // Dynamische Farbe wird im Component-Style gesetzt, hier nur Layout
      shadowColor: '#34d399',
      shadowOpacity: 0.2, // Dezenter (war 0.35)
      shadowRadius: 8, // Kleinerer Glow (war 12)
      zIndex: 1,
      pointerEvents: 'none', // blockiert keine Touches
  },
  waveContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      zIndex: 1, // hinter dem Mikro, aber sichtbar
      pointerEvents: 'none',
  },
  waveDot: {
      width: 4,
      backgroundColor: Colors.light.gold, // CHANGE: Gold statt Rot
      borderRadius: 2,
  },
  bottomControls: {
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 20 : 20, // GAP FIX: Näher am unteren Rand (Tastatur)
      gap: 40,
  },
  // bottomNavBar und bottomNavCloseButton entfernt
  bottomNavCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  // Floating Mic
  floatingMicContainer: {
      position: 'absolute',
      right: 0,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000, // Muss höher sein als bottomControls (1000)
      elevation: 10, // Für Android
      pointerEvents: 'box-none',
  },
  floatingMicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
  },
  floatingCloseButton: {
      marginTop: 15,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(220, 38, 38, 0.9)', // Sattes Rot
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)'
  },
  micWrapperSmall: {
      width: 90,
      height: 90,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 10,
      position: 'relative',
      zIndex: 2,
  },
  micButtonSmall: {
      width: 68,
      height: 68,
      borderRadius: 34,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 3,
  },
  pulseRingSmall: {
      position: 'absolute',
      width: 82,
      height: 82,
      borderRadius: 41,
      borderWidth: 1.2,
      shadowColor: '#34d399',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      zIndex: 1,
      pointerEvents: 'none',
  },
  waveContainerSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      zIndex: 1,
      pointerEvents: 'none',
  },
  bannerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      paddingHorizontal: 15,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
      position: 'relative',
      height: 40 // Von 50 auf 40 verkleinert
  },
  bannerTextContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      paddingVertical: 5,
  },
  bannerTitle: {
      fontWeight: '600',
  },
  bannerArrow: {
      fontWeight: 'bold',
  },
  bannerSubtitle: {
      fontWeight: '500',
  },
  badge: {
      position: 'absolute',
      top: -10,
      right: -5,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 18,
  },
  badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
  },
  // Chat List Styles
  chatList: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 100, // Erhöhtes Padding für besseres Scrolling am Ende
      flexGrow: 1,
  },
  messageRow: {
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'flex-start',
      maxWidth: '85%',
  },
  userMessageRow: {
      alignSelf: 'flex-end',
      flexDirection: 'row-reverse',
  },
  aiMessageRow: {
      alignSelf: 'flex-start',
  },
  botIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(16, 185, 129, 0.2)', // Könnte man auch dynamisch machen, aber Grün passt auch zum Beige als Akzent
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
      marginTop: 2,
  },
  messageBubble: {
      padding: 14,
      borderRadius: 18,
  },
  userBubble: {
      backgroundColor: '#10b981',
      borderBottomRightRadius: 4,
  },
  aiBubble: {
      // Background wird dynamisch im Component-Style überschrieben (siehe renderMessageItem),
      // aber wir definieren hier Standard-Werte für Layout
      borderBottomLeftRadius: 4,
      borderWidth: 1,
  },
  messageText: {
      fontSize: 16,
      lineHeight: 22,
  },
  actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 16,
  }
});