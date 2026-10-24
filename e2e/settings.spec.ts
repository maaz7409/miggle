import { expect, test } from '@playwright/test';
import { daily, open, parPath, shared, typeWord } from './helpers';

test('theme, colour-blind palette and reduced motion apply at once and persist', async ({
  page,
}) => {
  await open(page, '/');
  const html = page.locator('html');
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('radio', { name: 'Dark' }).check();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await dialog.getByLabel(/Colour-blind friendly colours/).check();
  await expect(html).toHaveAttribute('data-contrast', 'high');
  await dialog.getByLabel(/Reduce motion/).check();
  await expect(html).toHaveAttribute('data-motion', 'reduce');
  await page.keyboard.press('Escape');

  // Right-spot tiles turn orange.
  const tile = page.locator('.goal .tile').first();
  await expect(tile).toHaveCSS('background-color', 'rgb(245, 121, 58)');

  // Applied before first paint on reload, and on other pages too.
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.goto('/about.html');
  await expect(html).toHaveAttribute('data-contrast', 'high');
});

test('the colour-blind palette also changes the shared emoji', async ({ page }) => {
  await open(page, '/', {
    storage: { 'miggle.settings': { theme: 'system', highContrast: true, reduceMotion: true } },
  });
  for (const word of parPath(daily[0]!).slice(1)) await typeWord(page, word);
  await page
    .getByRole('dialog', { name: 'Statistics' })
    .getByRole('button', { name: 'Share result' })
    .click();
  await expect.poll(async () => (await shared(page))[0]).toContain('🟧🟧🟧🟧🟧🟧');
  expect((await shared(page))[0]).not.toContain('🟩');
});
