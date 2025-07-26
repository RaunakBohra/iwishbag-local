import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAnonymous: boolean;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  convertAnonymousToRegistered: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is anonymous (has auth but not in profiles table)
  const isAnonymous = Boolean(user && user.is_anonymous);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // First, try to get existing session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          if (session) {
            // User has existing session (authenticated or anonymous)
            setSession(session);
            setUser(session.user);

            // Log authentication context for debugging
            logger.debug(
              'Session found',
              {
                userId: session.user.id,
                isAnonymous: session.user.is_anonymous,
                email: session.user.email,
              },
              'Auth',
            );
          } else {
            // No session exists, create anonymous session only for non-admin routes
            const isAdminRoute = window.location.pathname.startsWith('/admin');
            if (!isAdminRoute) {
              await signInAnonymously();
            }
          }
        }
      } catch (error) {
        logger.error('Error initializing auth', error, 'Auth');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const signInAnonymously = async () => {
      try {
        const { data, error } = await supabase.auth.signInAnonymously();

        if (error) {
          // If anonymous sign-ins are disabled, just continue without auth
          if (error.message?.includes('Anonymous sign-ins are disabled')) {
            logger.warn('Anonymous sign-ins are disabled, continuing without auth', null, 'Auth');
            return;
          }
          // If captcha verification fails, continue without auth
          if (error.message?.includes('captcha') || error.message?.includes('verification')) {
            logger.warn('Captcha verification not supported for anonymous auth, continuing without auth', null, 'Auth');
            return;
          }
          logger.error('Error signing in anonymously', error, 'Auth');
          return;
        }

        if (mounted && data.session) {
          setSession(data.session);
          setUser(data.user);
          logger.debug('Anonymous user signed in', { userId: data.user.id }, 'Auth');
        }
      } catch (error) {
        logger.error('Error in anonymous sign in', error, 'Auth');
      }
    };

    initializeAuth();

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          // Log auth state changes for debugging
          logger.debug(
            'Auth state changed',
            { event, userId: session?.user?.id, isAnonymous: session?.user?.is_anonymous },
            'Auth',
          );
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch (error) {
      logger.error('Error setting up auth state change listener', error, 'Auth');
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
  }, []);

  const signInAnonymously = async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        // If anonymous sign-ins are disabled, just continue without auth
        if (error.message?.includes('Anonymous sign-ins are disabled')) {
          logger.warn('Anonymous sign-ins are disabled, continuing without auth', null, 'Auth');
          return;
        }
        logger.error('Error signing in anonymously', error, 'Auth');
        throw error;
      }

      logger.debug('Anonymous user signed in successfully', { userId: data.user?.id }, 'Auth');
      return;
    } catch (error) {
      logger.error('Error in signInAnonymously', error, 'Auth');
      throw error;
    }
  };

  const convertAnonymousToRegistered = async (email: string, password: string) => {
    try {
      if (!user || !user.is_anonymous) {
        return { success: false, error: 'User is not anonymous or not signed in' };
      }

      // Convert anonymous user to registered user
      const { data, error } = await supabase.auth.updateUser({
        email,
        password,
      });

      if (error) {
        logger.error('Error converting anonymous user', error, 'Auth');
        return { success: false, error: error.message };
      }

      // Create profile for the newly registered user
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          email: email,
          referral_code: 'REF' + Math.random().toString(36).substr(2, 8).toUpperCase(),
        });

        if (profileError) {
          logger.error('Error creating profile after conversion', profileError, 'Auth');
          // Don't fail the whole operation, profile can be created later
        }

        // Create user role
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: 'user',
          created_by: data.user.id,
        });
      }

      logger.debug('Anonymous user converted to registered', { userId: data.user?.id }, 'Auth');
      return { success: true };
    } catch (error) {
      logger.error('Error in convertAnonymousToRegistered', error, 'Auth');
      return { success: false, error: 'Failed to convert anonymous user' };
    }
  };

  const signOut = async () => {
    try {
      // For anonymous users, don't clear everything - just sign in anonymously again
      if (user?.is_anonymous) {
        await signInAnonymously();
        return;
      }

      // For registered users, do full sign out
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear auth state
      setSession(null);
      setUser(null);

      // Clear stored data (but keep some for UX)
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-htycplcuyoqfukhrughf-auth-token');

      // Sign in anonymously for continued browsing
      await signInAnonymously();
    } catch (error) {
      logger.error('Error signing out', error, 'Auth');
      // Fallback: just try to sign in anonymously
      try {
        await signInAnonymously();
      } catch (fallbackError) {
        logger.error('Error in fallback anonymous sign in', fallbackError, 'Auth');
      }
      throw error;
    }
  };

  const value = {
    session,
    user,
    isAnonymous,
    signOut,
    signInAnonymously,
    convertAnonymousToRegistered,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
