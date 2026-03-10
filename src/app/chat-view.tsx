import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import ChatInput from '@/components/ChatInput';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

const logoLight = require('@/assets/images/logo_header_light.png');
const logoDark = require('@/assets/images/logo_header_dark.png');

export default function ChatViewScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const { height } = useWindowDimensions();

  const handleSend = () => {
    if (!inputText.trim()) return;
    console.log('Sende Nachricht:', inputText);
    setInputText('');
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: isDark ? '#000a08' : '#F9F8F6' }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Platform.OS !== 'web' ? Keyboard.dismiss : undefined}>
        <View style={styles.innerContainer}>
          {/* Header Area */}
          <Animated.View entering={FadeInDown.duration(800).delay(200)} style={styles.header}>
            <Image
              source={isDark ? logoDark : logoLight}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.slogan, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
              {t('hero.subtitle', 'Ihr intelligenter Assistent für den Alltag')}
            </Text>
          </Animated.View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Chat Input Area */}
          <Animated.View entering={FadeInDown.duration(800).delay(400)} style={styles.inputWrapper}>
            <ChatInput
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              isDark={isDark}
              onFocus={() => {}}
              onBlur={() => {}}
            />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    padding: 24,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 200,
    height: 60,
    marginBottom: 16,
  },
  slogan: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 40,
  },
});