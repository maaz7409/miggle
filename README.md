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
npm run pages      # generate content + answers pages, sitemap, robots (build runs this)
npm run coverage   # unit tests + coverage report
npm run e2e        # Playwright end-to-end tests (Chromium, Firefox, WebKit, mobile)
```

## Word data

`scripts/build_data.py` turns the curated sources in `data-src/` into `public/data/words.json`
(`{WORD: [fullDist, par|null]}`, where `-1` is a dead end) and `public/data/daily.json` (start words in
puzzle order), plus `public/data/unlimited.json` (the Unlimited start-word pool). The output is deterministic and committed, so building the site needs no network.

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
unlimited.html      Unlimited mode (Easy / Medium / Hard streaks)
content/            About, Privacy and How to play body fragments
scripts/gen_pages.ts  renders content pages, answers/ archive, sitemap.xml, robots.txt (gitignored output)
src/config.ts       TARGET, WORD_LEN, EPOCH, RESET_UTC (00:00 IST)
src/engine/         pure game logic (no DOM)
src/ui/             board, keyboard, modals, messages
src/styles/         tokens.css (palette, light/dark), base.css, game.css
scripts/            data pipeline and page generators
data-src/           raw word lists and curation files
public/data/        generated word data (committed)
tests/              Vitest tests
```

## Site URL, SEO and offline play

Set the public origin in `.env` (`VITE_SITE_URL`). It is used for share text, canonical and Open
Graph URLs, the sitemap and robots.txt. `public/sw.js` caches the game for offline play after the
first visit. Icons and the Open Graph image are rendered from `public/favicon.svg` and
`scripts/assets/` with `CHROME_PATH=... node scripts/render_images.mjs`.

## Deployment

Miggle is a static site hosted on **Vercel** (project `miggle`, production URL
<https://playmiggle.vercel.app>). The Vercel project is connected to this GitHub repo, so every
push to `main` builds and deploys automatically (`vercel.json` holds the build settings and cache
headers).

- **CI** (`.github/workflows/ci.yml`): lint, unit tests with coverage, a check that the committed
  word data matches its sources, build, and Playwright e2e on every push and pull request.
- **Daily rebuild** (`.github/workflows/daily-rebuild.yml`): at 18:35 UTC, just after the
  midnight-IST reset, it calls a Vercel deploy hook so the new day's answers page, the archive and
  the sitemap are published. The hook URL lives in the `VERCEL_DEPLOY_HOOK_URL` repository secret
  (`vercel deploy-hooks create`, then `gh secret set VERCEL_DEPLOY_HOOK_URL`).

### Launch checklist

- [x] Production `EPOCH`: puzzle #1 at 25 Oct 2026 00:00 IST (18:30 UTC), with a daily reset at
      midnight IST (`src/config.ts`, mirrored by `LAUNCH_UTC` in `scripts/build_data.py`).
- [x] `VITE_SITE_URL` in `.env` points at the production URL.
- [ ] Lint, unit tests, build and e2e pass in CI.
- [x] Vercel project connected to GitHub; production branch `main`.
- [ ] Daily rebuild hook stored as a GitHub secret, and the workflow triggered once by hand.
- [ ] Live site checked: game, Unlimited, answers, offline play, share text URL.
- [ ] Review `data-src/blocklist.txt` and `daily-exclude.txt` once more with fresh eyes.
- [ ] After launch, never run `npm run data -- --unfreeze`: published days are frozen
      automatically, and a removed word that was already published stops the build.

## Credits

- Display font: [Fredoka](https://fonts.google.com/specimen/Fredoka) (SIL Open Font License),
  self-hosted via Fontsource.
- Word list: [ENABLE](https://github.com/dolph/dictionary) (Enhanced North American Benchmark
  Lexicon), public domain.
- Word frequencies: [wordfreq](https://github.com/rspeer/wordfreq) by Robyn Speer. Its data is
  licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), and so is the derived
  `data-src/freq6.tsv`.
