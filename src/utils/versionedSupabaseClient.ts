/**
 * Versioned Supabase Client
 * Wraps Supabase calls with API versioning support
 */

import { supabase } from '@/integrations/supabase/client';
import { apiVersioningService, type ApiResponse } from '@/services/ApiVersioningService';
import { logger } from '@/utils/logger';

export class VersionedSupabaseClient {
  private static instance: VersionedSupabaseClient;
  
  static getInstance(): VersionedSupabaseClient {
    if (!VersionedSupabaseClient.instance) {
      VersionedSupabaseClient.instance = new VersionedSupabaseClient();
    }
    return VersionedSupabaseClient.instance;
  }

  /**
   * Make a versioned RPC call
   */
  async rpc<T>(
    functionName: string,
    params?: any,
    options?: {
      version?: string;
      userAgent?: string;
    }
  ): Promise<ApiResponse<T>> {
    const version = options?.version || apiVersioningService.getCurrentVersion();
    
    try {
      // Validate version support
      if (!apiVersioningService.isVersionSupported(version)) {
        throw new Error(`Unsupported API version: ${version}`);
      }

      // Log API usage
      apiVersioningService.logApiUsage(version, `rpc/${functionName}`, options?.userAgent);

      // Add version to RPC parameters
      const versionedParams = {
        ...params,
        _api_version: version,
      };

      // Make the RPC call
      const { data, error } = await supabase.rpc(functionName, versionedParams);

      if (error) {
        throw error;
      }

      // Transform data for version compatibility if needed
      const transformedData = apiVersioningService.transformForVersion(data, version);

      // Wrap response with version info
      return apiVersioningService.wrapResponse(transformedData, version);

    } catch (error) {
      logger.error(`Versioned RPC call failed:`, {
        function: functionName,
        version,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Make a versioned database query
   */
  async query<T>(
    table: string,
    query: any,
    options?: {
      version?: string;
      userAgent?: string;
    }
  ): Promise<ApiResponse<T>> {
    const version = options?.version || apiVersioningService.getCurrentVersion();
    
    try {
      // Validate version support
      if (!apiVersioningService.isVersionSupported(version)) {
        throw new Error(`Unsupported API version: ${version}`);
      }

      // Log API usage
      apiVersioningService.logApiUsage(version, `query/${table}`, options?.userAgent);

      // Execute query (this would be expanded for different query types)
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Transform data for version compatibility
      const transformedData = this.transformQueryResult(data, table, version);

      // Wrap response with version info
      return apiVersioningService.wrapResponse(transformedData, version);

    } catch (error) {
      logger.error(`Versioned query failed:`, {
        table,
        version,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Transform query results based on version
   */
  private transformQueryResult<T>(data: T, table: string, version: string): T {
    const transformers = this.getTableTransformers(table);
    return apiVersioningService.transformForVersion(data, version, transformers);
  }

  /**
   * Get table-specific transformers for different versions
   */
  private getTableTransformers(table: string): Record<string, (data: any) => any> {
    const transformers: Record<string, Record<string, (data: any) => any>> = {
      quotes: {
        'v0.9': (data) => {
          // Transform for legacy v0.9 format
          if (Array.isArray(data)) {
            return data.map(quote => ({
              ...quote,
              // Convert new fields to old format
              total_cost: quote.total_amount,
              shipping_cost: quote.shipping_fee,
              // Remove new fields not in v0.9
              calculation_data: undefined,
            }));
          }
          return data;
        },
        'v1': (data) => {
          // v1 format (current)
          return data;
        },
      },
      customers: {
        'v0.9': (data) => {
          // Legacy customer format
          if (Array.isArray(data)) {
            return data.map(customer => ({
              ...customer,
              full_name: customer.name, // Old field name
              contact_number: customer.phone, // Old field name
            }));
          }
          return data;
        },
      },
    };

    return transformers[table] || {};
  }

  /**
   * Check version compatibility for specific features
   */
  isFeatureSupported(feature: string, version: string): boolean {
    const featureVersions: Record<string, string> = {
      'mfa': 'v1.1',
      'rate_limiting': 'v1',
      'advanced_search': 'v1',
      'bulk_operations': 'v1.1',
    };

    const requiredVersion = featureVersions[feature];
    if (!requiredVersion) return true; // Feature has no version requirement

    return this.compareVersions(version, requiredVersion) >= 0;
  }

  /**
   * Compare version strings
   */
  private compareVersions(a: string, b: string): number {
    const parseVersion = (v: string) => {
      const parts = v.replace('v', '').split('.').map(Number);
      return parts[0] * 1000 + (parts[1] || 0);
    };

    return parseVersion(a) - parseVersion(b);
  }

  /**
   * Get deprecation warnings for client
   */
  getDeprecationWarnings(version: string): string[] {
    const warnings: string[] = [];
    
    if (apiVersioningService.isVersionDeprecated(version)) {
      const info = apiVersioningService.getDeprecationInfo(version);
      if (info.message) {
        warnings.push(info.message);
      }
    }

    // Add feature-specific warnings
    if (version === 'v0.9') {
      warnings.push('Quote calculation fields have changed. Please update your integration.');
      warnings.push('Customer data structure has been updated for better consistency.');
    }

    return warnings;
  }
}

// Export singleton instance
export const versionedSupabaseClient = VersionedSupabaseClient.getInstance();