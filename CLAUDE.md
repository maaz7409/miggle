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
  data-src/          raw word lists + blocklist.txt + allowlist.txt (curation)
  public/data/       words.json, daily.json (generated)
  tests/
  ```
- **Engine code:** must stay pure and DOM-free, so it can be unit-tested.
- **Commands** (keep this list current as they are added):
  - Available: `npm run dev`, `npm run build` (`tsc --noEmit` + `vite build`), `npm run preview`,
    `npm test` (Vitest, `tests/**/*.test.ts`), `npm run test:watch`, `npm run lint` (ESLint + `prettier --check`),
    `npm run format` (Prettier write).
  - Planned: `npm run data` (rebuilds the word data, Session 2), `npm run e2e` (Session 8).
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
| 2 Word data | ⬜ | |
| 3 Engine | ⬜ | |
| 4 Game UI | ⬜ | |
| 5 Persistence/stats/share | ⬜ | |
| 6 Hints + Unlimited | ⬜ | |
| 7 Content/SEO/PWA | ⬜ | |
| 8 Polish/QA/deploy | ⬜ | |
