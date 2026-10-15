import { useEffect } from 'react';
import type { Theme } from '../types';
import { applyTheme, prefersDark, resolveIsDark, watchSystemTheme } from '../lib/theme';

/**
 * Keep the `dark` class on <html> in sync with the theme setting.
 *
 * Unlike the previous effect, this also reacts to the OS appearance changing
 * while the page is open when the setting is `system`.
 */
export const useTheme = (theme: Theme): void => {
  useEffect(() => {
    const apply = (systemPrefersDark: boolean) => {
      applyTheme(resolveIsDark(theme, systemPrefersDark));
    };

    apply(prefersDark());

    // Nothing to watch when the user pinned an explicit theme.
    if (theme !== 'system') return;
    return watchSystemTheme((isDark) => apply(isDark));
  }, [theme]);
};
