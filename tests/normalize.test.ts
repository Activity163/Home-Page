/**
 * Tests for the normalization layer.
 *
 * These cover the concrete failures the layer exists to prevent: hostile URLs
 * reaching an href, a malformed backup blanking the page, and an empty engine
 * list soft-locking the UI. Run with `node --test` (see package.json).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeHttpUrl,
  normalizeSearchUrl,
  normalizeCategories,
  normalizeEngines,
  normalizeSettings,
  parseBackup,
} from '../lib/normalize.ts';
import { moveItem, moveLink } from '../lib/reorder.ts';
import type { AppSettings } from '../types.ts';

const FALLBACK: AppSettings = {
  language: 'en',
  theme: 'system',
  layoutMode: 'list',
  showFavicons: true,
  showShortcuts: true,
  openSearchInNewTab: false,
  openLinksInNewTab: false,
  customWallpaper: '',
  wallpaperBlur: false,
  greetingName: '',
  showLunar: true,
  showSeconds: false,
  customTitle: '',
  customIcon: '',
  defaultSearchEngineId: '',
};

test('normalizeHttpUrl rejects script-capable and unusable schemes', () => {
  const rejected = [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1) ',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'blob:https://x/abc',
    '',
    '   ',
    // Parses successfully but has no usable host.
    'https://',
    'http://',
    '//evil.com',
    // Parses with a scheme as the hostname.
    'https://https://',
    'https://https://https://',
    'https://http://x',
    // Free text that URL() would otherwise launder into a dead hostname.
    'not a url',
    'https://not a url',
    'https://has spaces.com',
    'https://exam ple.com',
    // Invalid IPv4 octet.
    'https://999.999.999.999',
    // Empty label.
    'https://a..b',
    'https://.leading.com',
  ];
  for (const input of rejected) {
    assert.equal(normalizeHttpUrl(input), null, `expected rejection: ${input}`);
  }
});

test('normalizeHttpUrl accepts and canonicalizes real URLs', () => {
  assert.equal(normalizeHttpUrl('https://example.com'), 'https://example.com/');
  assert.equal(normalizeHttpUrl('http://neverssl.com'), 'http://neverssl.com/');
  // Bare hostnames are repaired with an explicit https scheme.
  assert.equal(normalizeHttpUrl('example.com'), 'https://example.com/');
  assert.equal(normalizeHttpUrl('reddit.com/r/all'), 'https://reddit.com/r/all');
  assert.ok(normalizeHttpUrl('http://192.168.1.1:8080/x'));
  assert.ok(normalizeHttpUrl('https://例え.jp'));
  assert.ok(normalizeHttpUrl('https://www.google.com/search?q=%s'));
  // Real-world host shapes that must keep working.
  assert.ok(normalizeHttpUrl('https://sub.domain.example.co.uk'));
  assert.ok(normalizeHttpUrl('https://xn--r8jz45g.jp'));
  assert.ok(normalizeHttpUrl('http://localhost:3000'));
  assert.ok(normalizeHttpUrl('https://a-b.example.com'));
  assert.ok(normalizeHttpUrl('https://[::1]:8080/'));
});

test('normalizeSearchUrl requires the %s placeholder', () => {
  assert.ok(normalizeSearchUrl('https://duckduckgo.com/?q=%s'));
  // Without %s the query would be silently discarded.
  assert.equal(normalizeSearchUrl('https://duckduckgo.com/'), null);
  assert.equal(normalizeSearchUrl('javascript:alert(%s)'), null);
});

test('normalizeCategories drops hostile links and reports them', () => {
  const { categories, report } = normalizeCategories(
    [
      {
        id: 'c1',
        title: 'T',
        links: [
          { id: 'l1', title: 'ok', url: 'https://ok.com' },
          { id: 'l2', title: 'evil', url: 'javascript:alert(1)' },
          { id: 'l3', title: 'relative', url: 'rel.com' },
          { id: 'l4', title: 'junk' },
        ],
      },
    ],
    'en',
  );

  assert.equal(categories[0].links.length, 2);
  assert.equal(report.dropped, 2);
  assert.ok(!JSON.stringify(categories).includes('javascript:'));
});

test('normalizeCategories never yields an empty list', () => {
  assert.equal(normalizeCategories([], 'en').categories.length, 3);
  assert.equal(normalizeCategories(null, 'en').categories.length, 3);

  // Records carrying no title and no surviving link are dropped entirely,
  // rather than leaving empty "Untitled" cards.
  const junk = normalizeCategories([{ nope: 1 }, 42, 'str'], 'en');
  assert.equal(junk.categories.length, 3);
  assert.equal(junk.report.dropped, 3);
});

test('normalizeCategories keeps a title-less category that still has links', () => {
  const { categories } = normalizeCategories([{ links: [{ title: 'a', url: 'https://a.com' }] }], 'en');
  assert.equal(categories.length, 1);
  assert.equal(categories[0].title, 'Untitled');
});

test('normalizeCategories de-duplicates ids', () => {
  const { categories } = normalizeCategories(
    [
      { id: 'same', title: 'A', links: [] },
      { id: 'same', title: 'B', links: [] },
    ],
    'en',
  );
  assert.notEqual(categories[0].id, categories[1].id);
});

test('normalizeEngines never yields an empty list (soft-lock guard)', () => {
  // An empty list would hide the search bar and with it the only UI that can
  // add an engine back.
  assert.equal(normalizeEngines([]).engines.length, 3);
  assert.equal(normalizeEngines(null).engines.length, 3);
  assert.equal(normalizeEngines([{ id: 'x', name: 'bad', searchUrl: 'javascript:a(%s)' }]).engines.length, 3);
  assert.equal(normalizeEngines([{ id: 'g', name: 'G', searchUrl: 'https://g.com/?q=%s' }]).engines.length, 1);
});

test('normalizeSettings rejects hostile values and clamps text', () => {
  const settings = normalizeSettings(
    {
      theme: 'hacker',
      layoutMode: 'weird',
      language: 'fr',
      customWallpaper: 'javascript:alert(1)',
      customIcon: 'javascript:alert(1)',
      greetingName: 'x'.repeat(500),
    },
    FALLBACK,
    normalizeEngines([]).engines,
  );

  assert.equal(settings.theme, 'system');
  assert.equal(settings.layoutMode, 'list');
  assert.equal(settings.language, 'en');
  assert.equal(settings.customWallpaper, '');
  assert.equal(settings.customIcon, '');
  assert.ok(settings.greetingName.length <= 60);
  assert.equal(settings.defaultSearchEngineId, '');
});

test('normalizeSettings keeps legitimate wallpaper and data: icons', () => {
  assert.equal(
    normalizeSettings({ customWallpaper: 'https://a.com/b.jpg' }, FALLBACK, []).customWallpaper,
    'https://a.com/b.jpg',
  );
  assert.ok(
    normalizeSettings({ customIcon: 'data:image/png;base64,AAA' }, FALLBACK, []).customIcon.startsWith('data:image/'),
  );
});

test('parseBackup accepts valid and legacy shapes', () => {
  const parsed = parseBackup(
    {
      categories: [{ id: 'c', title: 't', links: [{ id: 'l', title: 'x', url: 'https://a.com' }] }],
      searchEngines: [],
      settings: { theme: 'dark' },
    },
    FALLBACK,
    [],
  );

  assert.ok(parsed);
  assert.equal(parsed.categories?.length, 1);
  // An imported empty engine list is repaired rather than accepted.
  assert.equal(parsed.searchEngines?.length, 3);
  assert.equal(parsed.settings?.theme, 'dark');

  assert.ok(parseBackup({ categories: [] }, FALLBACK, []));
});

test('parseBackup rejects unusable files', () => {
  assert.equal(parseBackup({ foo: 1 }, FALLBACK, []), null);
  assert.equal(parseBackup('nope', FALLBACK, []), null);
  assert.equal(parseBackup(null, FALLBACK, []), null);
});

test('parseBackup neutralizes a hostile backup', () => {
  const parsed = parseBackup(
    { categories: [{ title: 'x', links: [{ title: 'e', url: 'javascript:alert(1)' }] }] },
    FALLBACK,
    [],
  );
  assert.ok(parsed);
  assert.ok(!JSON.stringify(parsed).includes('javascript:'));
});

test('parseBackup validates the default engine id against imported engines', () => {
  const parsed = parseBackup(
    {
      searchEngines: [{ id: 'only', name: 'O', searchUrl: 'https://o.com/?q=%s' }],
      settings: { defaultSearchEngineId: 'only' },
    },
    FALLBACK,
    [],
  );
  assert.equal(parsed?.settings?.defaultSearchEngineId, 'only');
});

test('moveItem corrects the forward-move index shift', () => {
  const abc = ['A', 'B', 'C', 'D'];
  // Dragging forward used to overshoot by one because the removal shifted the
  // target index.
  assert.deepEqual(moveItem(abc, 0, 2), ['B', 'A', 'C', 'D']);
  assert.deepEqual(moveItem(abc, 0, 3), ['B', 'C', 'A', 'D']);
  assert.deepEqual(moveItem(abc, 3, 0), ['D', 'A', 'B', 'C']);
  assert.deepEqual(moveItem(abc, 1, 1), abc);
  assert.deepEqual(moveItem(abc, 9, 0), abc);
});

test('moveLink reorders within and across categories', () => {
  const cats = [
    { id: 'c1', links: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
    { id: 'c2', links: [] as { id: string }[] },
  ];

  assert.deepEqual(moveLink(cats, 'a', 'c1', 'c1', 'c').map((c) => c.links.map((l) => l.id))[0], ['b', 'a', 'c']);

  const across = moveLink(cats, 'a', 'c1', 'c2');
  assert.deepEqual(across.map((c) => c.links.map((l) => l.id)), [['b', 'c'], ['a']]);
});
