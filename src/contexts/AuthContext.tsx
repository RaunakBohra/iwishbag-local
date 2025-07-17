import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        logger.error('Error getting session', error, 'Auth');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
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

  const signOut = async () => {
    try {
      // First, sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear all auth state
      setSession(null);
      setUser(null);

      // Clear all stored data
      localStorage.clear(); // Clear all localStorage
      sessionStorage.clear(); // Clear all sessionStorage

      // Clear any Supabase specific storage
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-htycplcuyoqfukhrughf-auth-token');

      // Clear any cached data
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        } catch (e) {
          logger.error('Error clearing cache', e, 'Auth');
        }
      }

      // Force a complete page reload
      window.location.href = '/';
    } catch (error) {
      logger.error('Error signing out', error, 'Auth');
      // Even if there's an error, try to clear everything
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
      throw error;
    }
  };

  const value = {
    session,
    user,
    signOut,
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
