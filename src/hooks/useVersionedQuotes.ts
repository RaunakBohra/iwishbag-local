/**
 * Example hook showing how to use versioned API calls
 */

import { useQuery } from '@tanstack/react-query';
import { versionedSupabaseClient } from '@/utils/versionedSupabaseClient';
import { apiVersioningService } from '@/services/ApiVersioningService';
import { logger } from '@/utils/logger';

interface Quote {
  id: string;
  quote_number: string;
  total_amount?: number;
  total_cost?: number; // Legacy v0.9 field
  shipping_fee?: number;
  shipping_cost?: number; // Legacy v0.9 field
  status: string;
  customer_data?: any;
  customer_name?: string; // Legacy v0.9 field
  customer_email?: string; // Legacy v0.9 field
  created_at: string;
  updated_at: string;
}

interface VersionedQuotesResponse {
  data: Quote[];
  version: string;
  deprecated?: boolean;
  deprecation_message?: string;
  count: number;
  response_time_ms: number;
}

export const useVersionedQuotes = (
  options: {
    version?: string;
    limit?: number;
    offset?: number;
    enabled?: boolean;
  } = {}
) => {
  const { 
    version = apiVersioningService.getCurrentVersion(),
    limit = 50,
    offset = 0,
    enabled = true
  } = options;

  return useQuery({
    queryKey: ['quotes-versioned', version, limit, offset],
    queryFn: async (): Promise<VersionedQuotesResponse> => {
      try {
        const response = await versionedSupabaseClient.rpc<VersionedQuotesResponse>(
          'get_quotes_versioned',
          {
            p_api_version: version,
            p_limit: limit,
            p_offset: offset,
          },
          {
            version,
            userAgent: navigator.userAgent,
          }
        );

        // Handle deprecation warnings
        if (response.deprecated) {
          logger.warn('API Deprecation Warning:', {
            version: response.version,
            message: response.deprecationMessage,
          });
          
          // Could show user notification here
          console.warn(`⚠️ ${response.deprecationMessage}`);
        }

        return response.data;
      } catch (error) {
        logger.error('Versioned quotes fetch failed:', error);
        throw error;
      }
    },
    enabled,
    // Stale time based on version - deprecated versions cache longer
    staleTime: apiVersioningService.isVersionDeprecated(version) ? 1000 * 60 * 10 : 1000 * 60 * 5,
  });
};

// Example usage in components:
/*
// Use current version
const { data: quotes } = useVersionedQuotes();

// Use specific version
const { data: legacyQuotes } = useVersionedQuotes({ version: 'v0.9' });

// Handle version compatibility
const MyComponent = () => {
  const { data: quotesResponse, isLoading } = useVersionedQuotes();
  
  if (quotesResponse?.deprecated) {
    // Show deprecation notice to user
    return (
      <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded">
        <p className="text-orange-800">{quotesResponse.deprecationMessage}</p>
      </div>
    );
  }
  
  return (
    <div>
      {quotesResponse?.data.map(quote => (
        <div key={quote.id}>
          // Render quote - fields will be version-appropriate
          <h3>{quote.quote_number}</h3>
          <p>Total: ${quote.total_amount || quote.total_cost}</p>
        </div>
      ))}
    </div>
  );
};
*/