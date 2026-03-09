import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export default function ImpressumPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Impressum</Text>
        
        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Angaben gemäß § 5 TMG</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Leon [Nachname]{"\n"}
          SimplyAI{"\n"}
          [Straße Hausnummer]{"\n"}
          [PLZ Ort]
        </Text>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Kontakt</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          E-Mail: hallo@simplyai.app
        </Text>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Umsatzsteuer-ID</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:{"\n"}
          [DE XXX XXX XXX]
        </Text>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Leon [Nachname]{"\n"}
          [Anschrift wie oben]
        </Text>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>EU-Streitschlichtung</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/.{"\n"}
          Unsere E-Mail-Adresse finden Sie oben im Impressum.
        </Text>

        <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Verbraucher­streit­beilegung/Universal­schlichtungs­stelle</Text>
        <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
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
