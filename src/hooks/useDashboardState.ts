import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useStatusManagement } from '@/hooks/useStatusManagement';

export const useDashboardState = () => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'sent' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { orderStatuses } = useStatusManagement();

  const { data: allQuotes, isLoading, isError } = useQuery({
    queryKey: ['user-quotes-and-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*),
          profiles!quotes_user_id_fkey(preferred_display_currency)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const orderStatusNames = useMemo(() => 
    orderStatuses ? orderStatuses.map(status => status.name).filter(name => !['cancelled', 'rejected'].includes(name)) : [], 
    [orderStatuses]
  );

  const quotes = useMemo(() => allQuotes?.filter(q => !orderStatusNames.includes(q.status)) || [], [allQuotes, orderStatusNames]);
  const orders = useMemo(() => allQuotes?.filter(q => orderStatusNames.includes(q.status)) || [], [allQuotes, orderStatusNames]);

  const filteredQuotes = useMemo(() => {
    return quotes
      .filter(quote => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'pending') return quote.status === 'pending';
        if (statusFilter === 'sent') return quote.status === 'sent';
        if (statusFilter === 'approved') return quote.status === 'approved';
        if (statusFilter === 'rejected') return quote.status === 'rejected';
        return true;
      })
      .filter(quote => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        const productNameMatch = quote.product_name?.toLowerCase().includes(searchLower);
        const displayIdMatch = quote.display_id?.toLowerCase().includes(searchLower);
        return productNameMatch || displayIdMatch;
      });
  }, [quotes, statusFilter, searchTerm]);

  const selectableQuotes = useMemo(() => {
    return filteredQuotes.filter(q => q.status === 'approved');
  }, [filteredQuotes]);

  const handleSearchChange = (newSearchTerm: string) => {
    if (newSearchTerm !== searchTerm) {
      setIsSearching(true);
      setSearchTerm(newSearchTerm);
      
      // Simulate search delay for UX
      setTimeout(() => setIsSearching(false), 300);
    }
  };

  const handleSelectQuote = (quoteId: string, checked: boolean) => {
    setSelectedQuoteIds(prev =>
      checked
        ? [...prev, quoteId]
        : prev.filter(id => id !== quoteId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuoteIds(selectableQuotes.map(q => q.id));
    } else {
      setSelectedQuoteIds([]);
    }
  };

  const handleBulkAction = (action: string) => {
    // Implementation will be added later
  };

  const handleToggleSelectQuote = (quoteId: string) => {
    setSelectedQuoteIds(prev =>
      prev.includes(quoteId)
        ? prev.filter(id => id !== quoteId)
        : [...prev, quoteId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedQuoteIds.length === selectableQuotes.length) {
      setSelectedQuoteIds([]);
    } else {
      setSelectedQuoteIds(selectableQuotes.map(q => q.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedQuoteIds([]);
  };

  const filterQuotes = (quote: QuoteWithItems) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return quote.status === 'pending';
    if (statusFilter === 'sent') return quote.status === 'sent';
    if (statusFilter === 'approved') return quote.status === 'approved';
    if (statusFilter === 'rejected') return quote.status === 'rejected';
    return true;
  };

  const getApprovedQuotes = () => {
    return filteredQuotes.filter(q => q.status === 'approved');
  };

  return {
    user,
    statusFilter,
    setStatusFilter,
    searchTerm,
    selectedQuoteIds,
    setSelectedQuoteIds,
    isSearching,
    allQuotes,
    isLoading,
    isError,
    quotes,
    orders,
    filteredQuotes,
    selectableQuotes,
    handleSearchChange,
    handleSelectQuote,
    handleSelectAll,
    handleBulkAction,
    handleToggleSelectQuote,
    handleToggleSelectAll,
    handleClearSelection,
  };
};
