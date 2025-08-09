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
}));