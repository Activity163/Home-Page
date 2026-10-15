import type { Theme } from '../types';

export const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

export const prefersDark = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia(SYSTEM_DARK_QUERY).matches;

/**
 * Resolve the effective appearance. Kept in one place because it is needed in
 * three spots: the pre-paint inline script in index.html, the React effect, and
 * the system-change listener.
 */
export const resolveIsDark = (theme: Theme, systemPrefersDark: boolean): boolean =>
  theme === 'dark' || (theme === 'system' && systemPrefersDark);

export const applyTheme = (isDark: boolean): void => {
  document.documentElement.classList.toggle('dark', isDark);
};

/**
 * Subscribe to OS appearance changes.
 *
 * Previously the theme effect only ran when `settings.theme` changed, so with
 * the default `system` setting the page ignored the OS switching to dark mode
 * until a reload. Only subscribes while the setting is actually `system`.
 */
export const watchSystemTheme = (onChange: (systemPrefersDark: boolean) => void): (() => void) => {
  const query = window.matchMedia(SYSTEM_DARK_QUERY);
  const handler = (event: MediaQueryListEvent) => onChange(event.matches);
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
};
