import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatusConfig } from '@/hooks/useStatusManagement';

interface StatusConfigContextType {
  quoteStatuses: StatusConfig[];
  orderStatuses: StatusConfig[];
  isLoading: boolean;
  error: string | null;
}

const StatusConfigContext = createContext<StatusConfigContextType | undefined>(undefined);

const defaultQuoteStatuses: StatusConfig[] = [
  // ... (copy from useStatusManagement or leave empty for now)
];
const defaultOrderStatuses: StatusConfig[] = [
  // ... (copy from useStatusManagement or leave empty for now)
];

export const StatusConfigProvider = ({ children }: { children: ReactNode }) => {
  const [quoteStatuses, setQuoteStatuses] = useState<StatusConfig[]>(defaultQuoteStatuses);
  const [orderStatuses, setOrderStatuses] = useState<StatusConfig[]>(defaultOrderStatuses);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatusSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .in('setting_key', ['quote_statuses', 'order_statuses']);
        if (error) throw error;
        if (data) {
          const quoteSettings = data.find(s => s.setting_key === 'quote_statuses');
          const orderSettings = data.find(s => s.setting_key === 'order_statuses');
          if (quoteSettings?.setting_value) {
            setQuoteStatuses(JSON.parse(quoteSettings.setting_value));
          }
          if (orderSettings?.setting_value) {
            setOrderStatuses(JSON.parse(orderSettings.setting_value));
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load status config');
      } finally {
        setIsLoading(false);
      }
    };
    loadStatusSettings();
  }, []);

  return (
    <StatusConfigContext.Provider value={{ quoteStatuses, orderStatuses, isLoading, error }}>
      {children}
    </StatusConfigContext.Provider>
  );
};

export function useStatusConfig() {
  const ctx = useContext(StatusConfigContext);
  if (!ctx) throw new Error('useStatusConfig must be used within a StatusConfigProvider');
  return ctx;
} 