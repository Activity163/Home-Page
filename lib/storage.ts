/**
 * localStorage helpers.
 *
 * The previous implementation wrote on every state change with no error
 * handling. Two problems followed from that:
 *   - Typing in a settings field wrote the whole settings object on every
 *     keystroke, and `localStorage.setItem` is synchronous and blocks the main
 *     thread.
 *   - The icon field explicitly invites `data:image/png;base64,...` payloads
 *     (see the placeholder text), so a few large icons can exceed the ~5 MB
 *     origin quota. `QuotaExceededError` then propagated out of a React effect
 *     and blanked the page.
 */

export const STORAGE_KEYS = {
  data: 'astralis_data',
  engines: 'astralis_engines',
  settings: 'astralis_settings',
} as const;

/** Keys this app owns. Used to clear only our own data. */
export const APP_STORAGE_KEYS: readonly string[] = Object.values(STORAGE_KEYS);

/**
 * Read and parse a key. Corrupted JSON falls back to the default instead of
 * throwing during the initial render.
 */
export const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
};

export interface WriteResult {
  ok: boolean;
  /** Set when the write failed because the origin quota is exhausted. */
  quotaExceeded: boolean;
}

export const writeJson = (key: string, value: unknown): WriteResult => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true, quotaExceeded: false };
  } catch (error) {
    const quotaExceeded =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        // Firefox's legacy name for the same condition.
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    return { ok: false, quotaExceeded };
  }
};

export interface DebouncedWriter {
  schedule: (key: string, value: unknown) => void;
  flushAll: () => void;
}

/**
 * Coalesce rapid writes into one per `delayMs`, so per-keystroke state changes
 * do not each hit the synchronous storage API. Failures are reported through
 * `onFailure` rather than thrown.
 */
export const createDebouncedWriter = (
  onFailure: (result: WriteResult) => void,
  delayMs = 300,
): DebouncedWriter => {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const pending = new Map<string, unknown>();

  const flushOne = (key: string): void => {
    if (!pending.has(key)) return;
    const value = pending.get(key);
    pending.delete(key);
    const timer = timers.get(key);
    if (timer) {
      clearTimeout(timer);
      timers.delete(key);
    }
    const result = writeJson(key, value);
    if (!result.ok) onFailure(result);
  };

  const schedule = (key: string, value: unknown): void => {
    pending.set(key, value);
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(
      key,
      setTimeout(() => flushOne(key), delayMs),
    );
  };

  /** Write everything immediately - used on pagehide so nothing is lost. */
  const flushAll = (): void => {
    for (const key of [...pending.keys()]) flushOne(key);
  };

  return { schedule, flushAll };
};

/** Remove only this app's keys, leaving any co-hosted app's data intact. */
export const clearAppStorage = (): void => {
  for (const key of APP_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing useful to do if removal fails.
    }
  }
};

/**
 * Flush pending writes when the page is hidden or unloaded, so the debounce
 * window cannot swallow the user's last edit.
 */
export const registerFlushOnHide = (flush: () => void): (() => void) => {
  const onHide = () => flush();
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') flush();
  };

  window.addEventListener('pagehide', onHide);
  window.addEventListener('beforeunload', onHide);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('pagehide', onHide);
    window.removeEventListener('beforeunload', onHide);
    document.removeEventListener('visibilitychange', onVisibility);
  };
};
