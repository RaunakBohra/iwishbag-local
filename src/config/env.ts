export const config = {
  app: {
    name: import.meta.env.VITE_APP_NAME || 'WishBag',
    description: import.meta.env.VITE_APP_DESCRIPTION || 'Global Wishlist Hub',
    url: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    secretKey: import.meta.env.VITE_STRIPE_SECRET_KEY,
  },
  resend: {
    apiKey: import.meta.env.VITE_RESEND_API_KEY,
  },
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_RESEND_API_KEY',
  'VITE_FRONTEND_URL',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_STRIPE_SECRET_KEY',
] as const;

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
} 