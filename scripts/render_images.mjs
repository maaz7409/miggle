// Renders the PNG icons and the Open Graph image from the SVG/HTML sources.
// Usage: CHROME_PATH=/path/to/chrome node scripts/render_images.mjs
// (Playwright's bundled Chromium is used when CHROME_PATH is unset.)
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const file = (p) => new URL(p, root).href;
const out = (p) => fileURLToPath(new URL(p, root));

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);

async function render(url, width, height, path, transparent = false) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out(path), omitBackground: transparent });
  await page.close();
  console.log('wrote', path);
}

// A standalone SVG without width/height fills the viewport.
for (const size of [192, 512]) {
  await render(file('public/favicon.svg'), size, size, `public/icons/icon-${size}.png`, true);
}
// Full-bleed art: maskable icons are cropped by the OS, and iOS rounds the touch icon itself.
await render(file('scripts/assets/maskable.svg'), 512, 512, 'public/icons/maskable-512.png');
await render(file('scripts/assets/maskable.svg'), 180, 180, 'public/icons/apple-touch-icon.png');
await render(file('scripts/assets/og.html'), 1200, 630, 'public/og.png');
await browser.close();
