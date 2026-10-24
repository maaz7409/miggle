/**
 * Generates the static pages, run before every build (`npm run pages`):
 *   about.html, privacy.html, how-to-play.html   from content/*.html fragments
 *   answers/index.html                            archive of puzzles up to today, newest first
 *   answers/<N>/index.html                        progressive hints + the full path behind <details>
 *   public/sitemap.xml, public/robots.txt
 * All outputs are gitignored. "Today" is the current puzzle, or MIGGLE_TODAY=YYYY-MM-DD for tests.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { parseDateParam } from '../src/clock';
import { TARGET } from '../src/config';
import { dayNumber, dayStart, startWord } from '../src/engine/daily';
import { describeHint, nextHint } from '../src/engine/hints';
import { changedLetter } from '../src/engine/rules';
import { tileColours } from '../src/engine/share';
import { shortestPath } from '../src/engine/solver';
import { Dictionary, type WordData } from '../src/engine/words';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string) => readFileSync(ROOT + path, 'utf8');

export interface SiteContext {
  /** Public origin, no trailing slash. */
  site: string;
  dict: Dictionary;
  daily: readonly string[];
  /** Latest puzzle to publish. */
  today: number;
}

interface PageSpec {
  /** Site path, e.g. "/answers/3/". */
  path: string;
  title: string;
  description: string;
  body: string;
  /** Which tab is current. */
  tab?: 'answers';
}

/** Relative prefix from `path` back to the site root ("./", "../", "../../"). */
export function rootPrefix(path: string): string {
  const depth = path.split('/').length - 2;
  return depth <= 0 ? './' : '../'.repeat(depth);
}

export function formatDate(day: number): string {
  return new Date(dayStart(day)).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Tile rows for a ladder, coloured and marked exactly as in the game. */
export function ladderHtml(ladder: readonly string[]): string {
  const rows = ladder.map((word, i) => {
    const colours = tileColours(word);
    const marked = i > 0 ? changedLetter(ladder[i - 1]!, word)?.index : undefined;
    const tiles = [...word]
      .map(
        (ch, j) =>
          `<span class="tile" data-state="${colours[j]}"${j === marked ? ' data-new' : ''}>${ch}</span>`,
      )
      .join('');
    return `<div class="row" role="img" aria-label="${word}">${tiles}</div>`;
  });
  return `<div class="board board--compact">${rows.join('')}</div>`;
}

export function layout(ctx: SiteContext, page: PageSpec): string {
  const root = rootPrefix(page.path);
  const url = `${ctx.site}${page.path}`;
  const tab = (href: string, label: string, current: boolean) =>
    `<a href="${root}${href}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${page.title}</title>
    <meta name="description" content="${page.description}" />
    <link rel="canonical" href="${url}" />
    <meta name="theme-color" content="#fbf6ee" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#16121b" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Miggle" />
    <meta property="og:title" content="${page.title}" />
    <meta property="og:description" content="${page.description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${ctx.site}/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="The Miggle logo beside a word ladder from CASTLE to MIGUEL" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="module" src="/src/content.ts"></script>
  </head>
  <body class="content-page">
    <header class="site-header site-header--simple">
      <a class="wordmark" href="${root}">MIGGLE</a>
    </header>
    <nav class="mode-tabs" aria-label="Game mode">
      ${tab('', 'Daily', false)}
      ${tab('unlimited.html', 'Unlimited', false)}
      ${tab('answers/', 'Answers', page.tab === 'answers')}
    </nav>
    <main class="article">
${page.body}
    </main>
    <footer class="site-footer">
      <nav class="footer-links" aria-label="Site">
        <a href="${root}how-to-play.html">How to play</a>
        <a href="${root}answers/">Answers</a>
        <a href="${root}about.html">About</a>
        <a href="${root}privacy.html">Privacy</a>
      </nav>
      <p>Miggle is an independent fan project, not affiliated with Feetle or Poople.</p>
    </footer>
  </body>
</html>
`;
}

/** A content fragment with `{{root}}` links and `<!-- ladder: A B C -->` markers expanded. */
export function renderFragment(fragment: string, path: string): string {
  return fragment
    .replaceAll('{{root}}', rootPrefix(path))
    .replace(/<!-- ladder: ([A-Z ]+) -->/g, (_, words: string) =>
      ladderHtml(words.trim().split(/\s+/)),
    );
}

function details(summary: string, content: string, cls = ''): string {
  return `<details${cls ? ` class="${cls}"` : ''}><summary>${summary}</summary><div class="reveal">${content}</div></details>`;
}

export function answerPage(ctx: SiteContext, day: number): PageSpec {
  const start = startWord(day, ctx.daily);
  const path = shortestPath(start, ctx.dict)!;
  const par = path.length - 1;
  const first = nextHint([start], ctx.dict)!;
  const isToday = day === ctx.today;
  const nav = [
    day > 1 ? `<a href="../${day - 1}/">← #${day - 1}</a>` : '',
    `<a href="../">All answers</a>`,
    day < ctx.today ? `<a href="../${day + 1}/">#${day + 1} →</a>` : '',
  ].filter(Boolean);
  const body = `
<p class="eyebrow">${formatDate(day)}</p>
<h1>Miggle #${day} answer</h1>
<p class="lede"><strong>${start}</strong> to <strong>${TARGET}</strong> in a par of <strong>${par} steps</strong>.</p>
${ladderHtml([start])}
${isToday ? `<p class="note">This is today's puzzle. Hints and the answer stay hidden until you tap.</p>` : ''}
<h2>Hints</h2>
${details('Hint 1: the first swap', `<p>${describeHint(first, 1)}.</p>`)}
${details('Hint 2: the first word', `<p>${first.next}</p>`)}
${details(`Hint 3: the last word before ${TARGET}`, `<p>${path.at(-2)}</p>`)}
<h2>Answer</h2>
${details(
  'Tap to reveal the full answer',
  `<p>${path.join(' → ')}</p>${ladderHtml(path)}<p class="muted">One par path; other routes may tie it, and rare words can even beat it.</p>`,
  'answer',
)}
<p class="cta"><a class="btn btn--primary" href="../../">Play today's Miggle</a></p>
<nav class="pager" aria-label="Puzzles">${nav.join('')}</nav>`;
  return {
    path: `/answers/${day}/`,
    title: `Miggle #${day} answer (${start} to ${TARGET}): hints and solution`,
    description: `Stuck on Miggle #${day}? Get step-by-step hints for ${start}, then reveal the par-${par} path to ${TARGET}.`,
    body,
    tab: 'answers',
  };
}

export function archivePage(ctx: SiteContext): PageSpec {
  const items: string[] = [];
  for (let day = ctx.today; day >= 1; day--) {
    const start = startWord(day, ctx.daily);
    items.push(
      `<li><a href="${day}/"><strong>#${day}</strong> · ${start} → ${TARGET}</a><span>${formatDate(day)} · par ${ctx.dict.par(start)}</span></li>`,
    );
  }
  return {
    path: '/answers/',
    title: 'Miggle answers: every past puzzle, with hints',
    description: `Hints and solutions for every Miggle puzzle so far, from #${ctx.today} back to #1.`,
    body: `
<h1>Miggle answers</h1>
<p class="lede">Every puzzle so far, newest first. Each page has gentle hints before the full answer.</p>
<ol class="archive" reversed>${items.join('')}</ol>`,
    tab: 'answers',
  };
}

export function sitemap(ctx: SiteContext): string {
  const isoDate = (day: number) => new Date(dayStart(day)).toISOString().slice(0, 10);
  const urls = [
    '/',
    '/unlimited.html',
    '/how-to-play.html',
    '/about.html',
    '/privacy.html',
    '/answers/',
  ].map((p) => `<url><loc>${ctx.site}${p}</loc></url>`);
  for (let day = ctx.today; day >= 1; day--) {
    urls.push(
      `<url><loc>${ctx.site}/answers/${day}/</loc><lastmod>${isoDate(day)}</lastmod></url>`,
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

export function robots(ctx: SiteContext): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${ctx.site}/sitemap.xml\n`;
}

const CONTENT_PAGES: Omit<PageSpec, 'body'>[] = [
  {
    path: '/how-to-play.html',
    title: 'How to play Miggle: rules, colours and tips',
    description:
      'Learn Miggle in a minute: swap one letter, shuffle, and climb a word ladder to MIGUEL. Rules, tile colours, par, hints and streaks.',
  },
  {
    path: '/about.html',
    title: 'About Miggle',
    description:
      'Why Miggle lets you shuffle letters, what inspired it, and credits for the word list, word frequencies and font.',
  },
  {
    path: '/privacy.html',
    title: 'Miggle privacy notice',
    description: 'Miggle has no accounts, ads or tracking. Your progress stays in your browser.',
  },
];

function write(path: string, contents: string): void {
  const file = ROOT + path;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

export function loadContext(): SiteContext {
  const env = loadEnv('production', ROOT, 'VITE_');
  const site = (env.VITE_SITE_URL ?? 'https://miggle.example').replace(/\/$/, '');
  const dict = new Dictionary(JSON.parse(read('public/data/words.json')) as WordData);
  const daily = JSON.parse(read('public/data/daily.json')) as string[];
  const when = process.env.MIGGLE_TODAY ? parseDateParam(process.env.MIGGLE_TODAY) : Date.now();
  if (Number.isNaN(when)) throw new Error(`Bad MIGGLE_TODAY: ${process.env.MIGGLE_TODAY}`);
  return { site, dict, daily, today: dayNumber(when) };
}

function main(): void {
  const ctx = loadContext();
  for (const spec of CONTENT_PAGES) {
    const fragment = read(`content${spec.path}`);
    write(spec.path, layout(ctx, { ...spec, body: renderFragment(fragment, spec.path) }));
  }
  rmSync(ROOT + 'answers', { recursive: true, force: true });
  write('answers/index.html', layout(ctx, archivePage(ctx)));
  for (let day = 1; day <= ctx.today; day++) {
    write(`answers/${day}/index.html`, layout(ctx, answerPage(ctx, day)));
  }
  write('public/sitemap.xml', sitemap(ctx));
  write('public/robots.txt', robots(ctx));
  console.log(
    `pages: ${CONTENT_PAGES.length} content, ${ctx.today} answers (up to #${ctx.today}), sitemap for ${ctx.site}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
