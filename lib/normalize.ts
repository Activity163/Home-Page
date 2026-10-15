/**
 * Normalization layer for every piece of data that can enter the app from an
 * untrusted source: localStorage (hand-edited or written by an older build) and
 * imported backup files.
 *
 * The app previously trusted both, which allowed three distinct failures:
 *   1. A link whose `url` is not an absolute URL crashed the render, because
 *      CategoryGroup called `new URL(link.url).hostname` unguarded.
 *   2. `url: "javascript:..."` parsed fine as an absolute URL (empty hostname),
 *      so it survived validation and rendered as a clickable stored-XSS sink.
 *   3. An imported `searchEngines: []` passed the "is an array" check and then
 *      hid the search bar entirely - which also hid the only UI for adding an
 *      engine back, soft-locking the user.
 *
 * Everything here is a pure function so it can be unit-tested without a DOM.
 */

import type {
  AppSettings,
  Category,
  Language,
  LayoutMode,
  Link,
  SearchEngine,
  Theme,
} from '../types';
import { DEFAULT_SEARCH_ENGINES, getDefaultCategories } from '../constants';

/** Bumped whenever the backup envelope shape changes. */
export const BACKUP_VERSION = 1;

/**
 * Only these are ever allowed to reach an `href` or a CSS `url()`.
 * Everything else (`javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, ...)
 * is rejected outright rather than sanitized, because there is no legitimate
 * use for them in a link shortcut.
 */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/** Schemes that must never be "repaired" by prepending https://. */
const DANGEROUS_SCHEME = /^(javascript|data|vbscript|file|blob|filesystem|about|chrome|resource):/i;

/**
 * True when the input already carries a scheme separator (`foo://`) or is a
 * protocol-relative URL (`//host`). Such input must never go through the
 * "prepend https://" repair path: `https://` would otherwise become
 * `https://https://`, which parses as a host literally named "https".
 */
const LOOKS_SCHEMED = /:\/\//;

/**
 * A hostname that is itself a URL scheme is never a real host. This catches
 * malformed pastes such as `https://https://`, which JavaScript's URL parser
 * happily accepts as a host literally named "https" - producing a dead link
 * instead of a visible validation error.
 */
const SCHEME_AS_HOST = /^(https?|ftps?|wss?|javascript|data|file|blob|vbscript|about|chrome)$/i;

/** A single DNS label: alphanumeric with interior hyphens. */
const HOSTNAME_LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;

/**
 * Reject hostnames that are not real hosts.
 *
 * `new URL()` is extremely permissive: `new URL('https://not a url')` succeeds
 * and yields the hostname `not%20a%20url`. Without this check, free text typed
 * into a URL field is silently "repaired" into a plausible-looking but dead
 * link, which then gets persisted back to storage.
 */
const isPlausibleHostname = (hostname: string): boolean => {
  if (!hostname) return false;

  // IPv6 literals arrive bracketed, e.g. "[::1]".
  if (hostname.startsWith('[') && hostname.endsWith(']')) return true;

  // Percent-encoding in a host means the input was never a real host.
  if (hostname.includes('%')) return false;

  // Dotted-decimal IPv4: every octet must be in range.
  if (/^\d+(\.\d+){3}$/.test(hostname)) {
    return hostname.split('.').every((octet) => Number(octet) <= 255);
  }

  // Otherwise require valid DNS labels (a trailing root dot is allowed).
  const labels = hostname.replace(/\.$/, '').split('.');
  return labels.every(
    (label) => label.length > 0 && label.length <= 63 && HOSTNAME_LABEL.test(label),
  );
};

const MAX_URL_LENGTH = 2048;
/** Base64 icons are legitimate but unbounded; cap well below the 5 MB quota. */
const MAX_ICON_LENGTH = 8192;
const MAX_TITLE_LENGTH = 120;
const MAX_NAME_LENGTH = 60;

/** Counters reported back to the UI so a lossy import can be explained. */
export interface NormalizeReport {
  /** Entries that were structurally unusable and had to be thrown away. */
  dropped: number;
  /** Entries kept but rewritten (scheme added, id regenerated, field clamped). */
  repaired: number;
}

export const emptyReport = (): NormalizeReport => ({ dropped: 0, repaired: 0 });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

/** Strip control characters (defeats "java\tscript:" style smuggling), trim, clamp. */
const cleanText = (value: unknown, max: number): string => {
  const raw = asString(value);
  if (raw === null) return '';
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
};

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => {
  const raw = asString(value);
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
};

/**
 * Validate a URL and return its canonical `href`, or null when unusable.
 *
 * Order matters: the input is parsed first, and only if parsing *fails* do we
 * try prepending a scheme. That way a well-formed but hostile URL such as
 * `javascript:alert(1)` is rejected instead of being laundered into
 * `https://javascript:alert(1)`.
 */
export const normalizeHttpUrl = (value: unknown): string | null => {
  const raw = cleanText(value, MAX_URL_LENGTH);
  if (!raw) return null;

  const attempt = (candidate: string): string | null => {
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      return null;
    }
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
    // Rejects "https://" and other host-less forms.
    if (!parsed.hostname) return null;
    // Rejects a scheme used as the host, e.g. "https://https://".
    if (SCHEME_AS_HOST.test(parsed.hostname)) return null;
    // Rejects free text laundered into a hostname, e.g. "not a url".
    if (!isPlausibleHostname(parsed.hostname)) return null;
    return parsed.href;
  };

  const direct = attempt(raw);
  if (direct) return direct;

  // Never "fix" an explicit hostile scheme.
  if (DANGEROUS_SCHEME.test(raw)) return null;
  // Anything already shaped like `scheme://...` or `//host` was malformed for
  // a real reason (no host, bad characters); prepending https:// would launder
  // it into a bogus hostname instead of rejecting it.
  if (LOOKS_SCHEMED.test(raw) || raw.startsWith('//')) return null;
  return attempt(`https://${raw}`);
};

/**
 * Search engines need a `%s` placeholder; without it the query is silently
 * dropped (SearchBar's `replace` becomes a no-op), which looks like a broken
 * search box. Rejecting is better than silently searching for nothing.
 */
export const normalizeSearchUrl = (value: unknown): string | null => {
  const url = normalizeHttpUrl(value);
  if (!url) return null;
  return url.includes('%s') ? url : null;
};

/**
 * Icons are rendered into `<img src>` (or a CSS-free `<span>` for emoji), so
 * the bar is lower than for links, but an unbounded base64 blob can still blow
 * the storage quota. Accept: absolute http(s) URL, data:image/*, or short text.
 */
export const normalizeIcon = (value: unknown, allowText: boolean): string | undefined => {
  const raw = cleanText(value, MAX_ICON_LENGTH);
  if (!raw) return undefined;
  if (raw.startsWith('<svg')) return raw;
  if (/^data:image\//i.test(raw)) return raw;
  if (normalizeHttpUrl(raw)) return raw;
  if (allowText && raw.length <= 8) return raw;
  return undefined;
};

let idCounter = 0;
const createId = (prefix: string): string => {
  idCounter += 1;
  const random = globalThis.crypto?.randomUUID?.().slice(0, 8);
  return `${prefix}-${random ?? Date.now().toString(36)}${idCounter}`;
};

const uniqueId = (candidate: unknown, seen: Set<string>, prefix: string): string => {
  const raw = cleanText(candidate, MAX_NAME_LENGTH);
  if (raw && !seen.has(raw)) {
    seen.add(raw);
    return raw;
  }
  let generated = createId(prefix);
  while (seen.has(generated)) generated = createId(prefix);
  seen.add(generated);
  return generated;
};

const normalizeLink = (
  value: unknown,
  seenIds: Set<string>,
  report: NormalizeReport,
): Link | null => {
  if (!isRecord(value)) {
    report.dropped += 1;
    return null;
  }

  const url = normalizeHttpUrl(value.url);
  if (!url) {
    report.dropped += 1;
    return null;
  }

  let title = cleanText(value.title, MAX_TITLE_LENGTH);
  if (!title) {
    // Fall back to the hostname so a title-less link is still usable.
    try {
      title = new URL(url).hostname.replace(/^www\./, '') || url;
    } catch {
      title = url;
    }
    report.repaired += 1;
  }

  const id = uniqueId(value.id, seenIds, 'l');
  if (id !== value.id) report.repaired += 1;

  const icon = normalizeIcon(value.icon, true);
  if (value.icon !== undefined && value.icon !== null && value.icon !== '' && icon === undefined) {
    report.repaired += 1;
  }

  return { id, title, url, ...(icon ? { icon } : {}) };
};

const normalizeCategory = (
  value: unknown,
  seenIds: Set<string>,
  report: NormalizeReport,
): Category | null => {
  if (!isRecord(value)) {
    report.dropped += 1;
    return null;
  }

  const rawLinks = Array.isArray(value.links) ? value.links : [];
  const links: Link[] = [];
  for (const raw of rawLinks) {
    const link = normalizeLink(raw, seenIds, report);
    if (link) links.push(link);
  }

  const rawTitle = cleanText(value.title, MAX_NAME_LENGTH);

  // A record with neither a title nor a single surviving link carries no
  // information (e.g. `{nope: 1}`); keeping it would leave an empty
  // "Untitled" card in the grid.
  if (!rawTitle && links.length === 0) {
    report.dropped += 1;
    return null;
  }

  const id = uniqueId(value.id, seenIds, 'c');
  if (id !== value.id) report.repaired += 1;

  const title = rawTitle || 'Untitled';
  if (title !== value.title) report.repaired += 1;

  return { id, title, links };
};

/**
 * Never returns an empty list: an empty shortcut grid leaves the user with no
 * way to add anything back, so fall back to the shipped defaults.
 */
export const normalizeCategories = (
  value: unknown,
  language: Language,
): { categories: Category[]; report: NormalizeReport } => {
  const report = emptyReport();
  const seenIds = new Set<string>();
  const list = Array.isArray(value) ? value : [];

  const categories: Category[] = [];
  for (const raw of list) {
    const category = normalizeCategory(raw, seenIds, report);
    if (category) categories.push(category);
  }

  if (categories.length === 0) {
    // Dropped data is reported, but the fallback itself is not a "repair" of
    // the user's input, so it is not counted.
    return { categories: getDefaultCategories(language), report };
  }
  return { categories, report };
};

const normalizeEngine = (
  value: unknown,
  seenIds: Set<string>,
  report: NormalizeReport,
): SearchEngine | null => {
  if (!isRecord(value)) {
    report.dropped += 1;
    return null;
  }

  const searchUrl = normalizeSearchUrl(value.searchUrl);
  if (!searchUrl) {
    report.dropped += 1;
    return null;
  }

  const id = uniqueId(value.id, seenIds, 'e');
  if (id !== value.id) report.repaired += 1;

  const name = cleanText(value.name, MAX_NAME_LENGTH) || 'Search';
  if (name !== value.name) report.repaired += 1;

  const icon = normalizeIcon(value.icon, true) ?? '🔍';

  return { id, name, searchUrl, icon };
};

/** Never returns an empty list: the search bar renders nothing without an engine. */
export const normalizeEngines = (
  value: unknown,
): { engines: SearchEngine[]; report: NormalizeReport } => {
  const report = emptyReport();
  const seenIds = new Set<string>();
  const list = Array.isArray(value) ? value : [];

  const engines: SearchEngine[] = [];
  for (const raw of list) {
    const engine = normalizeEngine(raw, seenIds, report);
    if (engine) engines.push(engine);
  }

  if (engines.length === 0) {
    // Rebuild the defaults through the same validator so they are guaranteed
    // to satisfy the invariants above.
    const defaults: SearchEngine[] = [];
    const defaultIds = new Set<string>();
    for (const raw of DEFAULT_SEARCH_ENGINES) {
      const engine = normalizeEngine(raw, defaultIds, emptyReport());
      if (engine) defaults.push(engine);
    }
    return { engines: defaults, report };
  }
  return { engines, report };
};

const THEMES = ['system', 'light', 'dark'] as const satisfies readonly Theme[];
const LAYOUTS = ['card', 'list', 'compact'] as const satisfies readonly LayoutMode[];
const LANGUAGES = ['en', 'zh'] as const satisfies readonly Language[];

/** Best-effort language detection, used only when nothing is stored yet. */
export const detectLanguage = (): Language => {
  if (typeof navigator === 'undefined') return 'zh';
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

export const normalizeSettings = (
  value: unknown,
  fallback: AppSettings,
  engines: SearchEngine[],
): AppSettings => {
  if (!isRecord(value)) return fallback;

  // The wallpaper ends up inside a CSS url(); only allow real http(s) URLs.
  const wallpaper = normalizeHttpUrl(value.customWallpaper) ?? '';

  // The favicon is assigned to <link rel=icon href>; allow http(s) or a
  // data:image payload, but not arbitrary schemes.
  const rawIcon = cleanText(value.customIcon, MAX_ICON_LENGTH);
  const customIcon =
    /^data:image\//i.test(rawIcon) || normalizeHttpUrl(rawIcon) ? rawIcon : '';

  const engineIds = new Set(engines.map((engine) => engine.id));
  const requestedEngineId = cleanText(value.defaultSearchEngineId, MAX_NAME_LENGTH);

  return {
    language: oneOf(value.language, LANGUAGES, fallback.language),
    theme: oneOf(value.theme, THEMES, fallback.theme),
    layoutMode: oneOf(value.layoutMode, LAYOUTS, fallback.layoutMode),
    showFavicons: asBoolean(value.showFavicons, fallback.showFavicons),
    showShortcuts: asBoolean(value.showShortcuts, fallback.showShortcuts),
    openSearchInNewTab: asBoolean(value.openSearchInNewTab, fallback.openSearchInNewTab),
    openLinksInNewTab: asBoolean(value.openLinksInNewTab, fallback.openLinksInNewTab),
    customWallpaper: wallpaper,
    wallpaperBlur: asBoolean(value.wallpaperBlur, fallback.wallpaperBlur),
    greetingName: cleanText(value.greetingName, MAX_NAME_LENGTH),
    showLunar: asBoolean(value.showLunar, fallback.showLunar),
    showSeconds: asBoolean(value.showSeconds, fallback.showSeconds),
    customTitle: cleanText(value.customTitle, MAX_TITLE_LENGTH),
    customIcon,
    // A stale id is kept out of state so the UI never shows a phantom default.
    defaultSearchEngineId: engineIds.has(requestedEngineId) ? requestedEngineId : '',
  };
};

/** Shape written by handleExportData. */
export interface BackupEnvelope {
  version: number;
  exportedAt: string;
  categories: Category[];
  searchEngines: SearchEngine[];
  settings: AppSettings;
}

export const createBackup = (
  categories: Category[],
  searchEngines: SearchEngine[],
  settings: AppSettings,
): BackupEnvelope => ({
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  categories,
  searchEngines,
  settings,
});

export interface ParsedBackup {
  categories?: Category[];
  searchEngines?: SearchEngine[];
  settings?: AppSettings;
  report: NormalizeReport;
}

/**
 * Parse a backup file of any vintage. Accepts the current envelope as well as
 * the legacy bare `{ categories, searchEngines, settings }` object.
 *
 * Returns null only when the file contains no recognizable section at all;
 * a partially valid file is normalized section by section.
 */
export const parseBackup = (
  json: unknown,
  fallbackSettings: AppSettings,
  currentEngines: SearchEngine[],
): ParsedBackup | null => {
  if (!isRecord(json)) return null;

  const hasCategories = Array.isArray(json.categories);
  const hasEngines = Array.isArray(json.searchEngines);
  const hasSettings = isRecord(json.settings);
  if (!hasCategories && !hasEngines && !hasSettings) return null;

  const report = emptyReport();
  const result: ParsedBackup = { report };

  if (hasCategories) {
    // Settings are normalized first so the category fallback can use the
    // language the user is actually about to switch to.
    const language = hasSettings
      ? oneOf((json.settings as Record<string, unknown>).language, LANGUAGES, fallbackSettings.language)
      : fallbackSettings.language;
    const normalized = normalizeCategories(json.categories, language);
    result.categories = normalized.categories;
    report.dropped += normalized.report.dropped;
    report.repaired += normalized.report.repaired;
  }

  if (hasEngines) {
    const normalized = normalizeEngines(json.searchEngines);
    result.searchEngines = normalized.engines;
    report.dropped += normalized.report.dropped;
    report.repaired += normalized.report.repaired;
  }

  if (hasSettings) {
    // Validate the engine id against whichever engine list will actually be
    // active after this import.
    const effectiveEngines = result.searchEngines ?? currentEngines;
    result.settings = normalizeSettings(json.settings, fallbackSettings, effectiveEngines);
  }

  return result;
};
