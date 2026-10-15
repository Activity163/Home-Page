import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppSettings, Category, Language, SearchEngine } from '../types';
import { DEFAULT_SEARCH_ENGINES, getDefaultCategories } from '../constants';
import {
  createDebouncedWriter,
  readJson,
  registerFlushOnHide,
  STORAGE_KEYS,
} from '../lib/storage';
import {
  detectLanguage,
  normalizeCategories,
  normalizeEngines,
  normalizeSettings,
} from '../lib/normalize';

/**
 * Language used only when nothing is stored yet.
 *
 * The shipped default was hardcoded to 'en' while the page title and
 * `index.html` are Chinese, so a Chinese user with empty storage got English
 * categories and an English UI. The browser's language is now the fallback.
 */
const initialLanguage = (): Language => detectLanguage();

export const DEFAULT_SETTINGS: AppSettings = {
  language: initialLanguage(),
  theme: 'system',
  openSearchInNewTab: false,
  openLinksInNewTab: false,
  showFavicons: true,
  layoutMode: 'list',
  showShortcuts: true,
  customWallpaper: '',
  wallpaperBlur: false,
  greetingName: '',
  showLunar: true,
  showSeconds: false,
  customTitle: '',
  customIcon: '',
  defaultSearchEngineId: '',
};

export interface AppData {
  settings: AppSettings;
  categories: Category[];
  searchEngines: SearchEngine[];
  updateSettings: (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => void;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setSearchEngines: React.Dispatch<React.SetStateAction<SearchEngine[]>>;
  /** True when a write failed because the origin storage quota is exhausted. */
  storageFull: boolean;
  dismissStorageWarning: () => void;
  /** Replace all three domains at once (backup restore). */
  replaceAll: (next: {
    categories?: Category[];
    searchEngines?: SearchEngine[];
    settings?: AppSettings;
  }) => void;
  exportPayload: () => { categories: Category[]; searchEngines: SearchEngine[]; settings: AppSettings };
}

/**
 * Single source of truth for persisted app data.
 *
 * Every value read from storage passes through the normalization layer first,
 * so a hand-edited or legacy localStorage entry cannot crash the render or
 * smuggle a hostile URL into an `href`.
 */
export const useAppData = (): AppData => {
  const [storageFull, setStorageFull] = useState(false);

  // --- Initial state, normalized on the way in ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    const storedSettings = readJson<unknown>(STORAGE_KEYS.settings, null);
    const storedEngines = readJson<unknown>(STORAGE_KEYS.engines, null);
    const engines = normalizeEngines(storedEngines).engines;
    return normalizeSettings(storedSettings, DEFAULT_SETTINGS, engines);
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const stored = readJson<unknown>(STORAGE_KEYS.data, null);
    return normalizeCategories(stored, settings.language).categories;
  });

  const [searchEngines, setSearchEngines] = useState<SearchEngine[]>(() => {
    const stored = readJson<unknown>(STORAGE_KEYS.engines, null);
    return normalizeEngines(stored).engines;
  });

  // --- Persistence: debounced, quota-aware ---
  const writerRef = useRef<ReturnType<typeof createDebouncedWriter> | null>(null);
  if (writerRef.current === null) {
    writerRef.current = createDebouncedWriter((result) => {
      if (result.quotaExceeded) setStorageFull(true);
    });
  }

  useEffect(() => {
    const writer = writerRef.current;
    if (!writer) return;
    return registerFlushOnHide(() => writer.flushAll());
  }, []);

  useEffect(() => {
    writerRef.current?.schedule(STORAGE_KEYS.data, categories);
  }, [categories]);

  useEffect(() => {
    writerRef.current?.schedule(STORAGE_KEYS.engines, searchEngines);
  }, [searchEngines]);

  useEffect(() => {
    writerRef.current?.schedule(STORAGE_KEYS.settings, settings);
  }, [settings]);

  // --- Mutators ---
  const updateSettings = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
    },
    [],
  );

  const dismissStorageWarning = useCallback(() => setStorageFull(false), []);

  const replaceAll = useCallback<AppData['replaceAll']>((next) => {
    if (next.categories) setCategories(next.categories);
    if (next.searchEngines) setSearchEngines(next.searchEngines);
    if (next.settings) setSettings(next.settings);
  }, []);

  const exportPayload = useCallback(
    () => ({ categories, searchEngines, settings }),
    [categories, searchEngines, settings],
  );

  return useMemo(
    () => ({
      settings,
      categories,
      searchEngines,
      updateSettings,
      setCategories,
      setSearchEngines,
      storageFull,
      dismissStorageWarning,
      replaceAll,
      exportPayload,
    }),
    [
      settings,
      categories,
      searchEngines,
      updateSettings,
      storageFull,
      dismissStorageWarning,
      replaceAll,
      exportPayload,
    ],
  );
};

export { DEFAULT_SEARCH_ENGINES, getDefaultCategories };
