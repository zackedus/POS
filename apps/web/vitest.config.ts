import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@barokah/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@barokah/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
