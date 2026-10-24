import { describe, expect, it } from 'vitest';
import {
  answerPage,
  archivePage,
  formatDate,
  ladderHtml,
  layout,
  renderFragment,
  robots,
  rootPrefix,
  sitemap,
  type SiteContext,
} from '../scripts/gen_pages';
import { startWord } from '../src/engine/daily';
import { tileColours } from '../src/engine/share';
import { shortestPath } from '../src/engine/solver';
import { daily, readRepoFile, realDict } from './helpers';

const ctx: SiteContext = { site: 'https://x.test', dict: realDict, daily, today: 5 };

/** Page HTML with every <details> block removed: what a visitor sees without tapping. */
const withoutDetails = (html: string) => html.replace(/<details[\s\S]*?<\/details>/g, '');

describe('ladderHtml', () => {
  it('colours tiles and marks the new letter exactly like the game', () => {
    const html = ladderHtml(['MIGGLE', 'MIGUEL']);
    const rows = [...html.matchAll(/<div class="row"[^>]*>(.*?)<\/div>/g)].map((m) => m[1]!);
    expect(rows).toHaveLength(2);
    const states = (row: string) => [...row.matchAll(/data-state="(\w+)"/g)].map((m) => m[1]);
    expect(states(rows[0]!)).toEqual(tileColours('MIGGLE'));
    expect(states(rows[1]!)).toEqual(tileColours('MIGUEL'));
    expect(rows[0]).not.toContain('data-new');
    expect(rows[1]).toContain('data-state="green" data-new>U<');
  });
});

describe('answer pages', () => {
  it('hide every word of the path except the start word until tapped', () => {
    for (let day = 1; day <= ctx.today; day++) {
      const page = answerPage(ctx, day);
      const start = startWord(day, daily);
      const path = shortestPath(start, realDict)!;
      const visible = withoutDetails(layout(ctx, page));
      expect(visible, `#${day}`).toContain(start);
      for (const word of path.slice(1, -1))
        expect(visible, `#${day} leaks ${word}`).not.toContain(word);
      expect(page.body).toContain(path.join(' → '));
      expect(page.body).toContain(`par of <strong>${path.length - 1} steps</strong>`);
    }
  });

  it('flags today, links neighbours and never links past today', () => {
    const today = answerPage(ctx, 5).body;
    expect(today).toContain("This is today's puzzle");
    expect(today).toContain('href="../4/"');
    expect(today).not.toContain('href="../6/"');
    const first = answerPage(ctx, 1).body;
    expect(first).not.toContain("today's puzzle. Hints");
    expect(first).not.toContain('href="../0/"');
  });

  it('has a unique title, description and canonical URL', () => {
    const html = layout(ctx, answerPage(ctx, 3));
    expect(html).toContain(`<title>Miggle #3 answer (${startWord(3, daily)} to MIGUEL)`);
    expect(html).toContain('<link rel="canonical" href="https://x.test/answers/3/" />');
    expect(html).toContain('<meta property="og:image" content="https://x.test/og.png" />');
    expect(html).toContain('<a href="../../how-to-play.html">');
  });
});

describe('archive, sitemap and robots', () => {
  it('lists puzzles newest first, up to today only', () => {
    const body = archivePage(ctx).body;
    const days = [...body.matchAll(/<strong>#(\d+)<\/strong>/g)].map((m) => Number(m[1]));
    expect(days).toEqual([5, 4, 3, 2, 1]);
    expect(body).toContain(formatDate(5));
  });

  it('maps every page', () => {
    const xml = sitemap(ctx);
    for (const path of [
      '/',
      '/unlimited.html',
      '/how-to-play.html',
      '/about.html',
      '/privacy.html',
      '/answers/',
      '/answers/5/',
      '/answers/1/',
    ]) {
      expect(xml).toContain(`<loc>https://x.test${path}</loc>`);
    }
    expect(xml).not.toContain('/answers/6/');
    expect(xml).toContain('/answers/1/</loc><lastmod>2026-10-25</lastmod>');
    expect(robots(ctx)).toContain('Sitemap: https://x.test/sitemap.xml');
  });
});

describe('branding', () => {
  it('never names other games on public pages', () => {
    const pages = [
      layout(ctx, archivePage(ctx)),
      layout(ctx, answerPage(ctx, 1)),
      ...['about', 'privacy', 'how-to-play'].map((name) =>
        renderFragment(readRepoFile(`content/${name}.html`), `/${name}.html`),
      ),
      readRepoFile('index.html'),
      readRepoFile('unlimited.html'),
      readRepoFile('README.md'),
    ];
    // Names of other word games, stored reversed so the repo itself never spells them out.
    const banned = new RegExp(
      ['elteef', 'elpoop'].map((w) => [...w].reverse().join('')).join('|'),
      'i',
    );
    for (const html of pages) expect(html).not.toMatch(banned);
  });
});

describe('content fragments', () => {
  it('expand root links and ladder markers', () => {
    expect(rootPrefix('/about.html')).toBe('./');
    expect(rootPrefix('/answers/')).toBe('../');
    expect(rootPrefix('/answers/12/')).toBe('../../');
    const html = renderFragment(readRepoFile('content/how-to-play.html'), '/how-to-play.html');
    expect(html).not.toContain('{{root}}');
    expect(html).not.toContain('<!-- ladder:');
    expect(html).toContain('aria-label="MUESLI"');
  });

  it('dates puzzles by their IST calendar day', () => {
    expect(formatDate(1)).toBe('Sunday, 25 October 2026');
  });
});
