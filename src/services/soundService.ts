import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { CLICK_SOUND_URI } from '@/constants/Base64Sounds';

export const initAudio = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
    console.log('Audio initialized for silent mode playback');
  } catch (error) {
    console.warn('Error initializing audio:', error);
  }
};

export const playClickSound = async () => {
  // Click sounds disabled per user request
  return;
};