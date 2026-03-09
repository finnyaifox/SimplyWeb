import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export default function AGBPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Allgemeine Geschäftsbedingungen</Text>
        
        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>1. Geltungsbereich</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Diese AGB gelten für alle Leistungen von SimplyAI. Mit der Nutzung der App erklären Sie sich mit diesen Bedingungen einverstanden.
        </Text>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>2. Leistungsbeschreibung</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          SimplyAI bietet KI-gestützte Insights und Kommunikations-Tools. Wir garantieren keine 100%ige Verfügbarkeit, bemühen uns jedoch um einen reibungslosen Betrieb.
        </Text>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>3. Datenschutz & Privatsphäre</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Wir speichern keine Chats. Insights werden für Pro-Nutzer sicher über Supabase verarbeitet. Details entnehmen Sie der Datenschutzerklärung.
        </Text>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>4. Haftung</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          SimplyAI haftet nicht für Schäden, die durch die Nutzung oder Nichtverfügbarkeit der App entstehen, sofern diese nicht auf Vorsatz oder grober Fahrlässigkeit beruhen.
        </Text>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>5. Änderungen</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Wir behalten uns vor, diese AGB jederzeit zu ändern. Nutzer werden über wesentliche Änderungen informiert.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 40,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 30,
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  }
});
