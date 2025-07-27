import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: '::',
    port: 8082,
  },
  plugins: [
    react(),
    sentryVitePlugin({
      org: "iwishbag-pte-ltd", // Your Sentry organization slug
      project: "iwishbagcom", // Your Sentry project name
      authToken: process.env.SENTRY_AUTH_TOKEN, // Add this to your environment variables
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor dependencies
          if (id.includes('node_modules')) {
            // Large chart libraries
            if (id.includes('recharts')) {
              return 'charts';
            }
            // Core React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // UI components
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            // Query and state management
            if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
              return 'state-vendor';
            }
            // Supabase and auth
            if (id.includes('@supabase') || id.includes('jose') || id.includes('crypto')) {
              return 'supabase-vendor';
            }
            // Date utilities
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            // Other vendor packages
            return 'vendor';
          }
          
          // Application code splitting
          // Admin pages
          if (id.includes('/admin/') || id.includes('admin')) {
            return 'admin';
          }
          // Demo pages
          if (id.includes('/demo/')) {
            return 'demo';
          }
          // Dashboard pages
          if (id.includes('/dashboard/')) {
            return 'dashboard';
          }
          // Payment related
          if (id.includes('payment') || id.includes('Payment')) {
            return 'payments';
          }
          // Quote related
          if (id.includes('quote') || id.includes('Quote')) {
            return 'quotes';
          }
        },
      },
    },
    sourcemap: true, // Enable sourcemaps for Sentry
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    target: 'es2015', // Better browser support and smaller bundles
  },
  esbuild: {
    // Remove console statements in production builds
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
