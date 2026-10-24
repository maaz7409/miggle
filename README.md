# Miggle

A daily word ladder to **MIGUEL**. Start from a 6-letter word and reach MIGUEL in as few steps
as possible. Each step swaps exactly one letter for a different one, and you may rearrange the
letters however you like. Every step must be a real word.

Inspired by Feetle and Poople. Miggle is an independent project and is not affiliated with either.

## Development

Requires Node 20+.

```sh
npm install
npm run dev        # dev server
npm test           # unit tests (Vitest)
npm run lint       # ESLint + Prettier check
npm run format     # apply Prettier
npm run build      # type-check and build to dist/
npm run preview    # serve the production build
```

## Project layout

```
index.html          daily game page
src/config.ts       TARGET, WORD_LEN, EPOCH, RESET_HOUR_UTC
src/engine/         pure game logic (no DOM)
src/ui/             board, keyboard, modals, messages
src/styles/         tokens.css (palette, light/dark), base.css, game.css
scripts/            data pipeline and page generators
data-src/           raw word lists and curation files
public/data/        generated word data (committed)
tests/              Vitest tests
```

## Credits

- Display font: [Fredoka](https://fonts.google.com/specimen/Fredoka) (SIL Open Font License),
  self-hosted via Fontsource.
- Word list sources will be attributed here once the data pipeline lands.
