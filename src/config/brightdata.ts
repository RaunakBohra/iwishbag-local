/**
 * BrightData Configuration
 * Configuration for BrightData API integration
 */

export interface BrightDataConfig {
  apiToken: string;
  baseUrl: string;
  collectors: {
    aliexpress: string;
    amazon: string;
    flipkart: string;
    myntra: string;
  };
  timeout: number;
  retryAttempts: number;
}

export const brightDataConfig: BrightDataConfig = {
  apiToken: import.meta.env.VITE_BRIGHTDATA_API_TOKEN || process.env.BRIGHTDATA_API_TOKEN || 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b',
  baseUrl: 'https://api.brightdata.com/dca/trigger',
  collectors: {
    // AliExpress collector ID - update with your actual collector ID
    aliexpress: 'c_me4lfvsp1m11p0io1a',
    
    // Add other collector IDs as needed
    amazon: '',  // Add Amazon collector ID when available
    flipkart: '', // Add Flipkart collector ID when available
    myntra: '',   // Add Myntra collector ID when available
  },
  timeout: 30000, // 30 seconds
  retryAttempts: 2,
};

export const isConfigured = (): boolean => {
  return !!brightDataConfig.apiToken;
};

export const getSupportedSites = (): string[] => {
  const sites = [];
  if (brightDataConfig.collectors.aliexpress) sites.push('aliexpress');
  if (brightDataConfig.collectors.amazon) sites.push('amazon');
  if (brightDataConfig.collectors.flipkart) sites.push('flipkart');
  if (brightDataConfig.collectors.myntra) sites.push('myntra');
  return sites;
};

// Environment-specific configuration
export const isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';
export const isProduction = import.meta.env.PROD || process.env.NODE_ENV === 'production';

// Rate limiting configuration
export const rateLimits = {
  requestsPerMinute: isDevelopment ? 10 : 30,
  requestsPerHour: isDevelopment ? 100 : 500,
  requestsPerDay: isDevelopment ? 500 : 2000,
};

export default brightDataConfig;