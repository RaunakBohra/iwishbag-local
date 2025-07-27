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
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    sourcemap: true, // Enable sourcemaps for Sentry
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    // Remove console statements in production builds
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
