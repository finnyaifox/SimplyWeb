import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { useURL } from 'expo-linking';
import { AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';

// WebBrowser warm-up for Android
WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const linkedUrl = useURL();

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('user_id', userId)
        .single();
      
      if (data) {
        setIsAdmin(data.is_admin || false);
      }
    } catch (e) {
      console.log('Error checking admin status', e);
    }
  };

  const upsertUserProfile = async (user: User, additionalData?: { city?: string; country?: string }) => {
    try {
      const updates = {
        user_id: user.id,
        email: user.email,
        updated_at: new Date().toISOString(),
        ...additionalData,
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(updates, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  // Expo Router URL Monitoring
  useEffect(() => {
    if (linkedUrl) {
      console.log('🚀 Expo Router detected URL:', linkedUrl);
      handleDeepLink({ url: linkedUrl }, 'listener');
    }
  }, [linkedUrl]);

  // Deep Link Handling Logic
  const handleDeepLink = async (event: { url: string }, source: 'initial' | 'listener' = 'listener') => {
    // Logge die rohe URL sofort, um zu sehen, ob Daten ankommen
    if (source === 'initial') {
        console.log('🔥 Initial Raw Deep Link URL:', event.url);
    } else {
        console.log('👂 Event Listener URL received:', event.url);
    }
    
    try {
        // Manuelles Parsing mit Regex als Sicherheitsnetz
        // Dies fängt sowohl Query- (?) als auch Hash- (#) Parameter ab
        const extractParams = (url: string) => {
            const params: Record<string, string> = {};
            // Regex fängt alles nach ? oder # oder & ab, das dem Muster key=value folgt
            const regex = /[?&#]([^=#]+)=([^&#]*)/g;
            let match;
            while ((match = regex.exec(url))) {
                const key = match[1];
                const value = match[2];
                params[key] = decodeURIComponent(value);
            }
            return params;
        };

        const allParams = extractParams(event.url);

        // Debug Log aller gefundenen Parameter
        console.log('🔍 Parsed Params (Regex):', JSON.stringify(allParams, null, 2));

        // 1. Check for Auth Code (PKCE Flow) - Priorität für Sicherheit
        const code = allParams['code'];
        if (code) {
              console.log('✅ Auth Code found. Exchanging for session...');
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              
              if (error) {
                  console.error('❌ Error exchanging code:', error);
              } else {
                  console.log('✅ Code exchange successful.');
                  if (data.session) {
                    setSession(data.session);
                    setUser(data.session.user);
                  }
                  return;
              }
        }

        // 2. Check for Access Token (Implicit Flow / Magic Link fallback)
        const accessToken = allParams['access_token'];
        const refreshToken = allParams['refresh_token'];

        if (accessToken && refreshToken) {
            console.log('✅ Tokens found. Setting session manually...');
            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });
            
            if (error) {
                  console.error('❌ Error setting session manually:', error);
            } else {
                  console.log('✅ Session set successfully manually.');
                  return;
            }
        }

        // 3. Fallback: Force Session Refresh
        console.log('ℹ️ No direct tokens/code processed. Trying getSession()...');
        const { data, error } = await supabase.auth.getSession();
        if (data.session) {
            console.log('✅ Session found via getSession().');
            setSession(data.session);
            setUser(data.session.user);
        } else {
            console.log('⚠️ No session found via getSession().');
        }

    } catch (err) {
        console.error('❌ Error in handleDeepLink:', err);
    }
  };

  useEffect(() => {
    // Check active session securely
    const initializeAuth = async () => {
        try {
            // 1. Get Session from local storage
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
            if (sessionError || !session) {
               console.log('No session found during init.');
               setSession(null);
               setUser(null);
               setIsLoading(false);
               return;
            }
    
            // 2. VALIDATE Session with Server via getUser()
            // This fails if the token is revoked or expired on server side,
            // even if local storage thinks it's valid.
            const { data: { user }, error: userError } = await supabase.auth.getUser();
    
            if (userError || !user) {
              console.warn('⚠️ Session found but invalid on server (getUser failed). Logging out.', userError);
              // Explicitly sign out to clear bad tokens
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
            } else {
              // Session is valid
              // Note: We use the session from getSession but validate it via getUser.
              // Ideally getUser returns the fresh user object.
              setSession(session);
              setUser(user);
              checkAdminStatus(user.id);
            }
    
        } catch (e) {
            console.error('❌ Unexpected error during Auth Init:', e);
            setSession(null);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`📣 Auth State Change: ${event}`, session?.user?.email ? `User: ${session.user.email}` : 'No User');
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await upsertUserProfile(session.user);
        await checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    
    const subscriptionURL = Linking.addEventListener('url', (event) => handleDeepLink(event, 'listener'));

    // Check if app was opened by deep link
    Linking.getInitialURL().then((url) => {
        if (url) handleDeepLink({ url }, 'initial');
    });

    // AppState Listener Workaround
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 AppState changed to active. Checking for initial URL again...');
        Linking.getInitialURL().then((url) => {
           if (url) {
               console.log('🔄 Re-checked Initial URL on AppState active:', url);
               handleDeepLink({ url }, 'initial');
           }
        });
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
        subscription.unsubscribe();
        subscriptionURL.remove();
        appStateSubscription.remove();
    };
  }, []);


  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      // Bestimme Redirect URL dynamisch
      const redirectUrl = AuthSession.makeRedirectUri();

      console.log('--------------------------------------------------');
      console.log('🔐 Auth Debugging:');
      console.log('Generated Redirect URL:', redirectUrl);
      console.log('Is Expo Go:', Constants.appOwnership === 'expo');
      
      if (redirectUrl.includes('localhost') || redirectUrl.includes('127.0.0.1')) {
          console.warn('⚠️ Redirect URL zeigt auf localhost. Dies kann auf echten Geräten Probleme verursachen.');
      }
      console.log('--------------------------------------------------');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('❌ Supabase signInWithOAuth Error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('🔗 Opening WebBrowser with URL:', data.url);
        const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUrl,
            { showInRecents: true }
        );

        console.log('🌏 WebBrowser Result:', JSON.stringify(result, null, 2));

        if (result.type === 'success' && result.url) {
            console.log('✅ WebBrowser returned success. URL:', result.url);
            // Manuelle Verarbeitung der zurückgegebenen URL, da WebBrowser den Redirect abfängt
            // und wir sicherstellen wollen, dass die Parameter (code/token) verarbeitet werden.
            await handleDeepLink({ url: result.url }, 'listener');
        } else {
             console.log('⚠️ WebBrowser did not return success or URL missing. Type:', result.type);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    console.log('🚪 AuthContext: signOut called');
    
    // 1. Radikaler lokaler Logout ZUERST
    // Wir löschen den State sofort, damit die UI reagiert, egal was der Server sagt.
    try {
        setIsLoading(true);
        console.log('🧹 Clearing local session state immediately...');
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        
        // 2. Dann Versuch, den Server zu informieren (Best Effort)
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('❌ Supabase signOut error (server-side):', error);
        } else {
            console.log('✅ Supabase signOut successful (server-side)');
        }
    } catch (error) {
        console.error('❌ Unexpected logout error:', error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signInWithGoogle, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};