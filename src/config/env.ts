// Environment configuration
<<<<<<< HEAD
export const env = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  
  // Email configuration
  RESEND_API_KEY: import.meta.env.VITE_RESEND_API_KEY,
  
  // Bright Data configuration for auto quotes
  BRIGHTDATA_USERNAME: import.meta.env.VITE_BRIGHTDATA_USERNAME,
  BRIGHTDATA_PASSWORD: import.meta.env.VITE_BRIGHTDATA_PASSWORD,
  BRIGHTDATA_HOST: import.meta.env.VITE_BRIGHTDATA_HOST || 'brd.superproxy.io',
  BRIGHTDATA_PORT: import.meta.env.VITE_BRIGHTDATA_PORT || '22225',
  
  // ScrapeAPI configuration
  SCRAPER_API_KEY: import.meta.env.VITE_SCRAPER_API_KEY,
  
  // Auto quote settings
  AUTO_QUOTE_ENABLED: import.meta.env.VITE_AUTO_QUOTE_ENABLED === 'true' || import.meta.env.DEV,
  DEFAULT_CONFIDENCE_THRESHOLD: parseFloat(import.meta.env.VITE_DEFAULT_CONFIDENCE_THRESHOLD || '0.7'),
  DEFAULT_MARKUP_PERCENTAGE: parseFloat(import.meta.env.VITE_DEFAULT_MARKUP_PERCENTAGE || '5.0'),
  MAX_AUTO_APPROVAL_AMOUNT: parseFloat(import.meta.env.VITE_MAX_AUTO_APPROVAL_AMOUNT || '500.0'),
  
  // Development settings
  NODE_ENV: import.meta.env.NODE_ENV,
  DEV: import.meta.env.DEV,
} as const;
=======
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  app: {
    name: 'Global Wishlist Hub',
    version: '1.0.0',
    environment: import.meta.env.MODE,
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  },
  resend: {
    apiKey: import.meta.env.VITE_RESEND_API_KEY || '',
  },
};
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312

// Required environment variables
export const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

// Validate environment variables
export const validateEnv = () => {
  const missing = requiredEnvVars.filter(
    (varName) => !import.meta.env[varName]
  );
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return false;
  }
  
  return true;
}; 