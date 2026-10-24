# Miggle — a daily word ladder to MIGUEL

Miggle is a browser word game in the style of **Feetle** (feetle.fun), which is a ladder to FEET, and **Poople**, which is a ladder to POOP. The player starts from a 6-letter word and has to reach **MIGUEL**, one step at a time, in as few steps as possible.

The site is built in numbered sessions. When the user says **"Start N"**, follow the
[Session protocol](#session-protocol) and then do [Session N](#session-plan).

---

## 1. Research summary: how Feetle works (reference, Oct 2026)

Sources: feetle.fun (its HTML, plus the string table of game.js), feetle.online, dailydle.org,
feetlewordle.com (a clone), and the kirahichau/Feetle README.

### Rules
- Every word is 4 letters. The start word changes daily and the target is always **FEET**.
- Each step changes **exactly one letter, in place**. Letters cannot be added, removed or reordered.
- Every step must be a word in the game's dictionary. Feetle bundles about 2,550 common 4-letter words.
- **Par** is the length of the shortest path. Score = steps taken; "extra" = steps − par. Any finish counts as a win.
- The game uses **two word tiers**:
  - `distances.csv` gives par, computed over *common* words.
  - `words.csv` is the larger accepted list. Each word's value is its distance, `-1` for a dead end, or `-2` if the word is blocked.
  - Obscure but valid words can therefore beat par, which shows the message **"You found a path under par!"** with fireworks.

### Feetle's in-game messages (copy the pattern)
`Need 4 letters` · `Not in word list` · `Change exactly one letter` ·
`Dead end! That word can't reach FEET` · `Perfect! N steps 🦶` · `Made it in N steps (X extra)` ·
subheader `#N · Try to solve in P words` · `Next Feetle in H:MM:SS`.

### Feetle's features
- **Daily puzzle.** Everyone gets the same puzzle. `dayNumber = floor((now − EPOCH)/1 day) + 1`, and the day resets at **08:00 UTC**. The start word is `DAILY[(day−1) % DAILY.length]`, taken from `daily.csv`.
- **Board.** Rows of letter tiles. Letters that already match the target are highlighted (lime). It has an on-screen QWERTY keyboard (Enter and ⌫) and also takes physical keyboard input. An invalid word makes the row shake.
- **Intro modal** opens automatically on the first visit (`seenIntro` flag).
- **Stats modal** shows Wins, Streak and Best streak, plus a histogram keyed by extra steps.
  - Streak = consecutive days won (`lastWin === today − 1`).
  - After a win the modal offers "Can you solve it in P steps? Try again". It says "Perfect! Now can you find a path under par?" when you hit par.
  - **Retry** resets the board, but only the first solve counts toward stats (`counted` flag).
- **Share result**, copied to the clipboard:
  ```
  Feetle #15 6/5
  ⬜⬜⬜⬜     ← one row per word; 🦶 where letter == target letter at that position
  ...
  🦶🦶🦶🦶
  https://feetle.fun
  ```
  There is also a **Share streak** button: "🦶 I'm on a N-day Feetle streak! (Best: M) Can you keep up?…"
- **Yesterday's answer** shows yesterday's shortest path. There is also a **countdown** to the next puzzle.
- **Hints.** There are 2 per puzzle: (1) the first letter of the next shortest-path word, (2) that whole word. Hints don't change the score, but the share text flags them. **Undo** and **Restart** buttons are also available.
- **Unlimited mode** (/unlimited) has Easy, Medium and Hard. You play a streak of puzzles and roll for a hint when you solve one at par. In Hard, each word allows par + 2 steps and running out ends the streak. There is a "GIVE UP" button.
- **Answers archive** (/answer) lists every past puzzle (#N · START → FEET · date). Spoilers sit in `<details>` "Tap to reveal" blocks. This page is good for SEO.
- **Other pages:** About, Privacy, Blog, How to play. Feetle also has account sync, a "suggest a word" flow for rejected words, ads and GA4. **We skip ads, accounts and analytics, unless the user asks for them later.**
- **Storage:** everything lives in `localStorage` (state, stats, streak). No login.

### Other games in this genre
- **Poople** (poople.io) is the original "ladder to a funny word" game: daily, same for everyone, resets at 08:00 UTC, with a spoiler-free share grid.
- **Weaver** is a word ladder with a start and an end word, changing one letter at a time.
- **Doublets** is Lewis Carroll's 1877 original (HEAD → TAIL).
- **feetlewordle.com** (a clone) shows a "word trail" UI, "N moves / par", and an "Unlimited" tab.

---

## 2. The key design problem, and Miggle's rules (DECIDED)

**MIGUEL has no neighbours under Feetle's rule.** I verified this against ENABLE (172k words) and words_alpha (370k words):
there is no English word one in-place letter change away from MIGUEL, and none one insert or delete away either.
A straight Feetle clone therefore cannot be solved.

**Miggle's rule: "Change one letter, then shuffle."**
> Each step must be a real 6-letter word that uses the same letters as the previous word, with
> **exactly one letter swapped for a different one**. You may **rearrange** the letters in any order.
> MIGUEL is the only non-dictionary word allowed, and only as the final step.

- Formally, `multisetDiff(prev, next) == 1`: they share exactly 5 letters, counting duplicates.
  A pure anagram (0 changes) is **not** a valid step.
- **Gate words** (one step from MIGUEL, all common ones): MINGLE, LEGUME, HELIUM, MUESLI, GIMLET, MILIEU, UGLIER, ILLUME.
  ENABLE also allows MIGGLE (a marble!), GUILES, GLUMES, MILAGE, LIGULE, MIDLEG and others.
  **MIGGLE → MIGUEL** is a valid one-step move. Use it as the intro example or an Easter egg.
- Example ladders (verified):
  - `CASTLE → CLAUSE → MUSCLE → MUESLI → MIGUEL` (4)
  - `BRIDGE → FRIDGE → FIGURE → UGLIER → MIGUEL` (4)
  - `ORANGE → LONGER → LEGION → MINGLE → MIGUEL` (4)
  - `PLANET → PANELS → SALINE → SINGLE → MINGLE → MIGUEL` (5)
- **Feasibility check.** I used about 2,100 common 6-letter words (google-20k ∩ ENABLE) plus the gate words.
  Par distribution: 3: 98 · 4: 344 · **5: 730 · 6: 625** · 7: 202 · 8: 64 · 9+: 28.
  This sits close to Feetle's pars of 5–7.
- I also tested a fallback, in-place changes plus a gate hop at the end. It is **rejected**: it only works with obscure words.

**Tile colours** (rearranging makes positions fluid):
- 🟩 **green**: letter matches MIGUEL at this position.
- 🟨 **amber**: letter is in MIGUEL elsewhere. This is count-aware, like Wordle.
- ⬜ **grey**: letter is not in MIGUEL.
- The newly introduced letter in each row also gets a small dot or underline, so the player can see what changed.

**Share format**
```
Miggle #12 5/4 🥸
⬜🟨⬜⬜🟨🟩
...
🟩🟩🟩🟩🟩🟩
<site url>
```
Append ` 💡×N` to the first line if the player used hints.

**Other decisions**
- **Daily reset:** 08:00 UTC, which is the genre convention. `EPOCH` = the launch date, set in `src/config.ts`.
- **Repeat words:** a word already in the current ladder is rejected with "Already used".
- **Messages:** `Need 6 letters` · `Not in word list` · `Change exactly one letter` (wrong multiset diff) ·
  `You must change a letter — just shuffling isn't allowed` (pure anagram) · `Already used` ·
  `Dead end! That word can't reach MIGUEL` · `Perfect! N steps 🥸` · `Made it in N steps (X extra)` ·
  `You found a path under par!`
- **Branding:** Miggle is original. Use our own name, design, palette and copy. Never copy Feetle's assets or code, or imply any affiliation.
  The About page may say "inspired by Feetle and Poople".

---

## 3. Tech stack and conventions

- **Frontend:** Vite + vanilla **TypeScript** with no UI framework, because the game is small (Feetle is plain JS too). Plain CSS with custom-property tokens.
- **Tests:** Vitest for the engine and data invariants. Playwright for the end-to-end smoke tests (Session 8).
- **Data pipeline:** Python 3 script `scripts/build_data.py`, which uses only the standard library plus `wordfreq` if available.
  It writes JSON into `public/data/` and is committed, so the site needs no build-time network access.
- **Hosting:** fully static, on Cloudflare Pages, GitHub Pages or Netlify. There is no backend.
- **Storage:** `localStorage`, with every key prefixed `miggle.`. Every read and write goes through a try/catch wrapper (`src/storage.ts`).
- **Layout:**
  ```
  index.html, unlimited.html, answers/ (generated), about.html, privacy.html
  src/
    config.ts        TARGET, WORD_LEN, EPOCH, RESET_HOUR_UTC
    engine/          pure logic, no DOM: words.ts, rules.ts, solver.ts, daily.ts, scoring.ts, share.ts
    ui/              board.ts, keyboard.ts, modals.ts, messages.ts, animations.ts
    storage.ts, stats.ts, main.ts, unlimited.ts
    styles/          tokens.css, base.css, game.css
  scripts/build_data.py, scripts/gen_answers.ts
  data-src/          enable6.txt, freq6.tsv, enable-bases.txt + allowlist / blocklist / daily-exclude (curation)
  public/data/       words.json, daily.json (generated)
  tests/
  ```
- **Engine code:** must stay pure and DOM-free, so it can be unit-tested.
- **Commands** (keep this list current as they are added):
  - Available: `npm run dev`, `npm run build` (`tsc --noEmit` + `vite build`), `npm run preview`,
    `npm test` (Vitest, `tests/**/*.test.ts`), `npm run test:watch`, `npm run lint` (ESLint + `prettier --check`),
    `npm run format` (Prettier write), `npm run data` (`python3 scripts/build_data.py`; rebuilds `public/data/`),
    `npm run coverage` (Vitest + v8 coverage of `src/engine/**`, `storage.ts`, `stats.ts` and `today.ts`; thresholds: 95% lines,
    functions and statements, 90% branches).
  - Planned: `npm run e2e` (Session 8).
- **Word data facts (Session 2):**
  - `public/data/words.json` is `{WORD: [fullDist, par|null]}` with UPPERCASE keys, and includes `MIGUEL: [0, 0]`.
    `fullDist` is −1 for a dead end. `par` is null unless the word is common and reaches MIGUEL through common words.
  - `daily.json` is a plain array of start words; puzzle #N uses index `(N−1) % len`.
  - The common tier is wordfreq Zipf ≥ 3.0 plus the allowlist (about 3,400 words). There are 15,153 accepted words.
  - Daily starts need Zipf ≥ 3.2, par 4–7, no plural/-ed/-ing form, and one word per anagram family. Each par bucket is
    shuffled with seed 20261024 and the buckets are interleaved by smooth weighted round-robin. 1,362 puzzles (about 3.7 years).
  - Curation lives in `data-src/`: `allowlist.txt`, `blocklist.txt` and `daily-exclude.txt` (names and awkward topics: still
    valid steps, never a daily start). Frequencies are bundled in `data-src/freq6.tsv`, so builds are deterministic and need
    no `wordfreq`. `--refresh-freq` and `--import-enable` regenerate the sources.
  - With the larger common tier, some pars are lower than in §2's feasibility check, e.g. BRIDGE is par 3 via GLIDER → UGLIER.
- **Engine API (Session 3), all in `src/engine/`:**
  - `words.ts`:
    - `Dictionary` with `has`, `entry`, `fullDist`, `par` and `withKey(sortedKey)`.
    - `normalize`, `sortedKey`.
    - `loadGameData(baseUrl?, fetch?)` returns `{dict, daily}`. It is cached per URL and evicted on failure.
  - `rules.ts`:
    - `validateStep(ladder, input, dict)` returns `{ok, word, won}` or `{ok: false, error}`. The ladder includes the start word, and the
      previous word is `ladder.at(-1)`.
    - Check order: length → notWord → repeat → anagramOnly → notOneChange → deadEnd.
    - Also exports `multisetDiff`, `changedLetter` (letters kept in place are matched first, so the marker lands on the moved-in copy)
      and `STEP_ERROR_MESSAGES`.
  - `solver.ts`:
    - `neighbours`.
    - `nextOnShortestPath(word, dict, exclude?)`: from a word with a par it follows par − 1 over common words, so hints use familiar
      words. Otherwise it ranks by lowest fullDist, then common first, then alphabetically.
    - `shortestPath(start, dict)`.
  - `daily.ts`: `dayNumber` (clamped to ≥ 1 before launch), `dayStart`, `msUntilNext`, `startWord`, `formatCountdown`.
  - `scoring.ts`: `scoreLadder` (extra may be negative) and `resultMessage`.
  - `share.ts`: `tileColours` (Wordle-style, count-aware), `shareText`, `streakShareText`.
  - `config.ts` has a placeholder `SITE_URL = 'https://miggle.example'`.
  - `game.ts` (Session 4): an immutable `GameState` `{start, ladder, input, won}` that is plain JSON for persistence, with `newGame`,
    `typeLetter`, `deleteLetter`, `submit(state, dict)` → `{state, result}`, `undo`/`canUndo` (never past the start word, never after
    a win), `restart` and `stepsTaken`.
- **UI (Session 4):**
  - `ui/play.ts` `mountGame({root, dict, start, par, label, onWin})` builds the whole game view (info, goal strip, board, controls,
    result panel, keyboard) into `root`. Daily and Unlimited both mount through it.
  - `main.ts` holds the daily orchestration: data, day, today record, stats, modals and rollover (Session 5).
  - `ui/board.ts` re-renders every row on each update. Animations (`pop`, `bounce`, `shake`) are applied after rendering via
    `playAnimation`.
  - `ui/keyboard.ts` provides the on-screen keyboard and `bindPhysicalKeyboard`. It ignores modifier keys and form fields, and all keys while a `<dialog>` is open.
  - **Focus guard:** game buttons call `preventDefault` on `mousedown`, so a mouse click never leaves focus on a button that a physical
    Enter would press.
  - **Layout:** `body.game-page` is `100dvh` with the board scrolling internally and the keyboard pinned.
- **Persistence, stats and modals (Session 5):**
  - **Storage keys:** `miggle.today` (`{day, state, counted, solved}`), `miggle.stats` (`{wins, streak, bestStreak, lastWin, histogram}`)
    and `miggle.seenIntro`.
  - **Today record:** `today.ts` `loadToday` replays the saved ladder through `restoreGame` (engine). Another day, or any invalid
    save, gives a fresh game.
  - **Stats:** the histogram is keyed by raw extra steps (negative = under par). The display buckets are Under, Par, +1…+4 and
    +5 or more. `currentStreak(stats, today)` stays alive until a whole puzzle day is missed.
  - **First solve counts:** only the first solve of a day counts (`counted`). `solved` keeps that ladder, so it can still be
    shared during a retry.
  - **Clock:** `clock.ts` `now()` is the game clock. In dev only, `?date=YYYY-MM-DD` (noon UTC) or `?date=<ISO>` shifts it and it
    keeps ticking. The override is stripped from production builds.
  - **Rollover:** at the daily reset (timer, plus a check on `visibilitychange`), `main.ts` re-runs `startDay()` in place and
    toasts "A new Miggle is here!". It does not reload the page.
  - **Modals:** `ui/modals.ts` `openModal(title, nodes, onClose)` uses native `<dialog>`, one at a time.
    - Closing removes the dialog synchronously; otherwise focus lingers on a button in the closed dialog and swallows the next Enter.
    - Focus lands on the title.
    - Toasts move into the open dialog so they render above it.
    - Physical keys are ignored while a dialog is open.
  - **Views:** `ui/help.ts` (rules, an animated MIGGLE → MIGUEL demo that is static under reduced motion, a legend, an example
    ladder and the local reset time), `ui/stats-view.ts` and `ui/yesterday.ts`.
  - **Sharing:** `ui/share.ts` `share(text)` tries `navigator.share` (coarse pointer only), then the clipboard, then
    `execCommand('copy')`, then a manual-copy modal.
  - **Helpers:** `ui/dom.ts` has an `h()` element builder. The header has help, yesterday and stats icon buttons.
- **Tooling facts (Session 1):** Vite 8, TypeScript 6 (strict, `noUncheckedIndexedAccess`), Vitest 5, ESLint 10 flat config
  (`eslint.config.js`, typescript-eslint + eslint-config-prettier), Prettier 3 (single quotes, width 100; `CLAUDE.md` is
  prettier-ignored). ESLint forbids `window`/`document`/`localStorage`/`navigator` in `src/engine/**`.
- **Palette and font:** tokens live in `src/styles/tokens.css`: warm cream / plum in light mode, near-black / lilac in dark mode.
  Tile colours are green `#23884c`, amber `#e3a21a` (dark ink) and grey `#7a7280`. Dark mode follows the system setting, and
  `data-theme="light|dark"` on `<html>` overrides it (for the Session 8 settings). The display font is Fredoka Variable,
  self-hosted via `@fontsource-variable/fredoka`; body text uses the system font stack.
- **Design:** mobile-first, works at 360px wide, light and dark themes, keyboard-accessible, `prefers-reduced-motion` respected.

---

## Session protocol

When the user says **"Start N"**:
1. Re-read this file. Check the [Progress log](#progress-log) to confirm Sessions 1…N−1 are done.
   If one is missing, say so and ask whether to do it first.
2. Briefly state the plan for Session N, then do it. Stay within the session's scope.
   Note any ideas outside that scope in the log instead of building them.
3. Before finishing, run `npm test`, `npm run lint` and `npm run build` (whichever exist by then) and fix any failures.
4. Update the **Progress log** with what was done, any deviations, and follow-ups.
   Update the **Commands** list and other sections if facts changed.
5. Commit the session without asking (standing instruction from the user). Use a formal message:
   the subject is a short imperative sentence (e.g. `Build word data pipeline`) with no `Session N:` prefix,
   followed by a blank line and a body of concise imperative bullet points
   covering what was added or changed, and any deviations. Then summarise the session for the user.

---

## Session plan

### Session 1: Scaffold and tooling
- `git init` is already done. Create the Vite vanilla-TS project in place, with a `.gitignore` and a `README.md`.
- Add Vitest, ESLint and Prettier, and wire up the npm scripts.
- Create the folder layout from §3, `src/config.ts`, and the CSS tokens. Choose a palette (light and dark) and a font.
- Build a static placeholder page: header with the "MIGGLE" wordmark, an empty board area, and a footer.
- **Done when:** `npm run dev` serves the page, and `npm test` (with one sample test), lint and build all pass.

### Session 2: Word data pipeline
- `scripts/build_data.py`:
  1. Load ENABLE (public domain) as the **accepted** list of 6-letter words.
  2. Pick the **common** subset using word frequency (`wordfreq` Zipf ≥ ~3.0, or a bundled frequency list as fallback).
  3. Apply `data-src/blocklist.txt` to remove offensive words, slurs and awkward words. `allowlist.txt` force-includes words.
  4. Build the anagram-ladder graph. Bucket words by sorted letters. Neighbours are all words whose sorted key equals `remove 1 letter + add 1 letter`.
  5. Run a BFS from MIGUEL. Compute `par` over common words, and `fullDist` over all accepted words. Unreachable words are marked dead ends (−1).
  6. Generate the **daily list**: common words with par 4–7 and no blocklisted words. Shuffle with a fixed seed, spread out the difficulty, avoid repeats, and make it at least 3 years long.
  7. Output `public/data/words.json` as `{ word: [fullDist, par|null] }` (keep it compact) and `public/data/daily.json`.
  8. Print a report: counts, par histogram, size in KB, and sample paths.
- Add a `npm run data` script. Attribute the word sources in the README.
- **Tests:** every daily word is reachable; every gate word is at distance 1; no blocklisted words appear; the JSON size is under ~400 KB gzipped.
- **Done when:** the data is generated and committed, and the report looks sane (most daily pars are 4–7).

### Session 3: Game engine (pure TS)
- `rules.ts`:
  - `validateStep(prev, next, ladder)` returns an `ok` result or a specific error code: `length`, `notWord`, `notOneChange`, `anagramOnly`, `repeat`, `deadEnd`.
  - `multisetDiff`.
  - `changedLetter(prev, next)`, used for the UI's "new letter" marker.
- `solver.ts`:
  - `nextOnShortestPath(word)` via the dist map (pick a neighbour with dist − 1, preferring common words).
  - `shortestPath(start)`.
- `daily.ts`: `dayNumber(now)`, `startWord(day)`, `msUntilNext(now)`, all handling the 08:00 UTC reset.
- `scoring.ts`: steps, par, extra, underPar.
- `share.ts`: tile colouring (green, amber, grey, count-aware) and the share text builder.
- `words.ts`: load and cache the JSON.
- **Tests:** thorough unit tests, including UTC edge cases, duplicate letters (e.g. MIGGLE, ILLUME) and the verified example ladders from §2.
- **Done when:** the engine has high test coverage and no DOM imports.

### Session 4: Core game UI (daily play)
- Board: one row per word in the ladder plus the current input row. Tiles are coloured per §2, with the new-letter marker. The board auto-scrolls to the latest row.
- On-screen keyboard (QWERTY, Enter, ⌫) plus physical keyboard support. Input is capped at 6 letters.
- Top area: the start word, a MIGUEL target strip, `#N · Try to solve in P steps`, and a step counter.
- Message toast for errors, a shake animation on invalid input, and a win animation (tiles flip or bounce; fireworks if under par).
- Undo (back one word, never below the start word) and Restart.
- Hook up the daily puzzle with real data.
- **Done when:** the daily puzzle can be played end to end on mobile and desktop.

### Session 5: Persistence, stats and sharing
- Save and restore the day's state (`miggle.today`), so a reload keeps progress. A new day resets it.
- Stats (`miggle.stats`): wins, histogram by extra steps, current and best streak, `lastWin`, and the `counted` flag. Only the first solve of the day counts.
- Modals:
  - **How to play**: auto-opens on the first visit and includes an animated example (MIGGLE → MIGUEL).
  - **Stats**: includes the "Try again for par" prompt.
  - **Yesterday's answer**: shows the shortest path.
- Share result and Share streak buttons. Use the clipboard API, fall back to a textarea, and use `navigator.share` on mobile.
- Countdown to the next puzzle, with an automatic reload at reset.
- **Done when:** reloads, streaks and day rollover behave correctly. Test this by mocking the date (add a dev-only `?date=` override).

### Session 6: Hints and Unlimited mode
- Daily hints, 2 per puzzle:
  1. Which letter to drop and the letter to add, e.g. "swap an **S** for a **G**".
  2. The full next word.
  - Track hint use in the state, and add the 💡 flag to the share text.
- `unlimited.html`:
  - Difficulty picker: Easy par 3–4, Medium 5–6, Hard 7+. Puzzles are random and never repeat within a streak.
  - Streak counter, a "Next word" button, GIVE UP with confirmation, and separate unlimited stats.
  - Hard rule: each puzzle allows par + 2 steps, and running out ends the streak.
  - Earn a hint by solving at par.
- **Done when:** both modes work and share code with the daily mode, with no duplication.

### Session 7: Content pages, SEO and PWA
- `scripts/gen_answers.ts` generates static `answers/index.html` (archive, newest first, up to today only) plus one page per past puzzle. Each page has the start word, the par, progressive hints, and the path hidden behind `<details>`. Run it at build time.
- Add About (credits: inspired by Feetle and Poople, word-list attribution), Privacy (no tracking, localStorage only) and a standalone How to play page.
- Meta tags, Open Graph and Twitter images, favicon and icons, `site.webmanifest`, a simple service worker for offline play, `sitemap.xml` and `robots.txt`.
- **Done when:** Lighthouse scores ≥ 95 for Performance, Accessibility, Best Practices and SEO on mobile.

### Session 8: Polish, QA and deploy
- Settings modal: theme (system, light, dark), high-contrast colours, and reduced motion.
- Accessibility pass:
  - ARIA live region for messages and labelled tiles, e.g. "M, green".
  - Focus management in modals and full keyboard-only play.
  - Colour-blind-safe palette.
- Playwright e2e: play a daily puzzle to the finish, invalid-word cases, persistence across reload, the share text, and Unlimited Hard.
- Cross-browser check (Chromium, WebKit, Firefox) and mobile viewport checks.
- Deploy configuration (Cloudflare Pages or GitHub Pages workflow), a production `EPOCH`, and a launch checklist in README.
- **Done when:** CI runs lint, test, build and e2e green, and the site is deployed (only after the user confirms where and when).

### Later ideas (not scheduled)
Word-suggestion feedback form, archive replay of past dailies, accounts or cloud sync, analytics, localisation.

---

## Progress log

| Session | Status | Notes |
|---|---|---|
| 0 Planning | ✅ done 2026-10-24 | Researched Feetle, Poople and clones. Chose the "change one letter + shuffle" rule because MIGUEL has no in-place neighbours. Wrote this plan. |
| 1 Scaffold | ✅ done 2026-10-24 | Hand-written Vite vanilla-TS scaffold (no create-vite), Vitest/ESLint/Prettier wired, §3 folders (empty ones hold `.gitkeep`), `src/config.ts` (+ `STORAGE_PREFIX`; placeholder `EPOCH` = 2026-10-24 08:00 UTC), tokens/base/game CSS, placeholder page (wordmark, 5 empty rows + a green MIGUEL row, footer). Inline 🥸 SVG favicon until Session 7. Checked at 360px in light and dark. **Follow-ups:** a `SITE_URL` config value for the share text (Session 3/5); verify the amber/green tile contrast and colour-blind safety in Session 8. |
| 2 Word data | ✅ done 2026-10-24 | `scripts/build_data.py` + `npm run data`. Report: 15,153 accepted words (79 blocked), 3,398 common, 91 dead ends; common par histogram 1: 8 · 2: 25 · 3: 175 · 4: 670 · **5: 1,303 · 6: 795** · 7: 196 · 8+: 60; daily list 1,362 puzzles (par 4: 253 · 5: 578 · 6: 406 · 7: 125); `words.json` 257 KB raw / 55 KB gzip. Tests in `tests/data.test.ts` cover the BFS invariants for fullDist and par, gate words at [1, 1], the example ladders, daily-list rules, blocklist removal and size. **Deviations:** added `data-src/daily-exclude.txt`, a bundled `freq6.tsv` and `enable-bases.txt` (inflection filter), `@types/node`; daily Zipf floor lowered from 3.5 to 3.2 to reach three years. **Follow-ups:** freeze already-published days before any post-launch data rebuild, because `daily.json` order changes when curation changes (Session 8); the blocklist is a first pass, so review it again before launch; credit wordfreq (CC BY-SA 4.0) and ENABLE on the About page (Session 7); hints could avoid awkward-but-valid words (Session 6). |
| 3 Engine | ✅ done 2026-10-24 | Pure engine in `src/engine/` (words, rules, solver, daily, scoring, share), with no DOM access (enforced by ESLint). 85 tests: a fixture dictionary plus real data, every daily word's shortest path equals its par and validates step by step, the §2 ladders, UTC reset, leap-day and time-zone edges, and duplicate letters (MIGGLE, ILLUME, GIGGLE). Engine coverage is 100% of lines and 99% of branches. Added `@vitest/coverage-v8`, `npm run coverage`, `SITE_URL`, and `tests/helpers.ts`; `tests/data.test.ts` now reuses the engine's `neighbours`. **Deviations:** `validateStep(ladder, input, dict)` replaces the plan's `(prev, next, ladder)`, because the previous word is always the last one in the ladder. Result and error messages live in the engine (`STEP_ERROR_MESSAGES`, `resultMessage`) so daily and unlimited modes share them. Added `formatCountdown`, `dayStart` and `streakShareText`. **Follow-ups:** set the real `SITE_URL` (Session 8); the stats histogram needs an "under par" bucket, because extra can be negative (Session 5). |
| 4 Game UI | ✅ done 2026-10-24 | Daily puzzle playable end to end. Added `src/engine/game.ts` (state machine, 7 tests) and `ui/` `board`, `keyboard`, `messages` (toast in an aria-live region), `animations` (shake, pop, bounce, fireworks that are skipped under reduced motion) and `play.ts` (shared controller). Checked in headless Chromium at 360×740 and 360×640 (light and dark) and 1280×800: all error toasts and shakes, input capped at 6, on-screen and physical keys, the new-letter marker, undo/restart, a par win ("Perfect! 5 steps 🥸"), an under-par win with fireworks, no horizontal overflow, no console errors. **Deviations:** removed the footer and tagline from the game page to fit a pinned keyboard (About/Privacy links come back in Session 7, e.g. in a header menu); `--tile-size` now fits 6 tiles inside the gutters at 360px; an inline result panel with "Try again" stands in until the Session 5 stats modal. **Follow-ups:** Session 5 needs `mountGame` to take an initial state and an `onChange` callback for persistence, plus header icon buttons (help, stats); Session 8 should add labelled tiles and keyboard focus checks. **Idea, not built:** a shortcut to copy the previous word into the input, since every step retypes 5 of the 6 letters. |
| 5 Persistence/stats/share | ✅ done 2026-10-24 | Added `storage.ts`, `clock.ts`, `stats.ts`, `today.ts`, `restoreGame`/`isSolved`/`retryPrompt` in the engine, the modals (How to play, Stats, Yesterday's answer), Share result / Share streak, the countdown and in-place rollover. `mountGame` gained `initialState`, `onChange`, `onShare` and `getState()`/`retry()`. 119 tests; coverage now includes storage, stats and today (99.6% of lines). Browser-checked with `?date=`: first-visit help, reload keeps half-typed input, the win opens stats, the exact share text, a post-retry solve not counted, a solved day restored on reload, day 2 streak 2 with Yesterday's answer, a missed day resetting the streak to 0 (best kept), and a live rollover from #4 to #5 at 08:00 UTC. No console errors. **Bugs found and fixed:** keys were dropped, and an Enter swallowed, right after a modal closed (focus lingered in the closing `<dialog>`); the help legend layout; the focus ring on the close button. **Deviations:** the reset re-initialises in place instead of reloading the page; Stats auto-opens on reload when today is already solved; the inline result panel gained a Share button. **Follow-ups:** Session 6 hints need a `hints` field in `TodayRecord` and in the share text; Session 8 Playwright e2e can reuse the `?date=` flows above (wait for dialogs before pressing keys). |
| 6 Hints + Unlimited | ⬜ | |
| 7 Content/SEO/PWA | ⬜ | |
| 8 Polish/QA/deploy | ⬜ | |
