import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { generateResponse, AIChatMessage, analyzeMessage, isKillSwitchActive, abortAllAIRequests } from '../services/aiService';
import { saveChatAnalytics, upsertKeywords, upsertUserInterests } from '../services/databaseService';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

const ENABLE_BG_ANALYZE = process.env.EXPO_PUBLIC_ENABLE_BG_ANALYZE === 'true';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  opacity: number;
}

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { ephemeralTime } = useSettings();
  const { user } = useAuth();
  
  // REF: User immer aktuell halten für Callbacks, ohne addMessage neu zu erzeugen
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Session ID für Analytics (einmal pro App-Start/Chat-Session)
  // WICHTIG: Muss eine valide UUID sein, da die DB den Typ 'uuid' erwartet.
  const sessionId = useRef(
    '00000000-0000-4000-8000-' + Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0')
  ).current;

  // Ref für Messages, um in asynchronen Funktionen immer den aktuellen Stand zu haben
  // ohne ständig neue Closures zu erzeugen, die useEffects triggern könnten.
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  // NEU: Schatten-Gedächtnis für die KI (speichert Nachrichten fix für 5 Minuten)
  const fullHistoryRef = useRef<ChatMessage[]>([]);

  // Debounce + Busy-Phase (kein UI-Change, reines Hook-Guarding)
  // Hinweis: 500–800ms empfohlen, hier defensiv 700ms.
  const DEBOUNCE_MS = 700;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBusyRef = useRef(false);

  const addMessage = useCallback(async (text: string, sender: 'user' | 'ai', skipAiResponse = false) => {
    const now = Date.now();
    const newMessage: ChatMessage = {
      id: now.toString() + Math.random().toString(36).substring(7),
      text,
      sender,
      timestamp: now,
      opacity: 1.0,
    };
    
    console.log(`✨ [ChatFlow] Neue Nachricht: ${newMessage.id.substring(0,8)} | Sender: ${sender} | TS: ${now}`);

    setMessages((prev) => [...prev, newMessage]);
    
    // Auch zum Schatten-Gedächtnis hinzufügen
    fullHistoryRef.current.push(newMessage);

    if (sender === 'user' && !skipAiResponse) {
      // Kill-Switch: sofort blockieren, keine neuen AI-Requests starten
      if (isKillSwitchActive()) {
        setIsLoading(false);
        return newMessage.id;
      }

      // Hintergrund-Analyse (respektiert Kill-Switch)
      const currentUser = userRef.current; // Nutze Ref für aktuellen User
      
      if (ENABLE_BG_ANALYZE && currentUser && !isKillSwitchActive()) {
        // Zähle nur User-Nachrichten für die Analyse-Logik
        const userMessageCount = messagesRef.current.filter(m => m.sender === 'user').length;
        
        // STOP-Logik: Limitierung aufgehoben. Jede Nachricht wird analysiert.
        // Falls zu viele Analysen auftreten, sollte das Rate-Limiting im aiService greifen.
        console.log(`🔵 [ChatFlow] Starte Analyse für User: ${currentUser.id} | MsgCount: ${userMessageCount}`);
        
        void analyzeMessage(text, userMessageCount, currentUser.city)
          .then(async (insight) => {
                if (insight) {
                  console.log('✅ [ChatFlow] Insight generiert:', JSON.stringify(insight));
    
                  const keywordRecords = (insight.keywords || [])
                    .map(k => (k || '').trim())
                    .filter(Boolean)
                    .map(k => ({ keyword: k, context_category: insight.category }));
    
                  try {
                    const results = await Promise.allSettled([
                      saveChatAnalytics({
                        user_id: currentUser.id,
                        session_id: sessionId,
                        sentiment_positive_count: insight.sentiment === 'positive' ? 1 : 0,
                        sentiment_negative_count: insight.sentiment === 'negative' ? 1 : 0,
                        sentiment_neutral_count: insight.sentiment === 'neutral' ? 1 : 0,
                        total_messages_count: 1,
                        avg_message_length: text.length,
                        session_duration_seconds: 0,
                        detailed_sentiment: insight.detailed_sentiment,
                        dynamic_reminder: insight.reminder,
                        dynamic_recommendation: insight.recommendation
                      }),
                      upsertKeywords(currentUser.id, keywordRecords),
                      upsertUserInterests(currentUser.id, [{
                        interest_category: insight.category,
                        confidence_score: 0.1
                      }])
                    ]);
    
                    const rejected = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
                    if (rejected.length > 0) {
                      console.error('❌ DB Save: Promise rejections', rejected.map(r => r.reason));
                    } else {
                      console.log('✅ [ChatFlow] DB-Speicherung erfolgreich abgeschlossen.');
                      // Signalisiere Insights, dass neue Daten da sind
                      DeviceEventEmitter.emit('event.insights.refresh');
                    }
                  } catch (err) {
                    console.error('❌ [ChatFlow] DB Save unerwarteter Fehler:', err);
                  }
                } else {
                  console.warn('⚠️ [ChatFlow] Kein Insight generiert (null returned)');
                }
              })
              .catch((err) => console.error('❌ [ChatFlow] Background analysis failed:', err));
      } else {
        if (!ENABLE_BG_ANALYZE) console.log('ℹ️ [ChatFlow] BG Analysis disabled via ENV');
        // Nutze currentUser für den Log Check
        if (!currentUser) console.log('❌ [ChatFlow] BG Analysis skipped: KEIN USER EINGELOGGT! (userRef ist null)');
        if (isKillSwitchActive()) console.log('⚠️ [ChatFlow] BG Analysis skipped: Kill Switch active');
      }

      // Busy-Phase: Doppel-/Mehrfachauslösen verhindern, erst nach Abschluss/Abort freigeben
      if (isBusyRef.current) {
        // Vorheriger Request läuft noch → keine neue AI-Auslösung
        return newMessage.id;
      }

      // Debounce: vorherigen Trigger verwerfen, nur den letzten innerhalb des Fensters ausführen
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      debounceTimerRef.current = setTimeout(() => {
        // Start der AI-Auslösung nach Debounce-Fenster
        if (isKillSwitchActive()) {
          setIsLoading(false);
          return;
        }

        isBusyRef.current = true;
        setIsLoading(true);

        void (async () => {
          try {
            // Konvertiere Chat-Verlauf und cappe Kontext serverseitig in aiService zusätzlich
            // FIX: Filter entfernen, damit die KI auch Kontext von verblassenden Nachrichten behält
            // UPDATE: Nutze fullHistoryRef für 5-Minuten-Gedächtnis statt nur UI-State
            const history: AIChatMessage[] = fullHistoryRef.current
              .slice(-20)
              .map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                content: m.text,
              }));

            // Zentraler Durchlauf über aiService (Rate-Limit + Queue + Concurrency-Limit)
            const responseText = await generateResponse(history, text);

            const aiMessage: ChatMessage = {
              id: Date.now().toString() + Math.random().toString(36).substring(7),
              text: responseText,
              sender: 'ai',
              timestamp: Date.now(),
              opacity: 1.0,
            };
            setMessages((prev) => [...prev, aiMessage]);
            // Auch AI Antwort zum Schatten-Gedächtnis hinzufügen
            fullHistoryRef.current.push(aiMessage);
          } catch (error) {
            console.error("Fehler im Chat-Flow:", error);
          } finally {
            setIsLoading(false);
            isBusyRef.current = false;
            debounceTimerRef.current = null;
          }
        })();
      }, DEBOUNCE_MS);
    }
    return newMessage.id;
  }, []);

  // Ephemeral Logic: Prüft regelmäßig das Alter der Nachrichten
  useEffect(() => {
    // console.log(`⏱️ [ChatFlow] Ephemeral Timer Reset. Limit: ${ephemeralTime} min`);
    const intervalId = setInterval(() => {
      setMessages((currentMessages) => {
        const now = Date.now();
        const timeLimitSeconds = ephemeralTime * 60; // Minuten in Sekunden
        const fadeStartSeconds = timeLimitSeconds * 0.8; // Bei 80% der Zeit anfangen zu faden

        const updatedMessages = currentMessages
          .map((msg) => {
            const ageSeconds = (now - msg.timestamp) / 1000;
            
            if (ageSeconds > timeLimitSeconds) {
              // console.log(`🗑️ [ChatFlow] Lösche Nachricht: ${msg.id.substring(0,8)} | Age: ${ageSeconds.toFixed(1)}s > Limit: ${timeLimitSeconds}s`);
              return null; // Mark for deletion
            } else if (ageSeconds > fadeStartSeconds) {
              // Berechne Opacity basierend auf verbleibender Zeit (von 1.0 bis 0.0)
              const remainingRatio = 1 - ((ageSeconds - fadeStartSeconds) / (timeLimitSeconds - fadeStartSeconds));
              return { ...msg, opacity: Math.max(0.1, remainingRatio) };
            }
            return { ...msg, opacity: 1.0 };
          })
          .filter((msg): msg is ChatMessage => msg !== null); // Remove nulls

        // Nur State updaten, wenn sich tatsächlich etwas geändert hat
        if (updatedMessages.length !== currentMessages.length) {
             return updatedMessages;
        }
        
        // Deep check für Opacity Änderungen
        const hasChanges = updatedMessages.some((msg, index) => Math.abs(msg.opacity - currentMessages[index].opacity) > 0.01);
        if (hasChanges) {
            return updatedMessages;
        }

        return currentMessages;
      });

      // Schatten-Gedächtnis bereinigen (Fix: 5 Minuten = 300 Sekunden)
      const shadowNow = Date.now();
      const shadowRetentionSeconds = 5 * 60;
      
      fullHistoryRef.current = fullHistoryRef.current.filter(msg => {
          const ageSeconds = (shadowNow - msg.timestamp) / 1000;
          return ageSeconds <= shadowRetentionSeconds;
      });

    }, 1000); // Sekündlich prüfen für flüssigeres Fading

    return () => clearInterval(intervalId);
  }, [ephemeralTime]);

  // Lifecycle: Beim Unmount/Emergency-Stop alle aktiven AI-Requests abbrechen
  useEffect(() => {
    return () => {
      // Beim Unmount/Emergency-Stop: aktive AI-Requests abbrechen und Debounce zurücksetzen
      abortAllAIRequests();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    fullHistoryRef.current = [];
  }, []);

  // AppState Listener für Reconnect Logic (Daten-Refetch bei Bedarf)
  // Im Chat selbst wird der State lokal gehalten, aber wir können hier z.B.
  // prüfen, ob während der Abwesenheit neue Nachrichten reingekommen wären (Sync).
  // Für dieses Projekt ist Chat eher lokal/ephemeral, aber wir loggen den Reconnect.
  useEffect(() => {
      const subscription = AppState.addEventListener('change', (nextAppState) => {
          if (nextAppState === 'active') {
              console.log('[ChatFlow] 📱 App active -> Chat Ready Check');
              // Optional: Hier könnte man einen Sync mit Supabase anstoßen,
              // falls Nachrichten persistiert würden.
          }
      });
      return () => subscription.remove();
  }, []);

  return {
    messages,
    addMessage,
    isLoading,
    clearMessages,
  };
};