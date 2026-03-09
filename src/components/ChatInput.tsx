import React, { memo } from 'react';
import { TextInput, TouchableOpacity, StyleSheet, View, Platform, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  isDark: boolean;
  onFocus: () => void;
  onBlur: () => void;
}

const ChatInput = memo(({ 
  inputText, 
  setInputText, 
  onSend, 
  isDark, 
  onFocus, 
  onBlur 
}: ChatInputProps) => {
  
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  
  return (
    <BlurView intensity={isDark ? 25 : 40} tint={isDark ? "dark" : "light"} style={[
      styles.inputContainer,
      {
        backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : Colors.light.inputBackground,
        borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.05)', // Weicher, sichtbarer Übergang (Light Mode)
        borderWidth: isDark ? 2 : 1.5,
        shadowColor: isDark ? '#000' : '#000',
        shadowOpacity: isDark ? 0.25 : 0.08, // Leichter Schatten für Sichtbarkeit
        shadowRadius: isDark ? 12 : 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: isDark ? 0 : 3,
        height: isMobile ? 70 : 100,
        paddingHorizontal: isMobile ? 15 : 25,
      }
    ]}>
        <TextInput
            style={[
                styles.textInput, 
                { color: isDark ? '#fff' : Colors.light.text, paddingTop: 15, paddingBottom: 15 },
                Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)
            ]}
            placeholder="Frag mich..."
            placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : Colors.light.inputPlaceholder} // Dunkleres Grün
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={onSend}
            returnKeyType="send"
            onFocus={onFocus}
            onBlur={onBlur}
            textAlignVertical="center"
            multiline={true} // Multiline erlaubt textAlignVertical auf Android
        />
        <View style={styles.rightActions}>
            {inputText.length > 0 && (
                <TouchableOpacity 
                    onPress={() => setInputText('')} 
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.clearButton}
                >
                    <Ionicons name="close-circle" size={20} color={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)"} />
                </TouchableOpacity>
            )}
            <TouchableOpacity 
                onPress={onSend} 
                disabled={inputText.trim().length === 0}
                style={[
                    styles.sendButton,
                    { 
                        backgroundColor: inputText.trim().length > 0 
                            ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)') 
                            : 'transparent',
                        opacity: inputText.trim().length > 0 ? 1 : 0.5
                    }
                ]}
            >
                <Ionicons 
                    name="send" 
                    size={20} 
                    color={inputText.trim().length > 0 
                        ? Colors.primary 
                        : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)")} 
                    style={{ marginLeft: 3 }} // Kleiner Offset damit es zentriert wirkt (send icons sind oft asymmetrisch)
                />
            </TouchableOpacity>
        </View>
    </BlurView>
  );
});

const styles = StyleSheet.create({
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 30,
      paddingHorizontal: 25,
      height: 100, // Massiv erhöht (von 50 auf 100)
      width: '95%', // Deutlich breiter (von 60% auf 95%)
      alignSelf: 'center',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
  },
  textInput: {
      flex: 1,
      color: '#fff',
      fontSize: 16, // Größerer Text passend zur Höhe
      fontWeight: '500',
      height: '100%',
  },
  rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  clearButton: {
      padding: 4,
  },
  sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
  },
});

export default ChatInput;