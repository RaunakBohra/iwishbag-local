/**
 * Vitest Configuration for HSN System Tests
 * Specialized configuration for comprehensive HSN testing
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'HSN System Tests',
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup/hsn-test-setup.ts'],
    include: [
      'src/services/__tests__/HSN*.test.ts',
      'src/hooks/__tests__/useHSN*.test.tsx',
      'src/components/admin/__tests__/HSN*.test.tsx',
      'src/services/api/__tests__/Government*.test.ts',
      'src/__tests__/integration/hsn-*.test.tsx'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts'
    ],
    globals: true,
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/hsn-test-results.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/hsn',
      include: [
        'src/services/HSN*.ts',
        'src/services/api/Government*.ts',
        'src/hooks/useHSN*.ts',
        'src/components/admin/HSN*.tsx',
        'src/components/admin/hsn-components/*.tsx',
        'src/providers/HSNRealtimeProvider.tsx'
      ],
      exclude: [
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/types/**',
        '**/*.d.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // Stricter thresholds for core services
        'src/services/HSNQuoteIntegrationService.ts': {
          branches: 90,
          functions: 95,
          lines: 90,
          statements: 90
        },
        'src/services/api/GovernmentAPIOrchestrator.ts': {
          branches: 85,
          functions: 90,
          lines: 85,
          statements: 85
        }
      }
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 2,
        maxThreads: 4,
        singleThread: false
      }
    },
    testTimeout: 10000, // 10 seconds for integration tests
    hookTimeout: 5000,  // 5 seconds for setup/teardown
    retry: 2, // Retry failed tests twice
    bail: 1,  // Stop on first failure in CI
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/integrations': path.resolve(__dirname, './src/integrations'),
    }
  },
  define: {
    // Environment variables for testing
    'process.env.NODE_ENV': '"test"',
    'process.env.VITE_HSN_TEST_MODE': '"true"',
  }
});