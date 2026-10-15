import React, { useMemo } from 'react';
import type { Language } from '../types';
import { resolveTranslations } from '../translations';
import { LocaleContext, type LocaleValue } from './locale-context';

export const LocaleProvider: React.FC<{ language: Language; children: React.ReactNode }> = ({
  language,
  children,
}) => {
  const value = useMemo<LocaleValue>(
    () => ({ t: resolveTranslations(language), language }),
    [language],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};
