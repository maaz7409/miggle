import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const page = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: page('./index.html'),
        unlimited: page('./unlimited.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'src/engine/**',
        'src/storage.ts',
        'src/stats.ts',
        'src/today.ts',
        'src/unlimited-record.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: { lines: 95, functions: 95, branches: 90, statements: 95 },
    },
  },
});
