import { describe, expect, it } from 'vitest';
import { SITE_URL } from '../src/config';
import { resultMessage, scoreLadder } from '../src/engine/scoring';
import { shareText, streakShareText, tileColours } from '../src/engine/share';

const CASTLE_LADDER = ['CASTLE', 'CLAUSE', 'MUSCLE', 'MUESLI', 'MIGUEL'];

describe('scoreLadder / resultMessage', () => {
  it('scores a perfect solve', () => {
    const score = scoreLadder(CASTLE_LADDER, 4);
    expect(score).toEqual({ steps: 4, par: 4, extra: 0, perfect: true, underPar: false });
    expect(resultMessage(score)).toBe('Perfect! 4 steps 🥸');
  });

  it('scores extra steps', () => {
    const score = scoreLadder(CASTLE_LADDER, 2);
    expect(score).toMatchObject({ steps: 4, extra: 2, perfect: false, underPar: false });
    expect(resultMessage(score)).toBe('Made it in 4 steps (2 extra)');
  });

  it('scores a path under par', () => {
    const score = scoreLadder(CASTLE_LADDER, 5);
    expect(score).toMatchObject({ extra: -1, perfect: false, underPar: true });
    expect(resultMessage(score)).toBe('You found a path under par!');
  });

  it('uses the singular for one step', () => {
    expect(resultMessage(scoreLadder(['MIGGLE', 'MIGUEL'], 1))).toBe('Perfect! 1 step 🥸');
  });
});

describe('tileColours', () => {
  it('is all green for MIGUEL', () => {
    expect(tileColours('MIGUEL')).toEqual(Array(6).fill('green'));
  });

  it('marks letters elsewhere in MIGUEL amber', () => {
    expect(tileColours('MIGGLE')).toEqual(['green', 'green', 'green', 'grey', 'amber', 'amber']);
    expect(tileColours('CASTLE')).toEqual(['grey', 'grey', 'grey', 'grey', 'amber', 'amber']);
  });

  it('counts duplicate letters, letting greens claim first', () => {
    // MIGUEL has one L: the first L takes it, the second is grey.
    expect(tileColours('ILLUME')).toEqual(['amber', 'amber', 'grey', 'green', 'amber', 'amber']);
    // The G at index 2 is green, so the other Gs get nothing even though one comes first.
    expect(tileColours('GIGGLE')).toEqual(['grey', 'green', 'green', 'grey', 'amber', 'amber']);
  });

  it('takes a custom target', () => {
    expect(tileColours('FEET', 'FEET')).toEqual(['green', 'green', 'green', 'green']);
    expect(tileColours('TEEF', 'FEET')).toEqual(['amber', 'green', 'green', 'amber']);
  });
});

describe('shareText', () => {
  it('builds the spoiler-free grid', () => {
    expect(shareText({ day: 12, ladder: CASTLE_LADDER, par: 4, url: 'https://x.test' })).toBe(
      [
        'Miggle #12 4/4 🥸',
        '⬜⬜⬜⬜🟨🟨', // CASTLE
        '⬜🟨⬜🟩⬜🟨', // CLAUSE
        '🟩🟨⬜⬜🟨🟨', // MUSCLE
        '🟩🟨🟨⬜🟨🟨', // MUESLI
        '🟩🟩🟩🟩🟩🟩', // MIGUEL
        'https://x.test',
      ].join('\n'),
    );
  });

  it('flags hints and defaults to the site URL', () => {
    const text = shareText({ day: 3, ladder: CASTLE_LADDER, par: 4, hints: 2 });
    expect(text.split('\n')[0]).toBe('Miggle #3 4/4 🥸 💡×2');
    expect(text.split('\n').at(-1)).toBe(SITE_URL);
  });
});

describe('streakShareText', () => {
  it('brags about the streak', () => {
    expect(streakShareText(5, 9, 'https://x.test')).toBe(
      "🥸 I'm on a 5-day Miggle streak! (Best: 9) Can you keep up?\nhttps://x.test",
    );
    expect(streakShareText(1, 1)).toContain(SITE_URL);
  });
});
