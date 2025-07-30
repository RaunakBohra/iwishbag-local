import React, { createContext, useContext, useState, useCallback } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

interface LoadingContextType {
  isLoading: (key: string) => boolean;
  isAnyLoading: () => boolean;
  setLoading: (key: string, loading: boolean) => void;
  withLoading: <T>(key: string, promise: Promise<T>) => Promise<T>;
  loadingStates: LoadingState;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(state => state);
  }, [loadingStates]);

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading,
    }));
  }, []);

  const withLoading = useCallback(async <T,>(key: string, promise: Promise<T>): Promise<T> => {
    setLoading(key, true);
    try {
      const result = await promise;
      return result;
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);

  return (
    <LoadingContext.Provider value={{
      isLoading,
      isAnyLoading,
      setLoading,
      withLoading,
      loadingStates,
    }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
}

/**
 * Hook to track multiple loading states
 */
export function useMultipleLoading(keys: string[]): {
  isAnyLoading: boolean;
  loadingStates: Record<string, boolean>;
  allLoaded: boolean;
} {
  const { isLoading } = useLoading();
  
  const loadingStates = keys.reduce((acc, key) => {
    acc[key] = isLoading(key);
    return acc;
  }, {} as Record<string, boolean>);
  
  const isAnyLoading = Object.values(loadingStates).some(state => state);
  const allLoaded = Object.values(loadingStates).every(state => !state);
  
  return {
    isAnyLoading,
    loadingStates,
    allLoaded,
  };
}