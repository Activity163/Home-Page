
import React, { useRef } from 'react';
import { X, Moon, Sun, Monitor, Globe, Layout, Image, Zap, Download, Upload, User, Type, Search, Clock as ClockIcon } from 'lucide-react';
import { TranslationType } from '../translations';
import { AppSettings, SearchEngine, Theme, Language, LayoutMode } from '../types';
import { EngineIcon } from './EngineIcon';
import { Toggle } from './Toggle';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  updateSettings: (key: keyof AppSettings, value: any) => void;
  searchEngines: SearchEngine[];
  t: TranslationType;
  onExport: () => void;
  onImport: (file: File) => void;
}

const INPUT_CLASS = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white";
const ACTION_BUTTON_CLASS = "flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-sm font-medium";

const SectionHeader: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
    {icon}
    {label}
  </h4>
);

const SegmentedButton: React.FC<{
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ selected, onClick, children, className = '' }) => (
  <button
    onClick={onClick}
    className={`
      ${className}
      ${selected
        ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
        : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
      }
    `}
  >
    {children}
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  updateSettings,
  searchEngines,
  t,
  onExport,
  onImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
    }
  };

  // A stale id (engine deleted or removed from an imported backup) falls back to the first engine
  const activeEngineId = searchEngines.some(e => e.id === settings.defaultSearchEngineId)
    ? settings.defaultSearchEngineId
    : searchEngines[0]?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm anim-fade">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden anim-zoom border border-gray-100 dark:border-zinc-800">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t.settings}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">

          {/* Appearance Section */}
          <div>
            <SectionHeader icon={<Moon size={14} />} label={t.appearance} />

            {/* Theme Selector */}
            <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-black p-1 rounded-xl border dark:border-zinc-800 mb-6">
              {(['light', 'dark', 'system'] as Theme[]).map((theme) => (
                <SegmentedButton
                  key={theme}
                  selected={settings.theme === theme}
                  onClick={() => updateSettings('theme', theme)}
                  className="flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all"
                >
                  {theme === 'light' && <Sun size={14} />}
                  {theme === 'dark' && <Moon size={14} />}
                  {theme === 'system' && <Monitor size={14} />}
                  <span className="capitalize">{t[theme]}</span>
                </SegmentedButton>
              ))}
            </div>

            {/* Layout Mode Selector */}
            {settings.showShortcuts && (
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2 block">{t.layoutMode}</label>
                <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-black p-1 rounded-xl border dark:border-zinc-800">
                  {(['card', 'list', 'compact'] as LayoutMode[]).map((mode) => (
                    <SegmentedButton
                      key={mode}
                      selected={settings.layoutMode === mode}
                      onClick={() => updateSettings('layoutMode', mode)}
                      className="flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium rounded-lg transition-all"
                    >
                      <Layout size={16} />
                      <span className="capitalize">{t[mode]}</span>
                    </SegmentedButton>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Wallpaper */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">{t.wallpaperUrl}</label>
              <input
                type="text"
                value={settings.customWallpaper || ''}
                onChange={(e) => updateSettings('customWallpaper', e.target.value)}
                className={INPUT_CLASS}
                placeholder="https://images.unsplash.com/..."
              />
              <p className="text-[10px] text-gray-400 mt-1">{t.wallpaperUrlHelp}</p>
            </div>

            <Toggle
              size="sm"
              label={t.blurWallpaper}
              checked={settings.wallpaperBlur}
              onChange={(v) => updateSettings('wallpaperBlur', v)}
            />
          </div>

          {/* Personalization Section */}
          <div>
            <SectionHeader icon={<User size={14} />} label={t.personalization} />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">{t.greetingName}</label>
              <input
                type="text"
                value={settings.greetingName || ''}
                onChange={(e) => updateSettings('greetingName', e.target.value)}
                className={INPUT_CLASS}
                placeholder="e.g. Alex"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">{t.customTitle}</label>
              <input
                type="text"
                value={settings.customTitle || ''}
                onChange={(e) => updateSettings('customTitle', e.target.value)}
                className={INPUT_CLASS}
                placeholder={t.customTitlePlaceholder}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">{t.customIcon}</label>
              <input
                type="text"
                value={settings.customIcon || ''}
                onChange={(e) => updateSettings('customIcon', e.target.value)}
                className={INPUT_CLASS}
                placeholder={t.customIconPlaceholder}
              />
            </div>
          </div>

          {/* General Section */}
          <div>
            <SectionHeader icon={<Layout size={14} />} label={t.general} />

            <div className="space-y-4">
              {/* Language */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-gray-700 dark:text-zinc-200">
                  <Globe size={18} className="text-gray-400 dark:text-zinc-500" />
                  <span>{t.selectLanguage}</span>
                </div>
                <div className="flex bg-gray-100 dark:bg-black rounded-lg p-1 border dark:border-zinc-800">
                  {(['en', 'zh'] as Language[]).map((lang) => (
                    <SegmentedButton
                      key={lang}
                      selected={settings.language === lang}
                      onClick={() => updateSettings('language', lang)}
                      className="px-3 py-1 text-xs font-medium rounded-md transition-all"
                    >
                      {lang === 'en' ? 'EN' : '中'}
                    </SegmentedButton>
                  ))}
                </div>
              </div>

              {/* Default Search Engine */}
              <div>
                <div className="flex items-center gap-3 text-gray-700 dark:text-zinc-200 mb-2">
                  <Search size={18} className="text-gray-400 dark:text-zinc-500" />
                  <span>{t.defaultSearchEngine}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchEngines.map((engine) => {
                    const isSelected = engine.id === activeEngineId;
                    return (
                      <button
                        key={engine.id}
                        type="button"
                        onClick={() => updateSettings('defaultSearchEngineId', engine.id)}
                        className={`
                          flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-all max-w-full
                          ${isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700'
                          }
                        `}
                      >
                        <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                          <EngineIcon icon={engine.icon} className="w-4 h-4 text-sm" />
                        </span>
                        <span className="truncate">{engine.name}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">{t.defaultSearchEngineHelp}</p>
              </div>

              <Toggle
                label={t.showLunar}
                icon={<Type size={18} className="text-gray-400 dark:text-zinc-500" />}
                checked={settings.showLunar}
                onChange={(v) => updateSettings('showLunar', v)}
              />

              <Toggle
                label={t.showSeconds}
                icon={<ClockIcon size={18} className="text-gray-400 dark:text-zinc-500" />}
                checked={settings.showSeconds}
                onChange={(v) => updateSettings('showSeconds', v)}
              />

              <Toggle
                label={t.showShortcuts}
                icon={<Zap size={18} className="text-gray-400 dark:text-zinc-500" />}
                checked={settings.showShortcuts}
                onChange={(v) => updateSettings('showShortcuts', v)}
              />

              {settings.showShortcuts && (
                <Toggle
                  label={t.showFavicons}
                  icon={<Image size={18} className="text-gray-400 dark:text-zinc-500" />}
                  checked={settings.showFavicons}
                  onChange={(v) => updateSettings('showFavicons', v)}
                />
              )}

              <Toggle
                label={t.openSearchInNewTab}
                icon={<Globe size={18} className="text-gray-400 dark:text-zinc-500" />}
                checked={settings.openSearchInNewTab}
                onChange={(v) => updateSettings('openSearchInNewTab', v)}
              />

              {settings.showShortcuts && (
                <Toggle
                  label={t.openLinksInNewTab}
                  icon={<Globe size={18} className="text-gray-400 dark:text-zinc-500" />}
                  checked={settings.openLinksInNewTab}
                  onChange={(v) => updateSettings('openLinksInNewTab', v)}
                />
              )}
            </div>
          </div>

          {/* Data Management Section */}
          <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
            <SectionHeader icon={<Download size={14} />} label={t.dataManagement} />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={onExport} className={ACTION_BUTTON_CLASS}>
                <Download size={16} />
                {t.exportData}
              </button>
              <button onClick={() => fileInputRef.current?.click()} className={ACTION_BUTTON_CLASS}>
                <Upload size={16} />
                {t.importData}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".json"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
