import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Minimal vite config for testing
export default defineConfig({
  base: '/',
  server: {
    host: '::',
    port: 8082,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    assetsDir: 'assets',
    minify: 'esbuild',
    target: 'es2015',
  },
});