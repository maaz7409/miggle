import { expect, test } from '@playwright/test';
import { daily, parPath } from './helpers';

test('answer pages keep the solution behind a tap', async ({ page }) => {
  await page.goto('/answers/1/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Miggle #1 answer');
  const path = parPath(daily[0]!);
  const answer = page.locator('details.answer');
  await expect(answer.getByText(path.join(' → '))).toBeHidden();
  await answer.locator('summary').click();
  await expect(answer.getByText(path.join(' → '))).toBeVisible();
});

test('every page links to the author on GitHub', async ({ page }) => {
  for (const path of ['/', '/unlimited.html', '/about.html', '/answers/']) {
    await page.goto(path);
    await expect(page.getByRole('link', { name: 'maaz7409 on GitHub' }).first()).toHaveAttribute(
      'href',
      'https://github.com/maaz7409',
    );
  }
});

test('content pages link together and to the game', async ({ page }) => {
  await page.goto('/how-to-play.html');
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveTitle('About Miggle');
  await page.getByRole('link', { name: 'Privacy' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
  await page.getByRole('link', { name: 'Daily' }).click();
  await expect(page.locator('#game .keyboard')).toBeVisible();
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('plays offline after one visit', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Service worker offline checks run in Chromium');
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.locator('#game .keyboard')).toBeVisible();
    await context.setOffline(true);
    for (const path of ['/', '/unlimited.html']) {
      await page.goto(path);
      await expect(page.locator('#game .keyboard')).toBeVisible();
    }
    await context.setOffline(false);
  });
});
