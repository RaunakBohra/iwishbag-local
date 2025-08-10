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
            // Core vendor splitting - Keep React and UI components together
            if (id.includes('react') || id.includes('react-dom') || id.includes('@radix-ui') || id.includes('use-callback-ref')) {
              return 'react-vendor';
            }
            if (id.includes('recharts') || id.includes('chart') || id.includes('d3')) {
              return 'charts-vendor';
            }
            // Everything else stays in main vendor bundle
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
    target: 'es2015',
    // Enable CSS code splitting
    cssCodeSplit: true,
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'use-callback-ref',
      '@radix-ui/react-slot',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu'
    ],
  },
}));