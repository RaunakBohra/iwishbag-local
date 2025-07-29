// Environment configuration
export const env = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,

  // Email configuration
  RESEND_API_KEY: import.meta.env.VITE_RESEND_API_KEY,

  // ScrapeAPI configuration
  SCRAPER_API_KEY: import.meta.env.VITE_SCRAPER_API_KEY,

  // PayU configuration handled server-side for security
  // Payment URLs are fetched from database configuration

  // NCM API Configuration (Nepal Can Move)
  NCM_API_TOKEN: import.meta.env.VITE_NCM_API_TOKEN || '',
  NCM_API_BASE_URL: import.meta.env.VITE_NCM_API_BASE_URL || 'https://demo.nepalcanmove.com',
  NCM_API_EMAIL: import.meta.env.VITE_NCM_API_EMAIL || '',

  // Development settings
  NODE_ENV: import.meta.env.NODE_ENV,
  DEV: import.meta.env.DEV,
} as const;

// Required environment variables
export const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

// Validate environment variables
export const validateEnv = () => {
  const missing = requiredEnvVars.filter((varName) => !import.meta.env[varName]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return false;
  }

  return true;
};
