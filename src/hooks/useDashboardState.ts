import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useStatusManagement } from '@/hooks/useStatusManagement';

export const useDashboardState = () => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all'); // Dynamic - can be any status
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const {
    orderStatuses,
    quoteStatuses,
    getStatusesForOrdersList,
    getStatusesForQuotesList,
    getStatusConfig,
  } = useStatusManagement();

  const {
    data: allQuotes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['user-quotes-and-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('quotes')
        .select(
          `
          *,
          quote_items (*),
          profiles!quotes_user_id_fkey(preferred_display_currency)
        `,
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Use dynamic status configuration to separate quotes from orders
  const orderStatusNames = useMemo(() => {
    const dynamicStatuses = getStatusesForOrdersList();
    // FALLBACK: If dynamic statuses aren't loaded yet, use legacy logic
    if (dynamicStatuses.length === 0) {
      return ['paid', 'ordered', 'shipped', 'completed', 'payment_pending', 'processing'];
    }
    return dynamicStatuses;
  }, [getStatusesForOrdersList]);

  const quoteStatusNames = useMemo(() => {
    const dynamicStatuses = getStatusesForQuotesList();
    // FALLBACK: If dynamic statuses aren't loaded yet, use legacy logic
    if (dynamicStatuses.length === 0) {
      return ['pending', 'sent', 'approved', 'rejected', 'expired', 'calculated'];
    }
    return dynamicStatuses;
  }, [getStatusesForQuotesList]);

  const quotes = useMemo(
    () => allQuotes?.filter((q) => quoteStatusNames.includes(q.status)) || [],
    [allQuotes, quoteStatusNames],
  );

  const orders = useMemo(
    () => allQuotes?.filter((q) => orderStatusNames.includes(q.status)) || [],
    [allQuotes, orderStatusNames],
  );

  const filteredQuotes = useMemo(() => {
    return quotes
      .filter((quote) => {
        // DYNAMIC: Filter by any status instead of hardcoded list
        if (statusFilter === 'all') return true;
        return quote.status === statusFilter;
      })
      .filter((quote) => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        const productNameMatch = quote.product_name?.toLowerCase().includes(searchLower);
        const displayIdMatch = quote.display_id?.toLowerCase().includes(searchLower);
        return productNameMatch || displayIdMatch;
      });
  }, [quotes, statusFilter, searchTerm]);

  // DYNAMIC: Get quotes that allow cart actions based on status configuration
  const selectableQuotes = useMemo(() => {
    return filteredQuotes.filter((q) => {
      const statusConfig = getStatusConfig(q.status, 'quote');
      return statusConfig?.allowCartActions ?? q.status === 'approved'; // fallback
    });
  }, [filteredQuotes, getStatusConfig]);

  const handleSearchChange = (newSearchTerm: string) => {
    if (newSearchTerm !== searchTerm) {
      setIsSearching(true);
      setSearchTerm(newSearchTerm);

      // Simulate search delay for UX
      setTimeout(() => setIsSearching(false), 300);
    }
  };

  const handleSelectQuote = (quoteId: string, checked: boolean) => {
    setSelectedQuoteIds((prev) =>
      checked ? [...prev, quoteId] : prev.filter((id) => id !== quoteId),
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuoteIds(selectableQuotes.map((q) => q.id));
    } else {
      setSelectedQuoteIds([]);
    }
  };

  const handleBulkAction = (action: string) => {
    // Implementation will be added later
  };

  const handleToggleSelectQuote = (quoteId: string) => {
    setSelectedQuoteIds((prev) =>
      prev.includes(quoteId) ? prev.filter((id) => id !== quoteId) : [...prev, quoteId],
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedQuoteIds.length === selectableQuotes.length) {
      setSelectedQuoteIds([]);
    } else {
      setSelectedQuoteIds(selectableQuotes.map((q) => q.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedQuoteIds([]);
  };

  // DYNAMIC: Get quotes that allow specific actions based on configuration
  const getSelectableQuotes = () => selectableQuotes;

  const getQuotesByAction = (action: 'edit' | 'approve' | 'cart' | 'reject' | 'cancel') => {
    return filteredQuotes.filter((q) => {
      const statusConfig = getStatusConfig(q.status, 'quote');
      switch (action) {
        case 'edit':
          return statusConfig?.allowEdit ?? false;
        case 'approve':
          return statusConfig?.allowApproval ?? false;
        case 'cart':
          return statusConfig?.allowCartActions ?? false;
        case 'reject':
          return statusConfig?.allowRejection ?? false;
        case 'cancel':
          return statusConfig?.allowCancellation ?? false;
        default:
          return false;
      }
    });
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
    // New dynamic functions
    getSelectableQuotes,
    getQuotesByAction,
    // Status management integration
    quoteStatuses,
    orderStatuses,
    getStatusConfig,
  };
};
