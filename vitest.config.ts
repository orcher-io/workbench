import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'packages/*/src/**/*.{test,spec}.{ts,tsx}',
      'plugins/*/src/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@orcher/workbench-di': path.resolve(__dirname, 'packages/di/src'),
      '@orcher/workbench-plugin-api': path.resolve(
        __dirname,
        'packages/plugin-api/src',
      ),
      '@orcher/workbench-services': path.resolve(__dirname, 'packages/services/src'),
      '@orcher/workbench-ui': path.resolve(__dirname, 'packages/ui/src'),
      '@orcher/workbench-window-manager': path.resolve(
        __dirname,
        'packages/window-manager/src',
      ),
      '@orcher/workbench-core': path.resolve(__dirname, 'packages/core/src'),
    },
  },
});
