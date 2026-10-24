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

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The message shown when the ladder reaches MIGUEL. */
export function resultMessage(score: Score): string {
  if (score.underPar) return 'You found a path under par!';
  if (score.perfect) return `Perfect! ${plural(score.steps, 'step')} 🥸`;
  return `Made it in ${plural(score.steps, 'step')} (${score.extra} extra)`;
}
