export interface Score {
  steps: number;
  par: number;
  /** steps − par; negative when under par. */
  extra: number;
  perfect: boolean;
  underPar: boolean;
}

/** Score a finished ladder (start word first, MIGUEL last). */
export function scoreLadder(ladder: readonly string[], par: number): Score {
  const steps = ladder.length - 1;
  const extra = steps - par;
  return { steps, par, extra, perfect: extra === 0, underPar: extra < 0 };
}

/** "1 step", "2 steps". */
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The message shown when the ladder reaches MIGUEL. */
export function resultMessage(score: Score): string {
  if (score.underPar) return 'You found a path under par!';
  if (score.perfect) return `Perfect! ${plural(score.steps, 'step')} 🥸`;
  return `Made it in ${plural(score.steps, 'step')} (${score.extra} extra)`;
}

/** The nudge offered with "Try again" after a solve. */
export function retryPrompt(score: Score): string {
  if (score.underPar) return 'Under par! Can you find another way?';
  if (score.perfect) return 'Perfect! Now can you find a path under par?';
  return `Can you solve it in ${plural(score.par, 'step')}?`;
}
