/**
 * API Versioning Service
 * Handles version management, deprecation warnings, and backward compatibility
 */

export interface ApiVersion {
  version: string;
  deprecated: boolean;
  sunsetDate?: string;
  supportedUntil?: string;
}

export interface ApiResponse<T = any> {
  data: T;
  version: string;
  deprecated?: boolean;
  deprecationMessage?: string;
  sunsetDate?: string;
}

export class ApiVersioningService {
  private static instance: ApiVersioningService;
  
  // Current API versions
  private readonly VERSIONS: Record<string, ApiVersion> = {
    'v1': {
      version: 'v1',
      deprecated: false,
    },
    'v1.1': {
      version: 'v1.1',
      deprecated: false,
    },
    'v0.9': {
      version: 'v0.9',
      deprecated: true,
      sunsetDate: '2025-12-31',
      supportedUntil: '2025-06-30',
    },
  };

  private readonly CURRENT_VERSION = 'v1.1';
  private readonly MINIMUM_SUPPORTED_VERSION = 'v1';

  static getInstance(): ApiVersioningService {
    if (!ApiVersioningService.instance) {
      ApiVersioningService.instance = new ApiVersioningService();
    }
    return ApiVersioningService.instance;
  }

  /**
   * Get the current API version
   */
  getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  /**
   * Get version from request headers or default to current
   */
  getRequestVersion(headers?: Record<string, string>): string {
    const headerVersion = headers?.['X-API-Version'] || headers?.['x-api-version'];
    const version = headerVersion || this.CURRENT_VERSION;
    
    // Validate version exists
    if (!this.VERSIONS[version]) {
      throw new Error(`Unsupported API version: ${version}`);
    }
    
    return version;
  }

  /**
   * Check if a version is deprecated
   */
  isVersionDeprecated(version: string): boolean {
    return this.VERSIONS[version]?.deprecated || false;
  }

  /**
   * Check if a version is supported
   */
  isVersionSupported(version: string): boolean {
    return !!this.VERSIONS[version];
  }

  /**
   * Get deprecation info for a version
   */
  getDeprecationInfo(version: string): {
    deprecated: boolean;
    message?: string;
    sunsetDate?: string;
  } {
    const versionInfo = this.VERSIONS[version];
    
    if (!versionInfo) {
      return { deprecated: false };
    }

    if (versionInfo.deprecated) {
      let message = `API version ${version} is deprecated.`;
      
      if (versionInfo.sunsetDate) {
        message += ` It will be discontinued on ${versionInfo.sunsetDate}.`;
      }
      
      if (versionInfo.supportedUntil) {
        message += ` Support ends on ${versionInfo.supportedUntil}.`;
      }
      
      message += ` Please upgrade to version ${this.CURRENT_VERSION}.`;
      
      return {
        deprecated: true,
        message,
        sunsetDate: versionInfo.sunsetDate,
      };
    }

    return { deprecated: false };
  }

  /**
   * Wrap API response with version information
   */
  wrapResponse<T>(data: T, version: string): ApiResponse<T> {
    const deprecationInfo = this.getDeprecationInfo(version);
    
    const response: ApiResponse<T> = {
      data,
      version,
    };

    if (deprecationInfo.deprecated) {
      response.deprecated = true;
      response.deprecationMessage = deprecationInfo.message;
      response.sunsetDate = deprecationInfo.sunsetDate;
    }

    return response;
  }

  /**
   * Get response headers for version info
   */
  getVersionHeaders(version: string): Record<string, string> {
    const headers: Record<string, string> = {
      'X-API-Version': version,
      'X-API-Current-Version': this.CURRENT_VERSION,
    };

    const deprecationInfo = this.getDeprecationInfo(version);
    if (deprecationInfo.deprecated) {
      headers['X-API-Deprecated'] = 'true';
      
      if (deprecationInfo.sunsetDate) {
        headers['X-API-Sunset'] = deprecationInfo.sunsetDate;
      }
      
      if (deprecationInfo.message) {
        headers['X-API-Deprecation-Message'] = deprecationInfo.message;
      }
    }

    return headers;
  }

  /**
   * Transform data based on API version
   */
  transformForVersion<T>(data: T, version: string, transformers?: Record<string, (data: T) => any>): T {
    if (transformers && transformers[version]) {
      return transformers[version](data);
    }
    
    // Default: return data as-is for current version
    return data;
  }

  /**
   * Log API usage for analytics
   */
  logApiUsage(version: string, endpoint: string, userAgent?: string): void {
    // In production, this would log to analytics service
    if (import.meta.env.DEV) {
      console.log(`[API Usage] Version: ${version}, Endpoint: ${endpoint}, UserAgent: ${userAgent}`);
    }
    
    // Could integrate with:
    // - Google Analytics
    // - Mixpanel
    // - Custom analytics service
    // - Supabase analytics
  }

  /**
   * Get all available versions
   */
  getAvailableVersions(): ApiVersion[] {
    return Object.values(this.VERSIONS);
  }

  /**
   * Get supported versions (non-deprecated)
   */
  getSupportedVersions(): ApiVersion[] {
    return Object.values(this.VERSIONS).filter(v => !v.deprecated);
  }
}

// Export singleton instance
export const apiVersioningService = ApiVersioningService.getInstance();