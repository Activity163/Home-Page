/**
 * Browser-level verification of the security and robustness fixes.
 *
 * Launches headless Chrome, seeds localStorage over the DevTools Protocol with
 * a hostile payload (javascript: URL, malformed URL, data: URL, empty engine
 * list), reloads the real built app, and asserts that:
 *   - the page still renders instead of blanking,
 *   - no script-capable URL reaches the DOM,
 *   - the empty engine list is repaired so the search bar survives.
 *
 * Usage: node tests/browser-check.mjs [baseUrl]
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const baseUrl = process.argv[2] ?? 'http://localhost:4174';
const PORT = 9333;

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browser = CANDIDATES.find((p) => existsSync(p));
if (!browser) {
  console.error('No Chrome/Edge found; skipping browser checks.');
  process.exit(0);
}

const HOSTILE = {
  astralis_data: JSON.stringify([
    {
      id: 'c1',
      title: 'Hostile',
      links: [
        { id: 'l1', title: 'XSS', url: 'javascript:alert(1)' },
        { id: 'l2', title: 'Malformed', url: 'not a url' },
        { id: 'l3', title: 'Safe', url: 'https://example.com' },
        { id: 'l4', title: 'DataURI', url: 'data:text/html,<script>alert(1)</script>' },
      ],
    },
  ]),
  astralis_engines: JSON.stringify([]),
  astralis_settings: JSON.stringify({ language: 'zh', theme: 'dark', layoutMode: 'list' }),
};

const workDir = mkdtempSync(path.join(tmpdir(), 'astralis-cdp-'));
const profile = path.join(workDir, 'profile');

const chrome = spawn(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--no-first-run',
    '--remote-debugging-port=' + PORT,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll the DevTools endpoint until a page target is available. */
const getTarget = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      // Chrome not up yet.
    }
    await sleep(250);
  }
  throw new Error('DevTools target never became available');
};

const target = await getTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let nextId = 1;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
};

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return result.result?.value;
};

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
};

await send('Page.enable');
await send('Runtime.enable');

const load = async (url) => {
  await send('Page.navigate', { url });
  await sleep(2500);
};

// --- 1. Clean profile renders ---
await load(baseUrl);
const cleanDom = await evaluate('document.documentElement.outerHTML');
check('app renders with no stored data', cleanDom.includes('min-h-screen'));
check('loading screen removed after mount', !cleanDom.includes('loading-screen'));
check('no script-capable URL in clean DOM', !cleanDom.includes('javascript:'));

// --- 2. Seed hostile storage, then reload ---
await evaluate(`(() => {
  const seed = ${JSON.stringify(HOSTILE)};
  for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
  return Object.keys(seed).length;
})()`);

await load(baseUrl);
const hostileDom = await evaluate('document.documentElement.outerHTML');
const hrefs = await evaluate(
  'JSON.stringify(Array.from(document.querySelectorAll("a")).map(a => a.getAttribute("href")))',
);

check('hostile storage does not blank the page', hostileDom.includes('min-h-screen'), `len=${hostileDom.length}`);
check('javascript: URL never reaches the DOM', !hostileDom.includes('javascript:'));
check('data: URL never reaches the DOM', !hostileDom.includes('data:text/html'));
check('malformed URL dropped', !hostileDom.includes('not a url'));
check('safe link survives normalization', hostileDom.includes('https://example.com'));
check('empty engine list repaired -> search bar renders', /placeholder=/.test(hostileDom));
check('repaired engines produce a real search url', hrefs.includes('https') || hostileDom.includes('在 Google'));

// --- 3. Confirm the hostile link count was reduced to just the safe one ---
const anchorCount = await evaluate('document.querySelectorAll("a").length');
check('only the safe link remains clickable', anchorCount === 1, `anchors=${anchorCount}`);

ws.close();
chrome.kill();
await sleep(300);
rmSync(workDir, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok);
console.log(`\n===== ${results.length - failed.length} passed, ${failed.length} failed =====`);
process.exit(failed.length === 0 ? 0 : 1);
