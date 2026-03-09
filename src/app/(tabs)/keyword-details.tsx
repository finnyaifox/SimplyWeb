import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getKeywordsByCategory } from '@/services/databaseService';

export default function KeywordDetailsScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const category = (params.category as string) || 'All';
  const { user } = useAuth();

  const [keywords, setKeywords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKeywords = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await getKeywordsByCategory(user.id, category);
            setKeywords(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    fetchKeywords();
  }, [user, category]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#022c22', '#064e3b', '#021814'] : ['#f0fdf4', '#dcfce7', '#ffffff']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            {/* Pfeil führt zurück zum Dashboard ("insights") statt nur back (stack) */}
            <TouchableOpacity onPress={() => router.push('/(tabs)/insights')} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{category} Analyse</Text>
            <View style={{width: 40}} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
            <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={[styles.card, { borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Detaillierte Suchbegriffe</Text>
                
                {isLoading ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <ActivityIndicator color={theme.text} />
                        <Text style={{ marginTop: 10, color: theme.textSecondary }}>Lade Keywords...</Text>
                    </View>
                ) : keywords.length === 0 ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <Ionicons name="search-outline" size={32} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 10 }} />
                        <Text style={{ color: theme.textSecondary }}>Keine Keywords in dieser Kategorie gefunden.</Text>
                    </View>
                ) : (
                    keywords.map((k, i) => (
                        <View key={i} style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: i === keywords.length - 1 ? 0 : 1 }]}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <View style={[styles.rankCircle, { backgroundColor: i < 3 ? '#10B981' : theme.border }]}>
                                    <Text style={{color: '#fff', fontWeight: 'bold'}}>{i + 1}</Text>
                                </View>
                                <Text style={[styles.keywordText, { color: theme.text }]}>{k.text}</Text>
                            </View>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Text style={{color: theme.textSecondary, marginRight: 10}}>{k.count}x</Text>
                                <Ionicons
                                    name={k.trend === 'up' ? 'trending-up' : k.trend === 'down' ? 'trending-down' : 'remove'}
                                    size={18}
                                    color={k.trend === 'up' ? '#10B981' : k.trend === 'down' ? '#EF4444' : theme.textSecondary}
                                />
                            </View>
                        </View>
                    ))
                )}
            </BlurView>

            <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={24} color={theme.textSecondary} />
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                    Diese Daten basieren auf deinen letzten Interaktionen zum Thema "{category}".
                </Text>
            </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rankCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  keywordText: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      backgroundColor: 'rgba(0,0,0,0.03)',
      borderRadius: 12,
  },
  infoText: {
      marginLeft: 10,
      flex: 1,
      fontSize: 12,
  }
});