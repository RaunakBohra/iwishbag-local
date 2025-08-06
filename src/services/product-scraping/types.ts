/**
 * Shared types for product scraping services
 */

export interface ScrapeOptions {
  includeReviews?: boolean;
  includeImages?: boolean;
  includeVariants?: boolean;
  enhanceWithAI?: boolean;
  deliveryCountry?: string; // For regional URL processing (e.g., 'IN', 'US', 'GB')
}

export interface BrightDataConfig {
  apiToken: string;
  cacheTimeout?: number;
}