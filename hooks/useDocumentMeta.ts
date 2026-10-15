import { useEffect } from 'react';
import type { Language } from '../types';

const DEFAULT_TITLE = '章鱼哥の主页';
const DEFAULT_ICON = '/favicon.svg';

/**
 * Keep the document title, favicon and `lang` attribute in sync with settings.
 *
 * `document.documentElement.lang` was previously never updated, so switching to
 * English left the page declaring itself as `zh-CN`.
 */
export const useDocumentMeta = (
  customTitle: string,
  customIcon: string,
  language: Language,
): void => {
  useEffect(() => {
    document.title = customTitle || DEFAULT_TITLE;
  }, [customTitle]);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) return;
    // `customIcon` is validated by normalizeSettings, so only http(s) and
    // data:image payloads reach this point.
    link.href = customIcon || DEFAULT_ICON;
  }, [customIcon]);
};
