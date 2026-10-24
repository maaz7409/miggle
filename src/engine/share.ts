import { SITE_URL, TARGET } from '../config';

export type TileColour = 'green' | 'amber' | 'grey';

export const TILE_EMOJI: Readonly<Record<TileColour, string>> = {
  green: '🟩',
  amber: '🟨',
  grey: '⬜',
};

/**
 * Wordle-style colours against `target`: green = right letter in the right place, amber = letter
 * elsewhere in the target (counting duplicates, greens claimed first), grey = not (or no more) in it.
 */
export function tileColours(word: string, target = TARGET): TileColour[] {
  const colours: TileColour[] = [...word].map(() => 'grey');
  const left = new Map<string, number>();
  for (let i = 0; i < word.length; i++) {
    if (word[i] === target[i]) colours[i] = 'green';
    else left.set(target[i]!, (left.get(target[i]!) ?? 0) + 1);
  }
  for (let i = 0; i < word.length; i++) {
    const n = left.get(word[i]!) ?? 0;
    if (colours[i] === 'green' || n === 0) continue;
    colours[i] = 'amber';
    left.set(word[i]!, n - 1);
  }
  return colours;
}

export interface ShareInput {
  day: number;
  /** The finished ladder, start word first and MIGUEL last. */
  ladder: readonly string[];
  par: number;
  hints?: number;
  url?: string;
}

/** Spoiler-free result: header, one emoji row per word, then the site URL. */
export function shareText({ day, ladder, par, hints = 0, url = SITE_URL }: ShareInput): string {
  const header = `Miggle #${day} ${ladder.length - 1}/${par} 🥸${hints > 0 ? ` 💡×${hints}` : ''}`;
  const rows = ladder.map((w) =>
    tileColours(w)
      .map((c) => TILE_EMOJI[c])
      .join(''),
  );
  return [header, ...rows, url].join('\n');
}

export function streakShareText(streak: number, best: number, url = SITE_URL): string {
  return `🥸 I'm on a ${streak}-day Miggle streak! (Best: ${best}) Can you keep up?\n${url}`;
}
