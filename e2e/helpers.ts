import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { neighbours, shortestPath } from '../src/engine/solver';
import { Dictionary, type WordData } from '../src/engine/words';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

export const dict = new Dictionary(JSON.parse(read('public/data/words.json')) as WordData);
export const daily = JSON.parse(read('public/data/daily.json')) as string[];
export const unlimitedPool = JSON.parse(read('public/data/unlimited.json')) as string[];

/** Noon IST on puzzle `day` (#1 is 25 October 2026). */
export const dayTime = (day: number) =>
  new Date(Date.parse('2026-10-25T12:00:00+05:30') + (day - 1) * 86_400_000);

export const parPath = (start: string) => shortestPath(start, dict)!;

/** `n` legal steps from `start` that never reach MIGUEL. */
export function wander(start: string, n: number): string[] {
  const path = [start];
  while (path.length <= n) {
    const options = neighbours(path.at(-1)!, dict).filter(
      (w) => !path.includes(w) && w !== 'MIGUEL' && dict.fullDist(w)! >= 1,
    );
    path.push(options.sort((a, b) => dict.fullDist(b)! - dict.fullDist(a)!)[0]!);
  }
  return path.slice(1);
}

interface Setup {
  day?: number;
  /** Skip the first-visit How to play modal (default true). */
  seenIntro?: boolean;
  storage?: Record<string, unknown>;
}

/**
 * Pin the clock, stub sharing (shared text lands in window.__shared), seed localStorage once,
 * then open `path`.
 */
export async function open(page: Page, path: string, setup: Setup = {}): Promise<void> {
  await page.clock.setFixedTime(dayTime(setup.day ?? 1));
  const storage: Record<string, unknown> = { ...setup.storage };
  if (setup.seenIntro ?? true) storage['miggle.seenIntro'] = true;
  await page.addInitScript((seed) => {
    const w = window as unknown as { __shared: string[] };
    w.__shared = [];
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (text: string) => void w.__shared.push(text) },
      configurable: true,
    });
    // Seed only on the first load of the test, so reloads see the app's own saves.
    if (!sessionStorage.getItem('e2e-seeded')) {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
      sessionStorage.setItem('e2e-seeded', '1');
    }
  }, storage);
  await page.goto(path);
  await expect(page.locator('#game .keyboard')).toBeVisible();
}

export async function typeWord(page: Page, word: string): Promise<void> {
  await page.keyboard.type(word.toLowerCase());
  await page.keyboard.press('Enter');
}

export const rows = (page: Page) => page.locator('#game .row--word');
export const toast = (page: Page) => page.locator('.toast').last();
export const shared = (page: Page) =>
  page.evaluate(() => (window as unknown as { __shared: string[] }).__shared);
