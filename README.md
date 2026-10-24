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
npm run data       # rebuild public/data/ from data-src/ (Python 3, stdlib only)
```

## Word data

`scripts/build_data.py` turns the curated sources in `data-src/` into `public/data/words.json`
(`{WORD: [fullDist, par|null]}`, where `-1` is a dead end) and `public/data/daily.json` (start words in
puzzle order). The output is deterministic and committed, so building the site needs no network.

| File                         | Purpose                                                           |
| ---------------------------- | ----------------------------------------------------------------- |
| `data-src/enable6.txt`       | 6-letter words from ENABLE: the accepted list                     |
| `data-src/enable-bases.txt`  | 3–5 letter ENABLE words, used to spot plurals and -ed/-ing forms  |
| `data-src/freq6.tsv`         | Zipf frequencies from wordfreq: decides the "common" tier (par)   |
| `data-src/allowlist.txt`     | Forced into the common tier (e.g. the gate words next to MIGUEL)  |
| `data-src/blocklist.txt`     | Removed entirely (slurs, profanity, awkward words)                |
| `data-src/daily-exclude.txt` | Valid steps, but never a daily start word (names, awkward topics) |

After editing a curation list, run `npm run data` and `npm test`. To refresh the sources:

```sh
python3 scripts/build_data.py --import-enable path/to/enable1.txt   # new ENABLE copy
pip install wordfreq && python3 scripts/build_data.py --refresh-freq   # new frequencies
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
- Word list: [ENABLE](https://github.com/dolph/dictionary) (Enhanced North American Benchmark
  Lexicon), public domain.
- Word frequencies: [wordfreq](https://github.com/rspeer/wordfreq) by Robyn Speer. Its data is
  licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), and so is the derived
  `data-src/freq6.tsv`.
