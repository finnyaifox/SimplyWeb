import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function UeberUnsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Über Uns</Text>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Die Mission</Text>
          <Text style={[styles.text, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
            SimplyAI wurde mit dem Ziel entwickelt, künstliche Intelligenz für jeden nutzbar und gleichzeitig so einfach wie möglich zu machen. In einer Welt voller komplexer Tools setzen wir auf Reduktion und Klarheit.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
           <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Ionicons name="person" size={40} color="white" />
           </View>
           <Text style={[styles.founderName, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Leon</Text>
           <Text style={[styles.founderRole, { color: Colors.primary }]}>Gründer & Entwickler</Text>
           <Text style={[styles.text, { textAlign: 'center', marginTop: 20, color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
              "Als leidenschaftlicher Entwickler glaube ich daran, dass Software uns Zeit schenken sollte, anstatt sie uns zu rauben. SimplyAI ist mein Beitrag zu einer fokussierteren digitalen Welt."
           </Text>
        </View>

        <View style={styles.section}>
           <Text style={[styles.sectionTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Unsere Werte</Text>
           <View style={styles.valueRow}>
              <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary} />
              <Text style={[styles.valueText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>Privatsphäre an erster Stelle - keine Chat-Speicherung.</Text>
           </View>
           <View style={styles.valueRow}>
              <Ionicons name="flash-outline" size={24} color={Colors.primary} />
              <Text style={[styles.valueText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>Schnelligkeit und intuitive Bedienung.</Text>
           </View>
           <View style={styles.valueRow}>
              <Ionicons name="heart-outline" size={24} color={Colors.primary} />
              <Text style={[styles.valueText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>Liebe zum Detail in jeder Animation.</Text>
           </View>
        </View>
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
    textAlign: 'center',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 15,
  },
  text: {
    fontSize: 18,
    lineHeight: 28,
  },
  card: {
    padding: 40,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 60,
  },
  founderName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  founderRole: {
    fontSize: 18,
    fontWeight: '600',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
  },
  valueText: {
    fontSize: 18,
  }
});
