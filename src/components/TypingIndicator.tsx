import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence, 
  withDelay,
  FadeIn
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

interface TypingIndicatorProps {
  showThought?: boolean;
}

const thoughts = [
  "Denke nach...",
  "Suche Informationen...",
  "Formuliere Antwort...",
  "Analysiere Kontext...",
  "Verbinde Wissen...",
];

const Dot = ({ delay }: { delay: number }) => {
  const { isDark } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.5, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.4, { duration: 400 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        styles.dot, 
        { backgroundColor: isDark ? '#10b981' : '#059669' },
        animatedStyle
      ]} 
    />
  );
};

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ showThought = true }) => {
  const { isDark } = useTheme();
  const [thoughtIndex, setThoughtIndex] = useState(0);

  useEffect(() => {
    if (!showThought) return;
    const interval = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % thoughts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [showThought]);

  return (
    <Animated.View 
      entering={FadeIn.duration(400)}
      style={styles.container}
    >
      <View style={styles.row}>
        <View style={styles.botIcon}>
          <Ionicons name="sparkles" size={14} color="#fff" />
        </View>
        
        <View style={[
          styles.bubble,
          { 
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : Colors.light.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : Colors.light.border
          }
        ]}>
          <View style={styles.dotsRow}>
            <Dot delay={0} />
            <Dot delay={200} />
            <Dot delay={400} />
          </View>
        </View>
      </View>

      {showThought && (
        <Animated.Text 
          entering={FadeIn.duration(800)}
          style={[
            styles.thoughtText,
            { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }
          ]}
        >
          {thoughts[thoughtIndex]}
        </Animated.Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    alignSelf: 'flex-start',
    paddingLeft: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  botIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    minWidth: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  thoughtText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 38,
    fontStyle: 'italic',
    fontWeight: '500',
  }
});

export default TypingIndicator;
