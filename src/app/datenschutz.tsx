import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export default function DatenschutzPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Datenschutzerklärung</Text>
        
        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>1. Datenschutz auf einen Blick</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
        </Text>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>2. Datenerfassung in SimplyAI</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          <Text style={{ fontWeight: 'bold' }}>Chats:</Text> Wir speichern keine Chats. Alle Unterhaltungen sind ephemeral und verschwinden nach der Sitzung.{"\n\n"}
          <Text style={{ fontWeight: 'bold' }}>Insights:</Text> Für Pro-Nutzer werden anonymisierte Muster verarbeitet, um Insights zu generieren. Diese Daten werden sicher über Supabase gespeichert.
        </Text>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>3. Ihre Rechte</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht auf Berichtigung oder Löschung dieser Daten.
        </Text>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>4. Hosting</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Unsere Web-Infrastruktur wird über professionelle Cloud-Provider betrieben. Wir setzen dabei auf höchste Sicherheitsstandards.
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
