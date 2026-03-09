import { supabase } from './supabaseClient';
import { EventResult, EventSearchResponse, searchEvents } from './aiService';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export interface SiLiveRecommendation {
  id: string;
  recommendation_data: EventSearchResponse;
  location_city: string;
  expires_at: string;
}

/**
 * Holt Empfehlungen für den User.
 * 1. Prüft Cache (silive_recommendations).
 * 2. Wenn Cache leer/alt: Generiert neue Empfehlungen via AI Search (statt raw Places API).
 */
export const getSiLiveRecommendations = async (userId: string, city: string, forceRefresh: boolean = false): Promise<EventSearchResponse> => {
  if (!city) return { zone50: [], zone200: [] };

  try {
    // 1. Check Cache (nur wenn kein forceRefresh)
    if (!forceRefresh) {
      const { data: cachedData, error: cacheError } = await supabase
        .from('silive_recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('location_city', city)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (cachedData) {
        console.log('Using cached SiLive recommendations');
        // Typ-Check: Prüfen ob das alte Format oder neue Format vorliegt
        const data = cachedData.recommendation_data;
        if (Array.isArray(data)) {
           // Migration on the fly (Altes Format -> Neues Format)
           // Wir packen einfach alles in Zone 50 als Fallback
           return { zone50: data as EventResult[], zone200: [] };
        }
        return data as EventSearchResponse;
      }
    }

    // 2. Generate New
    console.log('Generating new SiLive recommendations...');
    const interests = await getUserInterests(userId);
    const topKeywords = await getTopKeywords(userId);
    
    // AI Search mit vollem Nutzerprofil ausführen
    // Wir übergeben Interessen und Keywords strikt getrennt, damit die KI präzise suchen kann.
    const recommendations = await searchEvents({ interests, keywords: topKeywords }, city);

    // 3. Cache Result (3 Tage)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    const { error: saveError } = await supabase
      .from('silive_recommendations')
      .upsert({
        user_id: userId,
        location_city: city,
        recommendation_data: recommendations,
        generated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'user_id,location_city' });

    if (saveError) console.error('Error caching recommendations:', saveError);

    return recommendations;
  } catch (error) {
    console.error('Error in getSiLiveRecommendations:', error);
    return { zone50: [], zone200: [] };
  }
};

const getUserInterests = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('user_interests')
    .select('interest_category')
    .eq('user_id', userId)
    .order('confidence_score', { ascending: false })
    .limit(10);

  if (error || !data) return ['Events', 'Kultur', 'Freizeit']; // Default fallback
  
  const interests = data.map(d => d.interest_category);
  return interests.length > 0 ? interests : ['Events', 'Kultur', 'Freizeit'];
};

const getTopKeywords = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('extracted_keywords')
    .select('keyword')
    .eq('user_id', userId)
    .order('frequency', { ascending: false })
    .limit(15); // Top 15 Keywords

  if (error || !data) return [];
  return data.map(d => d.keyword);
};

export const trackSiLiveInteraction = async (userId: string, actionType: 'open_tab' | 'view_event' | 'click_promo' | 'manual_refresh' | 'auto_load', eventCategory?: string, city?: string) => {
    try {
        await supabase.from('silive_interactions').insert({
            user_id: userId,
            action_type: actionType,
            event_category: eventCategory,
            location_city: city
        });
    } catch (e) {
        console.warn('Tracking failed', e);
    }
};
