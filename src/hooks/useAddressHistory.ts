import { useQuery } from '@tanstack/react-query';
import { getAddressHistory } from '@/lib/addressUpdates';
import { AddressChange } from '@/types/address';
import { getAddressChangeSummary, compareAddresses } from '@/lib/addressValidation';

interface UseAddressHistoryOptions {
  quoteId: string;
  enabled?: boolean;
}

export function useAddressHistory({ quoteId, enabled = true }: UseAddressHistoryOptions) {
  const { data: history, isLoading, error } = useQuery({
    queryKey: ['address-history', quoteId],
    queryFn: async () => {
      const result = await getAddressHistory(quoteId);
      if (result.error) throw new Error(result.error);
      return result.data as AddressChange[];
    },
    enabled: enabled && !!quoteId,
  });

  // Process and format history data
  const processedHistory = history?.map((change, index) => {
    const previousChange = index < history.length - 1 ? history[index + 1] : null;
    
    // Calculate changes between this and previous entry
    let changes: any[] = [];
    if (change.oldAddress && change.newAddress) {
      changes = compareAddresses(change.oldAddress, change.newAddress);
    } else if (change.newAddress && !change.oldAddress) {
      // This is a creation - all fields are new
      changes = Object.entries(change.newAddress).map(([field, value]) => ({
        field,
        oldValue: '',
        newValue: value || '',
      }));
    }

    const changeSummary = getAddressChangeSummary(changes);
    
    return {
      ...change,
      changes,
      changeSummary,
      hasCountryChange: changes.some(c => c.field === 'country'),
      isSignificantChange: changes.length > 2 || changes.some(c => c.field === 'country'),
    };
  }) || [];

  // Get recent changes (last 5)
  const recentChanges = processedHistory.slice(0, 5);

  // Get country changes specifically
  const countryChanges = processedHistory.filter(change => change.hasCountryChange);

  // Get significant changes
  const significantChanges = processedHistory.filter(change => change.isSignificantChange);

  // Format change type for display
  const formatChangeType = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return 'Address Created';
      case 'update':
        return 'Address Updated';
      case 'lock':
        return 'Address Locked';
      case 'unlock':
        return 'Address Unlocked';
      default:
        return 'Address Modified';
    }
  };

  // Get change icon based on type
  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return '➕';
      case 'update':
        return '✏️';
      case 'lock':
        return '🔒';
      case 'unlock':
        return '🔓';
      default:
        return '📝';
    }
  };

  // Check if there are any changes
  const hasChanges = processedHistory.length > 0;

  // Get the most recent change
  const latestChange = processedHistory[0];

  // Get the original address (first creation)
  const originalAddress = processedHistory[processedHistory.length - 1]?.newAddress;

  return {
    // Raw data
    history: processedHistory,
    rawHistory: history,
    
    // Processed data
    recentChanges,
    countryChanges,
    significantChanges,
    latestChange,
    originalAddress,
    
    // State
    isLoading,
    error,
    hasChanges,
    
    // Utilities
    formatChangeType,
    getChangeIcon,
    
    // Statistics
    totalChanges: processedHistory.length,
    countryChangeCount: countryChanges.length,
    significantChangeCount: significantChanges.length,
  };
} 