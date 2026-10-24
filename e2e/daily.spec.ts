import { expect, test } from '@playwright/test';
import { shareText } from '../src/engine/share';
import { daily, dict, open, parPath, rows, shared, toast, typeWord } from './helpers';

const START = daily[0]!;
const PATH = parPath(START);
const PAR = dict.par(START)!;

test('shows How to play on the first visit, then plays by keyboard alone', async ({ page }) => {
  await open(page, '/', { seenIntro: false });
  const dialog = page.getByRole('dialog', { name: 'How to play' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'How to play' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // Header buttons are reachable with Tab and open their modals with Enter.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'How to play' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'How to play' })).toBeFocused();

  await page.locator('body').click({ position: { x: 5, y: 300 } });
  await typeWord(page, PATH[1]!);
  await expect(rows(page)).toHaveCount(2);
});

test('rejects invalid words with a message and a shake', async ({ page }) => {
  await open(page, '/');
  const anagram = dict.withKey([...START].sort().join('')).find((w) => w !== START);
  const cases: [string, string][] = [
    ['ABC', 'Need 6 letters'],
    ['ZZZZZZ', 'Not in word list'],
    [START, 'Already used'],
    ['MIGUEL', 'Change exactly one letter'],
  ];
  if (anagram) cases.push([anagram, "You must change a letter — just shuffling isn't allowed"]);
  for (const [word, message] of cases) {
    await typeWord(page, word);
    await expect(toast(page)).toHaveText(message);
    await expect(page.locator('.row--input')).toHaveClass(/shake/);
    for (let i = 0; i < 6; i++) await page.keyboard.press('Backspace');
  }
  await expect(rows(page)).toHaveCount(1);
});

test('the on-screen keyboard types and submits', async ({ page }) => {
  await open(page, '/');
  for (const ch of PATH[1]!) await page.locator(`.key[data-key="${ch}"]`).click();
  await page.locator('.key[data-key="ENTER"]').click();
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).nth(1)).toHaveAttribute('aria-label', `Step 1: ${PATH[1]}`);
});

test('keeps progress across a reload, finishes, and shares the result', async ({ page }) => {
  await open(page, '/');
  await typeWord(page, PATH[1]!);
  await page.keyboard.type(PATH[2]!.slice(0, 3).toLowerCase());
  await page.reload();
  await expect(rows(page)).toHaveCount(2);
  await expect(page.locator('.row--input')).toHaveAttribute('aria-label', 'Next word');
  await expect(page.locator('.row--input .tile[data-filled]')).toHaveCount(3);
  for (let i = 0; i < 3; i++) await page.keyboard.press('Backspace');

  for (const word of PATH.slice(2)) await typeWord(page, word);
  await expect(page.locator('[data-ref="resultMessage"]')).toHaveText(`Perfect! ${PAR} steps 🥸`);
  const stats = page.getByRole('dialog', { name: 'Statistics' });
  await expect(stats).toBeVisible();
  await expect(stats.locator('.stat-value').first()).toHaveText('1');

  await stats.getByRole('button', { name: 'Share result' }).click();
  await expect(toast(page)).toHaveText('Copied to clipboard');
  const [text] = await shared(page);
  const url = text!.split('\n').at(-1)!;
  expect(text).toBe(shareText({ day: 1, ladder: PATH, par: PAR, url }));
});

test('counts only the first solve, and resets on the next day', async ({ page }) => {
  await open(page, '/');
  for (const word of PATH.slice(1)) await typeWord(page, word);
  const stats = page.getByRole('dialog', { name: 'Statistics' });
  await stats.getByRole('button', { name: 'Try again' }).click();
  await expect(rows(page)).toHaveCount(1);
  for (const word of PATH.slice(1)) await typeWord(page, word);
  await expect(stats).toBeVisible();
  await expect(stats.locator('.stat-value').first()).toHaveText('1');

  await page.clock.setFixedTime(new Date(Date.parse('2026-10-26T12:00:00+05:30')));
  await page.reload();
  await expect(page.locator('[data-ref="label"]')).toHaveText('#2');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toHaveAttribute('aria-label', `Start: ${daily[1]}`);
});

test('labels tiles for screen readers and announces accepted words', async ({ page }) => {
  await open(page, '/');
  const first = rows(page).first().locator('.tile').first();
  await expect(first).toHaveAttribute(
    'aria-label',
    /^[A-Z], (right spot|elsewhere in MIGUEL|not in MIGUEL)$/,
  );
  await typeWord(page, PATH[1]!);
  await expect(page.locator('.row--word .tile[data-new]')).toHaveAttribute(
    'aria-label',
    /new letter$/,
  );
  await expect(page.locator('[aria-live="polite"].sr-only')).toContainText(`${PATH[1]}, step 1`);
});
