import { createContext, useContext } from 'react';
import type { Language } from '../types';
import { resolveTranslations, type TranslationType } from '../translations';

export interface LocaleValue {
  t: TranslationType;
  language: Language;
}

/**
 * Translations used to be threaded through as a `t` prop into nine components,
 * so adding a single string meant touching several files. Components now read
 * it from context instead.
 *
 * The context and its hooks live here (no JSX) so that the provider component
 * can stay in its own file and keep React Fast Refresh working.
 */
export const LocaleContext = createContext<LocaleValue>({
  t: resolveTranslations('zh'),
  language: 'zh',
});

export const useLocale = (): LocaleValue => useContext(LocaleContext);

export const useT = (): TranslationType => useContext(LocaleContext).t;
