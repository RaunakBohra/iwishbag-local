import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from 'path';

// Simple working configuration for performance optimization
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: '::',
    port: 8082,
  },
  plugins: [
    react(),
    sentryVitePlugin({
      org: "iwishbag-pte-ltd",
      project: "iwishbagcom", 
      authToken: process.env.SENTRY_AUTH_TOKEN,
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
      // Ensure React is available globally to prevent import issues
      external: [],
      output: {
        format: 'es',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').at(-1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(extType ?? '')) {
            return 'assets/img/[name]-[hash][extname]';
          }
          if (/css/i.test(extType ?? '')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        // Advanced admin bundle splitting for performance
        manualChunks: mode === 'production' ? (id) => {
          if (id.includes('node_modules')) {
            // Core React bundle (highest priority)
            if (id.includes('react') || id.includes('react-dom') || id.includes('use-callback-ref') || id.includes('use-sync-external-store')) {
              return 'react-vendor';
            }
            // Animation bundle (depends on React, loaded after)
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            // UI components (second priority)
            if (id.includes('@radix-ui') || id.includes('@hookform') || id.includes('react-hook-form')) {
              return 'ui-vendor';
            }
            // Charts and visualization (lazy loaded)
            if (id.includes('recharts') || id.includes('chart') || id.includes('d3')) {
              return 'charts-vendor';
            }
            // Utilities and validation
            if (id.includes('zod') || id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind')) {
              return 'utils-vendor';
            }
            // Supabase and APIs
            if (id.includes('@supabase') || id.includes('@tanstack') || id.includes('react-query')) {
              return 'api-vendor';
            }
            // Everything else in smaller vendor bundle
            return 'vendor';
          }
          
          // Admin bundle splitting - only load for admin users
          if (id.includes('/pages/admin/') || id.includes('/components/admin/')) {
            if (id.includes('Dashboard') || id.includes('SystemPerformance')) {
              return 'admin-dashboard';
            }
            if (id.includes('Quote') || id.includes('Calculator')) {
              return 'admin-quotes';
            }
            if (id.includes('Customer') || id.includes('Profile')) {
              return 'admin-customers';
            }
            // Other admin components
            return 'admin-core';
          }
          
          // Customer-facing components (load faster)
          if (id.includes('/pages/') && !id.includes('/admin/')) {
            if (id.includes('Quote') || id.includes('Cart') || id.includes('Checkout')) {
              return 'customer-core';
            }
            return 'customer-pages';
          }
        } : undefined,
      },
    },
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Increase chunk size warning limit for admin bundles (lazy-loaded)
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    // Safer minification settings to prevent initialization issues
    keepNames: true, // Preserve function and variable names for debugging
    minifyIdentifiers: false, // Don't rename variables aggressively
    minifySyntax: true, // Safe syntax minification
    minifyWhitespace: true, // Remove whitespace
    legalComments: 'none',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'use-callback-ref',
      '@radix-ui/react-slot',
      '@radix-ui/react-dialog', 
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-toast',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      'framer-motion'
    ],
    force: true
  },
}));