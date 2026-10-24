import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'es2022',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/engine/**'],
      reporter: ['text', 'html'],
      thresholds: { lines: 95, functions: 95, branches: 90, statements: 95 },
    },
  },
});
