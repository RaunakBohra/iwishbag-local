import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from 'path';

// Custom plugin to control chunk preloading
function selectivePreloadPlugin() {
  return {
    name: 'selective-preload',
    generateBundle(options: any, bundle: any) {
      // Find the main index.html
      const htmlFiles = Object.keys(bundle).filter(fileName => fileName.endsWith('.html'));
      
      htmlFiles.forEach(htmlFileName => {
        const htmlChunk = bundle[htmlFileName];
        if (htmlChunk && htmlChunk.source) {
          // Remove preload links for heavy chunks
          let html = htmlChunk.source.toString();
          
          // Remove preloads for heavy chunks
          const heavyChunks = [
            'excel-vendor',
            'pdf-vendor', 
            'charts-vendor',
            'admin-core',
            'image-processing-vendor',
            'animations-vendor',
            'monitoring-vendor'
          ];
          
          heavyChunks.forEach(chunk => {
            const preloadRegex = new RegExp(
              `<link[^>]*rel="modulepreload"[^>]*href="[^"]*${chunk}[^"]*"[^>]*>`,
              'g'
            );
            html = html.replace(preloadRegex, '');
          });
          
          htmlChunk.source = html;
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: '::',
    port: 8082,
  },
  plugins: [
    react(),
    selectivePreloadPlugin(), // CRITICAL: Prevents heavy chunks from preloading
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
        // CRITICAL: Prevent preloading of heavy chunks
        experimentalMinChunkSize: 20000, // Only preload chunks larger than 20KB
        manualChunks: (id) => {
          // Vendor dependencies - Strategic Splitting for 2.68MB reduction
          if (id.includes('node_modules')) {
            
            // 🎯 HIGH IMPACT SPLITS - Target largest dependencies first
            
            // Charts & Visualization - Split heavy libraries
            
            // Charts - Only for dashboard/admin analytics (Load on-demand)
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
            
            // Animations - Only for enhanced UI interactions (Load on-demand)
            if (id.includes('framer-motion')) {
              return 'animations-vendor';
            }
            
            // Core React Ecosystem (~400KB) 
            if (id.includes('react') && !id.includes('react-hook-form') && !id.includes('react-day-picker')) {
              return 'react-core-vendor';
            }
            if (id.includes('react-dom') || id.includes('react-router')) {
              return 'react-core-vendor';
            }
            
            // Form & Input Libraries (~300KB)
            if (id.includes('react-hook-form') || id.includes('react-day-picker') || 
                id.includes('input-otp') || id.includes('react-international-phone') ||
                id.includes('react-dropzone')) {
              return 'forms-vendor';
            }
            
            // UI Component Libraries (~500KB) 
            if (id.includes('@radix-ui')) {
              return 'radix-ui-vendor';
            }
            if (id.includes('lucide-react') || id.includes('cmdk') || id.includes('vaul')) {
              return 'ui-icons-vendor';
            }
            
            // Data & State Management (~200KB)
            if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
              return 'state-vendor';
            }
            
            // Supabase & Database (~300KB)
            if (id.includes('@supabase') || id.includes('jose') || id.includes('pg')) {
              return 'supabase-vendor';
            }
            
            // Payment Processing (~200KB)
            if (id.includes('@stripe') || id.includes('stripe')) {
              return 'payments-vendor';
            }
            
            // Utility Libraries (~300KB)
            if (id.includes('lodash') || id.includes('date-fns') || id.includes('uuid') || 
                id.includes('clsx') || id.includes('class-variance-authority') ||
                id.includes('tailwind-merge')) {
              return 'utils-vendor';
            }
            
            // HEAVY File Processing - Split into smaller chunks for on-demand loading
            
            // PDF Generation - Only for admin export features (Load on-demand)
            if (id.includes('jspdf')) {
              return 'pdf-vendor';
            }
            
            // Excel Processing - Only for data export (Load on-demand) 
            if (id.includes('exceljs')) {
              return 'excel-vendor';
            }
            
            // Image Processing - Only when uploading images (Load on-demand)
            if (id.includes('browser-image-compression')) {
              return 'image-processing-vendor';
            }
            
            // CSV & QR - Lighter file processing
            if (id.includes('papaparse') || id.includes('qrcode')) {
              return 'file-utils-vendor';
            }
            
            // Security & Crypto (~150KB)
            if (id.includes('bcryptjs') || id.includes('otplib') || id.includes('dompurify') ||
                id.includes('crypto') || id.includes('libphonenumber-js')) {
              return 'security-vendor';
            }
            
            // Email & Communication - Split heavy email processing
            
            // Heavy Email Processing - Only for admin email features (Load on-demand)
            if (id.includes('mailparser')) {
              return 'email-processing-vendor';
            }
            
            // Light Communication - Notifications and basic email
            if (id.includes('resend') || id.includes('react-hot-toast') || id.includes('sonner')) {
              return 'communication-vendor';
            }
            
            // Development & Monitoring (~150KB)
            if (id.includes('@sentry') || id.includes('react-helmet-async') ||
                id.includes('@tanstack/react-query-devtools')) {
              return 'monitoring-vendor';
            }
            
            // Remaining smaller vendor packages
            return 'vendor-misc';
          }
          
          // ✨ ENHANCED APPLICATION CODE SPLITTING
          
          // Route-based splitting with intelligent grouping
          
          // 🔐 Admin System - Heavy administrative functionality
          if (id.includes('/admin/') || id.includes('/pages/admin/') || 
              id.includes('AdminLayout') || id.includes('AdminDashboard') ||
              id.includes('QuotesListPage') || id.includes('OrderManagementPage') ||
              id.includes('SimpleCustomerManagement')) {
            return 'admin-core';
          }
          
          // 🛠️ Admin Tools & Settings - Secondary admin features  
          if (id.includes('admin') && (
              id.includes('Settings') || id.includes('Management') ||
              id.includes('Configuration') || id.includes('Regional') ||
              id.includes('Intelligence') || id.includes('Performance')
          )) {
            return 'admin-tools';
          }
          
          // 📊 Dashboard & Customer Area - User-facing dashboard
          if (id.includes('/dashboard/') || id.includes('Dashboard') ||
              id.includes('CustomerQuotesList') || id.includes('CustomerOrderList') ||
              id.includes('MyTickets') || id.includes('MessageCenter')) {
            return 'dashboard';
          }
          
          // 🛒 E-commerce Core - Shopping functionality
          if (id.includes('Quote') && !id.includes('admin') ||
              id.includes('Cart') || id.includes('Checkout') ||
              id.includes('CostEstimator') || id.includes('ShopifyStyle')) {
            return 'ecommerce';
          }
          
          // 💳 Payment System - Payment processing
          if (id.includes('payment') || id.includes('Payment') ||
              id.includes('Paypal') || id.includes('Esewa') ||
              id.includes('OrderConfirmation')) {
            return 'payments';
          }
          
          // 🔐 Authentication - Auth flows
          if (id.includes('/auth/') || id.includes('Auth') ||
              id.includes('Login') || id.includes('Register') ||
              id.includes('ResetPassword') || id.includes('OAuth')) {
            return 'auth';
          }
          
          // 📄 Content Pages - Static/marketing content
          if (id.includes('About') || id.includes('Blog') ||
              id.includes('Help') || id.includes('Privacy') ||
              id.includes('Terms') || id.includes('Returns')) {
            return 'content';
          }
          
          // 🔬 Demo & Testing - Development components
          if (id.includes('/demo/') || id.includes('Demo') ||
              id.includes('Test') && !id.includes('admin')) {
            return 'demo';
          }
          
          // 🎨 UI Components - Shared UI components (split by complexity)
          if (id.includes('/components/ui/') || 
              id.includes('/components/shared/')) {
            if (id.includes('OptimizedImage') || id.includes('ProgressiveImage') ||
                id.includes('AdvancedSuspense') || id.includes('ErrorBoundary')) {
              return 'ui-advanced';
            }
            return 'ui-core';
          }
          
          // ⚡ Services & Utils - Business logic
          if (id.includes('/services/') || id.includes('/utils/')) {
            if (id.includes('RouteCodeSplitting') || id.includes('ImageOptimization') ||
                id.includes('AssetPreloader') || id.includes('PerformanceTracker')) {
              return 'utils-performance';
            }
            return 'utils-core';
          }
          
          // 🔌 Hooks - Custom React hooks
          if (id.includes('/hooks/')) {
            return 'hooks';
          }
          
          // 📱 Components by Category
          if (id.includes('/components/')) {
            if (id.includes('forms') || id.includes('Form')) {
              return 'components-forms';
            }
            if (id.includes('admin') && !id.includes('Simple')) {
              return 'admin-components';
            }
            return 'components-common';
          }
        },
        // Optimize chunk names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          
          // Add hash for cache busting while keeping readable names
          return `assets/[name]-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').at(-1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(extType ?? '')) {
            return `assets/img/[name]-[hash][extname]`;
          }
          if (/css/i.test(extType ?? '')) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    sourcemap: true, // Enable sourcemaps for Sentry
    minify: 'esbuild',
    chunkSizeWarningLimit: 500, // Stricter limit after splitting - should be under 500KB per chunk
    target: 'es2015', // Better browser support and smaller bundles
  },
  esbuild: {
    // Remove console statements in production builds
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
