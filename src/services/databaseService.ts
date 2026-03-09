import { supabase } from './supabaseClient';

export interface ChatAnalyticsRecord {
  user_id: string;
  session_id: string;
  sentiment_positive_count: number;
  sentiment_negative_count: number;
  sentiment_neutral_count: number;
  total_messages_count: number;
  avg_message_length: number;
  session_duration_seconds: number;
  detailed_sentiment?: string; // Neu
  dynamic_reminder?: string; // Neu
  dynamic_recommendation?: string; // Neu
}

export interface ExtractedKeywordRecord {
  user_id: string;
  keyword: string;
  context_category: string;
  frequency?: number;
}

export interface UserInterestRecord {
  user_id: string;
  interest_category: string;
  confidence_score: number;
}

/**
 * Saves chat session analytics.
 */
const DEBUG_DB_VERIFY = process.env.EXPO_PUBLIC_DEBUG_DB_VERIFY === 'true';

function logSupabaseError(context: string, error: any, meta?: Record<string, any>) {
  // Sicherstellen, dass error ein Objekt ist, auch wenn es null/undefined kommt
  const errObj = error || {};
  
  const payload = {
    message: errObj.message || 'Keine Fehlermeldung',
    details: errObj.details || null,
    hint: errObj.hint || null,
    code: errObj.code || null,
    ...meta,
  };
  
  try {
    console.error(`[DB] ❌ ${context}`, JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error(`[DB] ❌ ${context} (Stringify failed)`, payload);
  }
}

export const saveChatAnalytics = async (data: ChatAnalyticsRecord) => {
  console.log(`[DB] 🔵 Versuche Chat Analytics zu speichern... UserID: ${data.user_id}, SessionID: ${data.session_id}`);
  
  if (!data.user_id) {
    console.error('[DB] ❌ saveChatAnalytics abgebrochen: user_id fehlt!');
    return;
  }

  try {
    // 1. Existierenden Eintrag laden um Werte zu inkrementieren (Read-Modify-Write)
    const { data: existing, error: fetchError } = await supabase
        .from('chat_analytics')
        .select('*')
        .eq('user_id', data.user_id)
        .eq('session_id', data.session_id)
        .maybeSingle();

    if (fetchError) {
         // Logge spezifischen Fehlercode für besseres Debugging
         logSupabaseError('Error fetching existing session', fetchError, { user_id: data.user_id, session_id: data.session_id });
         // Wir machen weiter und versuchen den Insert (upsert), da der Fetch-Fehler temporär sein könnte
    } else if (existing) {
         console.log(`[DB] ℹ️ Session gefunden (ID: ${existing.id}), aggregiere Daten...`);
    } else {
         console.log(`[DB] ℹ️ Neue Session, erstelle Eintrag...`);
    }

    // 2. Werte aggregieren
    const recordToSave = existing ? {
        ...existing,
        sentiment_positive_count: (existing.sentiment_positive_count || 0) + data.sentiment_positive_count,
        sentiment_negative_count: (existing.sentiment_negative_count || 0) + data.sentiment_negative_count,
        sentiment_neutral_count: (existing.sentiment_neutral_count || 0) + data.sentiment_neutral_count,
        total_messages_count: (existing.total_messages_count || 0) + data.total_messages_count,
        session_duration_seconds: (existing.session_duration_seconds || 0) + data.session_duration_seconds,
        detailed_sentiment: data.detailed_sentiment || existing.detailed_sentiment,
        dynamic_reminder: data.dynamic_reminder || existing.dynamic_reminder,
        dynamic_recommendation: data.dynamic_recommendation || existing.dynamic_recommendation,
    } : data;

    // Da session_id pro Hook-Instanz (App-Start) gleich bleibt, nutzen wir upsert mit den aggregierten Daten
    const { error } = await supabase
      .from('chat_analytics')
      .upsert([recordToSave], { onConflict: 'user_id,session_id' });

    if (error) {
      logSupabaseError('saveChatAnalytics upsert failed', error, {
        table: 'chat_analytics',
        user_id: data.user_id,
        session_id: data.session_id,
      });
      return;
    }

    if (DEBUG_DB_VERIFY) {
      const { data: verify, error: verifyError } = await supabase
        .from('chat_analytics')
        .select('user_id,session_id')
        .eq('user_id', data.user_id)
        .eq('session_id', data.session_id)
        .maybeSingle();

      if (verifyError) {
        logSupabaseError('saveChatAnalytics verify select failed', verifyError, {
          table: 'chat_analytics',
          user_id: data.user_id,
          session_id: data.session_id,
        });
      } else {
        console.log('[DB] ✅ saveChatAnalytics verified', verify);
      }
    }
  } catch (error) {
    console.error('[DB] ❌ saveChatAnalytics unexpected error', error);
  }
};

/**
 * Helper to normalize keywords (Title Case)
 */
function toTitleCase(str: string) {
    return str.replace(
        /\w\S*/g,
        text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
}

/**
 * Upserts extracted keywords.
 * Increments frequency if keyword exists for user.
 */
export const upsertKeywords = async (userId: string, keywords: { keyword: string; context_category: string }[]) => {
  console.log(`[DB] 🔵 Versuche Keywords zu speichern... UserID: ${userId}, Anzahl: ${keywords.length}`);

  if (!userId) {
    console.error('[DB] ❌ upsertKeywords: missing userId');
    return;
  }
  if (keywords.length === 0) {
    console.log('[DB] ⚠️ Keine Keywords zum Speichern.');
    return;
  }

  try {
    // Sequentielle Verarbeitung um Frequenzen korrekt zu erhöhen
    for (const k of keywords) {
        let rawKeyword = (k.keyword || '').trim();
        if (!rawKeyword) continue;

        // Normalisierung: Title Case für Konsistenz (Tennis == tennis)
        const cleanKeyword = toTitleCase(rawKeyword);

        // 1. Check if keyword exists (using normalized keyword)
        const { data: existing, error: fetchError } = await supabase
            .from('extracted_keywords')
            .select('frequency')
            .eq('user_id', userId)
            .eq('keyword', cleanKeyword)
            .maybeSingle();
        
        if (fetchError) {
            logSupabaseError(`Error checking keyword "${cleanKeyword}"`, fetchError, { userId });
        }

        // 2. Calculate new frequency
        const newFrequency = (existing?.frequency || 0) + 1;

        const record = {
            user_id: userId,
            keyword: cleanKeyword,
            context_category: (k.context_category || '').trim() || 'Allgemein',
            frequency: newFrequency,
            last_seen: new Date().toISOString(),
        };

        // 3. Upsert with new frequency
        const { error } = await supabase
            .from('extracted_keywords')
            .upsert(record, { onConflict: 'user_id,keyword' });

        if (error) {
            logSupabaseError(`Error upserting keyword "${cleanKeyword}"`, error, { record });
        } else {
            console.log(`[DB] ✅ Keyword "${cleanKeyword}" saved. New Freq: ${newFrequency}`);
        }
    }
  } catch (error) {
    console.error('[DB] ❌ upsertKeywords unexpected error', error);
  }
};

/**
 * Upserts user interests.
 */
export const upsertUserInterests = async (userId: string, interests: { interest_category: string; confidence_score: number }[]) => {
  if (!userId) {
    console.error('[DB] ❌ upsertUserInterests: missing userId');
    return;
  }
  if (interests.length === 0) return;

  try {
    const records = interests
      .map(i => ({
        user_id: userId,
        interest_category: (i.interest_category || '').trim() || 'Personal',
        // confidence_score numeric(3,2) in DB means max 9.99, usually 0.00 to 1.00
        confidence_score: typeof i.confidence_score === 'number' ? parseFloat(i.confidence_score.toFixed(2)) : 0.1,
        last_updated: new Date().toISOString(),
      }))
      .filter(r => r.interest_category.length > 0);

    if (records.length === 0) return;

    for (const record of records) {
      const { error } = await supabase
        .from('user_interests')
        .upsert(record, { onConflict: 'user_id,interest_category' });

      if (error) {
        logSupabaseError(`upsertUserInterests failed for category: ${record.interest_category}`, error, {
          table: 'user_interests',
          user_id: userId,
          record
        });
      } else {
        console.log(`[DB] ✅ Interest "${record.interest_category}" updated.`);
      }
    }

    if (DEBUG_DB_VERIFY) {
      const { data: verify, error: verifyError } = await supabase
        .from('user_interests')
        .select('interest_category,confidence_score,last_updated')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false })
        .limit(Math.min(10, records.length));

      if (verifyError) {
        logSupabaseError('upsertUserInterests verify select failed', verifyError, {
          table: 'user_interests',
          user_id: userId,
        });
      } else {
        console.log('[DB] ✅ upsertUserInterests verified (latest)', verify);
      }
    }
  } catch (error) {
    console.error('[DB] ❌ upsertUserInterests unexpected error', error);
  }
};

/**
 * DEPRECATED: Old methods for backward compatibility if needed temporarily,
 * but should be replaced by new logic.
 */
export const saveInsight = async (insight: any) => {
  console.warn('saveInsight is deprecated. Use saveChatAnalytics/upsertKeywords instead.');
};

export const deleteAllInsights = async (userId: string): Promise<boolean> => {
    console.log(`[DB] 🔴 Versuche ALLE Insights zu löschen für UserID: ${userId}`);

    if (!userId) {
        console.error('[DB] ❌ deleteAllInsights abgebrochen: user_id fehlt!');
        return false;
    }

    try {
        // Wir löschen alle Tabellen, die Insights enthalten.
        // Reihenfolge ist hier nicht kritisch, da wir keine Foreign Key Constraints verletzen sollten,
        // wenn wir direkt die Datensätze löschen (ON DELETE CASCADE würde beim Löschen des Users greifen,
        // aber hier löschen wir nur die Daten, nicht den User).
        
        const tablesToDelete = [
            'chat_analytics',
            'extracted_keywords',
            'user_interests',
            'silive_interactions',
            'silive_recommendations'
        ];

        let allSuccess = true;

        for (const table of tablesToDelete) {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('user_id', userId);
            
            if (error) {
                console.error(`[DB] ❌ Fehler beim Löschen aus ${table}:`, error);
                allSuccess = false;
            } else {
                console.log(`[DB] ✅ Daten aus ${table} gelöscht.`);
            }
        }

        return allSuccess;
    } catch (error) {
        console.error('[DB] ❌ deleteAllInsights unexpected error', error);
        return false;
    }
};

export interface DashboardData {
    pieData: {
        name: string;
        population: number;
        color: string;
        legendFontColor: string;
        legendFontSize: number;
    }[];
    recentKeywords: {
        icon: string;
        lib: string;
        text: string;
    }[];
    topKeywords: {
        text: string;
        count: number;
        percentage: number;
    }[];
    barData: {
        labels: string[];
        datasets: {
            data: number[];
        }[];
    };
    sentimentStats: {
        positive: number;
        neutral: number;
        negative: number;
        total: number;
        detailed_sentiment?: string; // Neu
        dynamic_reminder?: string; // Neu
        dynamic_recommendation?: string; // Neu
    };
    heatmapData?: number[][]; // 7 days x 24h or similar
}

export const getDashboardData = async (): Promise<DashboardData | null> => {
    // Legacy fallback, will be replaced by getRealDashboardData call in UI
    return null;
};

// Simple In-Memory Cache um Ladezeiten beim Tab-Wechsel zu eliminieren
let dashboardCache: { [userId: string]: { data: DashboardData; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten

export const getRealDashboardData = async (userId: string, forceRefresh = false): Promise<DashboardData> => {
    // 1. Check Cache
    const cached = dashboardCache[userId];
    const now = Date.now();
    if (!forceRefresh && cached && (now - cached.timestamp < CACHE_DURATION)) {
        console.log(`[DB] ⚡ Using cached dashboard data for ${userId}`);
        return cached.data;
    }

    try {
        console.log('Fetching dashboard data for user:', userId);
        
        // Parallel Fetching für bessere Performance
        const [keywordsResponse, analyticsResponse] = await Promise.all([
            supabase
                .from('extracted_keywords')
                .select('*')
                .eq('user_id', userId)
                .order('frequency', { ascending: false }),
            supabase
                .from('chat_analytics')
                .select('sentiment_positive_count, sentiment_neutral_count, sentiment_negative_count, detailed_sentiment, dynamic_reminder, dynamic_recommendation')
                .eq('user_id', userId)
                .order('created_at', { ascending: false }) // Neueste zuerst für Reminder
        ]);

        const keywordData = keywordsResponse.data;
        const kwError = keywordsResponse.error;
        const analyticsData = analyticsResponse.data;

        if (kwError) {
            console.error('Dashboard Fetch Error (Keywords):', kwError);
            throw new Error(kwError.message || 'Error fetching keywords');
        }

        if (analyticsResponse.error) {
            console.error('Dashboard Fetch Error (Analytics):', analyticsResponse.error);
             throw new Error(analyticsResponse.error.message || 'Error fetching analytics');
        }

        // Sort for Recent (by last_seen locally since we fetched by frequency)
        const sortedByTime = [...(keywordData || [])].sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());

        // Aggregate for Pie Chart (Categories)
        const categoryCounts: { [key: string]: number } = {};
        const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#EC4899', '#6366F1'];
        
        // Aggregate Categories
        (keywordData || []).forEach(k => {
            const cat = k.context_category || 'Sonstiges';
            // Wir nutzen hier die frequency wenn vorhanden, sonst fallback auf 1
            const count = k.frequency || 1;
            categoryCounts[cat] = (categoryCounts[cat] || 0) + count;
        });

        const pieData = Object.keys(categoryCounts).map((cat, index) => ({
            name: cat,
            population: categoryCounts[cat],
            color: colors[index % colors.length],
            legendFontColor: '#7F7F7F',
            legendFontSize: 10
        })).sort((a, b) => b.population - a.population).slice(0, 5); // Top 5 categories

        // If no data, return empty structure (UI handles 0 values)
        if (pieData.length === 0) {
             // Return structure with 0 values so UI renders "empty" state instead of crashing or showing demo data unexpectedly
             // However, caller handles fallback if we return empty.
             // We return empty arrays, UI checks length.
        }

        // Recent Keywords List (Top 8 most recent)
        // We use 'last_seen' desc already
        const recentKeywords = sortedByTime.slice(0, 8).map(k => ({
            icon: k.context_category, // Wird im Frontend durch Helper in Icon umgewandelt
            lib: 'Ionicons',
            text: k.keyword,
            context_category: k.context_category // Wichtig für Icon Helper im Frontend
        }));

        // Top 15 Keywords for "Weitere Insights"
        // Calculate Total Frequency for percentage
        const totalFrequency = (keywordData || []).reduce((sum, item) => sum + (item.frequency || 1), 0);
        
        const topKeywords = (keywordData || []).slice(0, 15).map(k => ({
            text: k.keyword,
            count: k.frequency || 1,
            percentage: totalFrequency > 0 ? Math.round(((k.frequency || 1) / totalFrequency) * 100) : 0
        }));

        // Bar Data (Top Keywords frequency - simplistic approach: count keyword occurrences if duplicate rows existed,
        // but currently we upsert unique keywords per user.
        // So Bar Chart might be better visualizing "Confidence Scores" from user_interests or just count of keywords in categories?
        // Let's use Category Counts again for Bar Chart or maybe specific "Hot Topics" if we had frequency.
        // For now: Top Categories by count (same as Pie but different viz)
        const barLabels = pieData.map(p => p.name).slice(0, 4);
        const barValues = pieData.map(p => p.population).slice(0, 4);
        
        // Normalize values to 100% scale for the chart logic if needed, or raw.
        // The UI mock uses values like 90, 65. Let's map to relative percentage of max.
        const maxVal = Math.max(...barValues, 1);
        const normalizedBarValues = barValues.map(v => Math.round((v / maxVal) * 100));

        const barData = {
            labels: barLabels.length ? barLabels : ["Keine Daten"],
            datasets: [{ data: barLabels.length ? normalizedBarValues : [0] }]
        };

        // 2. Sentiment Stats (bereits gefetcht in Promise.all)
        let pos = 0, neu = 0, neg = 0;
        let lastDetailed = "Neutral"; // Default
        let lastReminder = "";
        let lastRecommendation = "";

        (analyticsData || []).forEach((row, index) => {
            pos += row.sentiment_positive_count || 0;
            neu += row.sentiment_neutral_count || 0;
            neg += row.sentiment_negative_count || 0;
            
            // Da wir nach created_at desc sortiert haben, ist der erste Eintrag der aktuellste
            if (index === 0) {
                if (row.detailed_sentiment) lastDetailed = row.detailed_sentiment;
                if (row.dynamic_reminder) lastReminder = row.dynamic_reminder;
                if (row.dynamic_recommendation) lastRecommendation = row.dynamic_recommendation;
            } else {
                // Falls der aktuellste Eintrag keine Felder hat, nehmen wir die nächstbesten
                if (!lastDetailed && row.detailed_sentiment) lastDetailed = row.detailed_sentiment;
                if (!lastReminder && row.dynamic_reminder) lastReminder = row.dynamic_reminder;
                if (!lastRecommendation && row.dynamic_recommendation) lastRecommendation = row.dynamic_recommendation;
            }
        });
        const totalSentiment = pos + neu + neg;
        
        const sentimentStats = {
            positive: pos,
            neutral: neu,
            negative: neg,
            total: totalSentiment,
            detailed_sentiment: lastDetailed,
            dynamic_reminder: lastReminder,
            dynamic_recommendation: lastRecommendation
        };

        const result: DashboardData = {
            pieData,
            recentKeywords,
            topKeywords,
            barData,
            sentimentStats
        };

        // Cache aktualisieren
        dashboardCache[userId] = {
            data: result,
            timestamp: Date.now()
        };

        return result;

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Rethrow error to let UI handle it (e.g. stop loading spinner)
        throw error;
    }
};

export const getKeywordsByCategory = async (userId: string, category: string) => {
    try {
        let query = supabase
            .from('extracted_keywords')
            .select('*')
            .eq('user_id', userId)
            .order('frequency', { ascending: false });

        // Wenn nicht "All", dann filtern
        if (category && category !== 'All' && category !== 'Details') {
            query = query.eq('context_category', category);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching keywords by category:', error);
            return [];
        }

        return (data || []).map(k => ({
            text: k.keyword,
            count: k.frequency,
            // Trend ist hier simuliert, da wir keine History der Frequenz haben.
            // Man könnte 'last_seen' nutzen: wenn < 24h -> 'up'.
            trend: (new Date(k.last_seen).getTime() > Date.now() - 86400000) ? 'up' : 'stable'
        }));
    } catch (e) {
        console.error('getKeywordsByCategory crash', e);
        return [];
    }
}