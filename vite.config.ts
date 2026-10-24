import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const page = (file: string) => fileURLToPath(new URL(file, import.meta.url));

/** Every HTML page: the two game pages plus those written by scripts/gen_pages.ts. */
function pages(): Record<string, string> {
  const input: Record<string, string> = {};
  for (const name of ['index', 'unlimited', 'about', 'privacy', 'how-to-play']) {
    if (existsSync(page(`./${name}.html`))) input[name] = page(`./${name}.html`);
  }
  if (existsSync(page('./answers'))) {
    input.answers = page('./answers/index.html');
    for (const day of readdirSync(page('./answers'))) {
      if (/^\d+$/.test(day)) input[`answers-${day}`] = page(`./answers/${day}/index.html`);
    }
  }
  return input;
}

/** Inline src/early-settings.js at the top of every page's <head>, so themes apply before paint. */
const earlySettings = {
  name: 'miggle-early-settings',
  transformIndexHtml: {
    order: 'pre' as const,
    handler: () => [
      {
        tag: 'script',
        children: readFileSync(page('./src/early-settings.js'), 'utf8'),
        injectTo: 'head-prepend' as const,
      },
    ],
  },
};

export default defineConfig({
  plugins: [earlySettings],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: pages(),
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
        'src/settings.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: { lines: 95, functions: 95, branches: 90, statements: 95 },
    },
  },
});
