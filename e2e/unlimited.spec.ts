import { expect, test } from '@playwright/test';
import { puzzlePool } from '../src/engine/unlimited';
import { dict, open, parPath, rows, toast, typeWord, unlimitedPool, wander } from './helpers';

/** Seed an Unlimited run so the puzzle is known in advance. */
const runAt = (difficulty: 'medium' | 'hard', start: string, streak = 0) => ({
  'miggle.unlimited': {
    run: { difficulty, streak, used: [start], hints: 0 },
    start,
    state: { start, ladder: [start], input: '', won: false },
    forfeited: false,
  },
});

test('Medium: solving at par grows the streak, earns a hint and deals a new word', async ({
  page,
}) => {
  const start = puzzlePool(unlimitedPool, dict, 'medium')[0]!;
  await open(page, '/unlimited.html', { storage: runAt('medium', start) });
  await expect(page.locator('[data-ref="label"]')).toHaveText('Medium');
  await expect(page.locator('[data-ref="hint"]')).toBeDisabled();
  for (const word of parPath(start).slice(1)) await typeWord(page, word);
  await expect(page.locator('[data-ref="streak"]')).toHaveText('1');
  await expect(toast(page)).toHaveText('+1 hint earned 💡');
  await page.getByRole('button', { name: 'Next word →' }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).not.toHaveAttribute('aria-label', `Start: ${start}`);
  await expect(page.locator('[data-ref="hintCount"]')).toHaveText('1');
  await expect(page.locator('[data-ref="hint"]')).toBeEnabled();
});

test('Hard: par + 2 steps, then the streak ends and a solution is shown', async ({ page }) => {
  const start = puzzlePool(unlimitedPool, dict, 'hard')[0]!;
  const limit = dict.par(start)! + 2;
  await open(page, '/unlimited.html', { storage: runAt('hard', start, 3) });
  await expect(page.locator('.step-counter')).toHaveText(`Steps 0 / ${limit}`);
  await expect(page.getByRole('button', { name: 'Undo' })).toBeHidden();
  for (const word of wander(start, limit)) await typeWord(page, word);
  await expect(page.locator('[data-ref="resultMessage"]')).toHaveText('Out of steps!');
  await expect(page.locator('[data-ref="resultDetail"]')).toContainText(`One way: ${start} →`);
  await expect(page.locator('[data-ref="streak"]')).toHaveClass(/streak-ended/);
  await expect(page.locator('[data-ref="giveUp"]')).toBeDisabled();
  await page.getByRole('button', { name: 'Start a new run' }).click();
  await expect(page.locator('[data-ref="streak"]')).toHaveText('0');
  await expect(page.locator('[data-ref="label"]')).toHaveText('Hard');
});

test('Give up asks first, then ends the puzzle', async ({ page }) => {
  const start = puzzlePool(unlimitedPool, dict, 'medium')[1]!;
  await open(page, '/unlimited.html', { storage: runAt('medium', start, 2) });
  await page.locator('[data-ref="giveUp"]').click();
  const confirm = page.getByRole('dialog', { name: 'Give up?' });
  await expect(confirm).toContainText('Your streak of 2 ends');
  await confirm.getByRole('button', { name: 'Keep playing' }).click();
  await expect(page.locator('.key[data-key="A"]')).toBeEnabled();
  await page.locator('[data-ref="giveUp"]').click();
  await confirm.getByRole('button', { name: 'Give up', exact: true }).click();
  await expect(page.locator('[data-ref="resultMessage"]')).toHaveText('You gave up');
  await page.reload();
  await expect(page.locator('[data-ref="resultMessage"]')).toHaveText('You gave up');
  await expect(toast(page)).toHaveCount(0);
});
