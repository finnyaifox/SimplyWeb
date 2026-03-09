import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

const GOOGLE_API_KEY = 'AIzaSyCSdbc9K3EaVIMLkgK9JDy2t1ZzlFubwJ8';
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Funktion zum Reinigen des Textes für TTS
const cleanTextForTTS = (text: string): string => {
  if (!text) return '';
  let cleaned = text;

  // 1. Emojis entfernen
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu, '');

  // 2. Markdown-Sonderzeichen entfernen
  cleaned = cleaned.replace(/[*#_`~]/g, '');

  // 3. Listen-Zeichen (-) am Anfang von Zeilen entfernen
  cleaned = cleaned.replace(/^\s*-\s/gm, '');

  // 4. Mehrfache Leerzeichen auf eines reduzieren
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
};

export const playTTS = async (text: string): Promise<Audio.Sound | undefined> => {
  try {
    const cleanedText = cleanTextForTTS(text);

    // Sicherstellen, dass der Audio-Modus für Wiedergabe konfiguriert ist
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers, // Hintergrundmusik leiser machen
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers, // Hintergrundmusik leiser machen
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const response = await fetch(`${GOOGLE_TTS_URL}?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: cleanedText },
        voice: { languageCode: 'de-DE', name: 'de-DE-Wavenet-C' },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Google TTS Error:', errorBody);
        throw new Error(`TTS API returned ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    if (audioContent) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mp3;base64,${audioContent}` },
        { shouldPlay: true, volume: 1.0 }
      );
      
      // Wir geben das Sound-Objekt zurück, damit der Aufrufer Events handhaben oder es stoppen kann
      return sound;
    }
  } catch (error) {
    console.error('Error in ttsService:', error);
    throw error;
  }
  return undefined;
};