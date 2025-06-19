// Environment configuration
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
};

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