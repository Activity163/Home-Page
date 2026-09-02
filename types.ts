
export interface Link {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export interface Category {
  id: string;
  title: string;
  links: Link[];
}

export interface SearchEngine {
  id: string;
  name: string;
  searchUrl: string; // URL with %s for query
  icon: string; // Emoji or generic name for icon mapping
  isAI?: boolean;
}

export type Language = 'en' | 'zh';

export type Theme = 'system' | 'light' | 'dark';

export type LayoutMode = 'card' | 'list' | 'compact';

export interface AppSettings {
  language: Language;
  theme: Theme;
  layoutMode: LayoutMode;
  showFavicons: boolean;
  showShortcuts: boolean;
  openSearchInNewTab: boolean;
  openLinksInNewTab: boolean;
  customWallpaper: string;
  wallpaperBlur: boolean;
  greetingName: string;
  showLunar: boolean;
  showSeconds: boolean;
  customTitle: string;
  customIcon: string;
}
