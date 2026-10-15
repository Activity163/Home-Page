
import React, { useCallback, useRef, useState } from 'react';
import { Settings, Plus, LayoutGrid, Settings2, Info, AlertTriangle, X } from 'lucide-react';
import type { Language, Link } from './types';
import { format } from './translations';
import { LocaleProvider } from './contexts/LocaleProvider';
import { useLocale } from './contexts/locale-context';
import { SearchBar } from './components/SearchBar';
import { CategoryGroup } from './components/CategoryGroup';
import { Modal } from './components/Modal';
import { SettingsModal } from './components/SettingsModal';
import { Clock } from './components/Clock';
import { AboutModal } from './components/AboutModal';
import { useAppData, type AppData } from './hooks/useAppData';
import { useTheme } from './hooks/useTheme';
import { useDocumentMeta } from './hooks/useDocumentMeta';
import { useLoadingScreen } from './hooks/useLoadingScreen';
import { createBackup, normalizeHttpUrl, normalizeSearchUrl, parseBackup } from './lib/normalize';
import { moveItem, moveLink } from './lib/reorder';

/** Titles of the shipped default categories, for the language switch. */
const CATEGORY_TITLE_MAP: Record<string, Record<Language, string>> = {
  Daily: { zh: '日常', en: 'Daily' },
  日常: { zh: '日常', en: 'Daily' },
  'Work & Dev': { zh: '工作与开发', en: 'Work & Dev' },
  工作与开发: { zh: '工作与开发', en: 'Work & Dev' },
  'News & Read': { zh: '新闻与阅读', en: 'News & Read' },
  新闻与阅读: { zh: '新闻与阅读', en: 'News & Read' },
};

interface DragPayload {
  type: 'category' | 'link';
  id: string;
  parentId?: string;
}

const AppShell: React.FC<{ data: AppData }> = ({ data }) => {
  const { t, language } = useLocale();
  const {
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
  } = data;

  useTheme(settings.theme);
  useDocumentMeta(settings.customTitle, settings.customIcon, language);
  useLoadingScreen();

  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddEngineModalOpen, setIsAddEngineModalOpen] = useState(false);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<Link | null>(null);

  // Form state
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkIconUrl, setNewLinkIconUrl] = useState('');
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newEngineName, setNewEngineName] = useState('');
  const [newEngineUrl, setNewEngineUrl] = useState('');
  const [newEngineIcon, setNewEngineIcon] = useState('');
  const [formError, setFormError] = useState('');

  const dragItem = useRef<DragPayload | null>(null);

  // --- Translation of default category titles on language change ---
  const prevLanguage = useRef(language);
  React.useEffect(() => {
    if (prevLanguage.current === language) return;
    prevLanguage.current = language;
    setCategories((prev) =>
      prev.map((cat) => {
        const mapped = CATEGORY_TITLE_MAP[cat.title];
        return mapped ? { ...cat, title: mapped[language] } : cat;
      }),
    );
  }, [language, setCategories]);

  // --- Data management ---
  const handleExportData = useCallback(() => {
    const payload = exportPayload();
    const blob = new Blob([JSON.stringify(createBackup(payload.categories, payload.searchEngines, payload.settings), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astralis_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportPayload]);

  const handleImportData = useCallback(
    (file: File) => {
      if (!confirm(t.importConfirm)) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(e.target?.result as string);
        } catch {
          alert(t.importInvalid);
          return;
        }

        // Every section is validated and repaired before it reaches state, so
        // a hostile or malformed backup cannot crash the render or inject a
        // `javascript:` URL into an href.
        const result = parseBackup(parsed, settings, searchEngines);
        if (!result) {
          alert(t.importInvalid);
          return;
        }

        replaceAll({
          categories: result.categories,
          searchEngines: result.searchEngines,
          settings: result.settings,
        });

        // Explain a lossy import rather than silently dropping data.
        const notes: string[] = [];
        if (result.report.dropped > 0) notes.push(format(t.importSummarySkipped, result.report.dropped));
        if (result.report.repaired > 0) notes.push(format(t.importSummaryRepaired, result.report.repaired));
        alert([t.done, ...notes].join('\n'));
        setIsSettingsOpen(false);
      };
      reader.onerror = () => alert(t.importInvalid);
      reader.readAsText(file);
    },
    [t, settings, searchEngines, replaceAll],
  );

  // --- Drag & drop ---
  const onDragStart = useCallback((e: React.DragEvent, type: 'category' | 'link', id: string, parentId?: string) => {
    dragItem.current = { type, id, parentId };
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent, type: 'category' | 'link', targetId: string, targetParentId?: string) => {
      e.preventDefault();
      const dragged = dragItem.current;
      dragItem.current = null;
      if (!dragged) return;

      if (dragged.type === 'category' && type === 'category') {
        setCategories((prev) => {
          const from = prev.findIndex((c) => c.id === dragged.id);
          const to = prev.findIndex((c) => c.id === targetId);
          if (from === -1 || to === -1) return prev;
          return moveItem(prev, from, to);
        });
        return;
      }

      if (dragged.type === 'link' && type === 'link' && dragged.parentId && targetParentId) {
        setCategories((prev) => moveLink(prev, dragged.id, dragged.parentId!, targetParentId, targetId));
      }
    },
    [setCategories],
  );

  // Keyboard/touch reorder for links, used by the arrow buttons.
  const handleMoveLink = useCallback(
    (categoryId: string, linkId: string, direction: -1 | 1) => {
      setCategories((prev) => {
        const cat = prev.find((c) => c.id === categoryId);
        if (!cat) return prev;
        const from = cat.links.findIndex((l) => l.id === linkId);
        if (from === -1) return prev;
        const to = from + direction;
        if (to < 0 || to >= cat.links.length) return prev;
        const next = [...prev];
        const index = prev.indexOf(cat);
        next[index] = { ...cat, links: moveItem(cat.links, from, to) };
        return next;
      });
    },
    [setCategories],
  );

  // --- Link handlers ---
  const handleAddLinkClick = useCallback((categoryId: string) => {
    setActiveCategoryId(categoryId);
    setEditingLink(null);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setNewLinkIconUrl('');
    setFormError('');
    setIsLinkModalOpen(true);
  }, []);

  const handleEditLinkClick = useCallback((link: Link, categoryId: string) => {
    setActiveCategoryId(categoryId);
    setEditingLink(link);
    setNewLinkTitle(link.title);
    setNewLinkUrl(link.url);
    setNewLinkIconUrl(link.icon || '');
    setFormError('');
    setIsLinkModalOpen(true);
  }, []);

  const submitLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategoryId || !newLinkTitle.trim()) return;

    // Reject hostile schemes instead of trusting the input.
    const url = normalizeHttpUrl(newLinkUrl);
    if (!url) {
      setFormError(t.importInvalid);
      return;
    }

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== activeCategoryId) return cat;
        if (editingLink) {
          return {
            ...cat,
            links: cat.links.map((l) =>
              l.id === editingLink.id
                ? { ...l, title: newLinkTitle.trim(), url, icon: newLinkIconUrl.trim() || undefined }
                : l,
            ),
          };
        }
        const newLink: Link = {
          id: `l-${Date.now().toString(36)}`,
          title: newLinkTitle.trim(),
          url,
          icon: newLinkIconUrl.trim() || undefined,
        };
        return { ...cat, links: [...cat.links, newLink] };
      }),
    );

    setIsLinkModalOpen(false);
    setFormError('');
  };

  const deleteLink = useCallback(
    (categoryId: string, linkId: string) => {
      if (!confirm(t.deleteLinkConfirm)) return;
      setCategories((prev) =>
        prev.map((cat) => (cat.id === categoryId ? { ...cat, links: cat.links.filter((l) => l.id !== linkId) } : cat)),
      );
    },
    [t, setCategories],
  );

  // --- Category handlers ---
  const submitNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newCategoryTitle.trim();
    if (!title) return;
    setCategories((prev) => [...prev, { id: `c-${Date.now().toString(36)}`, title, links: [] }]);
    setIsAddCategoryModalOpen(false);
    setNewCategoryTitle('');
  };

  const deleteCategory = useCallback(
    (categoryId: string) => {
      if (!confirm(t.deleteCategoryConfirm)) return;
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    },
    [t, setCategories],
  );

  // --- Search engine handlers ---
  const handleAddEngineClick = useCallback(() => {
    setIsAddEngineModalOpen(true);
    setNewEngineName('');
    setNewEngineUrl('');
    setNewEngineIcon('');
    setFormError('');
  }, []);

  const submitNewEngine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEngineName.trim()) return;

    // An engine without %s silently discards the query, so require it.
    const searchUrl = normalizeSearchUrl(newEngineUrl);
    if (!searchUrl) {
      setFormError(t.searchUrlHelp);
      return;
    }

    setSearchEngines((prev) => [
      ...prev,
      {
        id: `e-${Date.now().toString(36)}`,
        name: newEngineName.trim(),
        searchUrl,
        icon: newEngineIcon.trim() || '🔍',
      },
    ]);
    setIsAddEngineModalOpen(false);
    setFormError('');
  };

  const deleteEngine = useCallback(
    (id: string) => {
      if (searchEngines.length <= 1) {
        alert(t.minOneEngine);
        return;
      }
      if (!confirm(t.deleteEngineConfirm)) return;
      setSearchEngines((prev) => prev.filter((e) => e.id !== id));
      if (settings.defaultSearchEngineId === id) updateSettings('defaultSearchEngineId', '');
    },
    [t, searchEngines.length, settings.defaultSearchEngineId, updateSettings, setSearchEngines],
  );

  const handleEngineChange = useCallback(
    (id: string) => updateSettings('defaultSearchEngineId', id),
    [updateSettings],
  );

  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), []);
  const handleOpenAbout = useCallback(() => setIsAboutOpen(true), []);
  const handleToggleEditing = useCallback(() => setIsEditing((v) => !v), []);

  const hasCustomWallpaper = Boolean(settings.customWallpaper);
  const isCentered = !settings.showShortcuts;

  return (
    <div
      className={`min-h-screen flex flex-col items-center p-6 relative overflow-x-hidden transition-colors duration-700 bg-[#f8f9fa] dark:bg-black ${
        isCentered ? 'justify-center' : 'justify-center md:justify-start md:pt-[20vh]'
      }`}
    >
      {/* --- Wallpaper / Background --- */}
      <div className="fixed inset-0 z-0 pointer-events-none transition-all duration-1000">
        {hasCustomWallpaper ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
              style={{
                // Value is validated as an http(s) URL on the way in; the strip
                // is a second line of defence for the CSS url() context.
                backgroundImage: `url("${settings.customWallpaper.replace(/["'()\\]/g, '')}")`,
                filter: settings.wallpaperBlur ? 'blur(20px)' : 'none',
                transform: settings.wallpaperBlur ? 'scale(1.1)' : 'scale(1)',
              }}
            />
            <div className="absolute inset-0 bg-black/30 dark:bg-black/50" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-white via-[#f8f9fa] to-[#f8f9fa] dark:opacity-0 transition-opacity duration-700" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-black to-black opacity-0 dark:opacity-100 transition-opacity duration-700" />
          </>
        )}
      </div>

      {/* Storage quota warning */}
      {storageFull && (
        <div
          role="alert"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 max-w-lg px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 text-sm shadow-lg anim-fade-down"
        >
          <AlertTriangle size={18} aria-hidden="true" className="flex-shrink-0" />
          <span>{t.storageFull}</span>
          <button
            onClick={dismissStorageWarning}
            aria-label={t.closeDialog}
            className="ml-2 text-amber-700 dark:text-amber-300 hover:opacity-70"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Top Controls */}
      <div className="absolute top-6 right-6 z-40 flex items-center gap-2">
        <button
          onClick={handleOpenAbout}
          aria-label={t.about}
          title={t.about}
          className="p-2.5 rounded-full bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 transition-all backdrop-blur-sm"
        >
          <Info size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>

        {settings.showShortcuts && (
          <button
            onClick={handleToggleEditing}
            aria-label={isEditing ? t.done : t.customizeLayout}
            aria-pressed={isEditing}
            title={isEditing ? t.done : t.customizeLayout}
            className={`
              p-2.5 rounded-full transition-all duration-300 backdrop-blur-sm
              ${
                isEditing
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black'
                  : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
              }
            `}
          >
            {isEditing ? (
              <Settings2 size={20} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <LayoutGrid size={20} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        )}

        <button
          onClick={handleOpenSettings}
          aria-label={t.settings}
          title={t.settings}
          className="p-2.5 rounded-full bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 transition-all backdrop-blur-sm"
        >
          <Settings size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl flex flex-col items-center z-10 space-y-12 mb-20 pb-8">
        <div className="text-center mt-8">
          <Clock
            name={settings.greetingName}
            hasCustomWallpaper={hasCustomWallpaper}
            showLunar={settings.showLunar}
            showSeconds={settings.showSeconds}
          />
        </div>

        {/* relative + z-30 keeps the engine dropdown above the shortcuts grid: the entrance
            animation leaves a transform on this wrapper, which traps the child's z-index */}
        <div className="w-full relative z-30 anim-fade-up anim-delay-100">
          <SearchBar
            searchEngines={searchEngines}
            defaultEngineId={settings.defaultSearchEngineId}
            onEngineChange={handleEngineChange}
            isEditing={isEditing}
            onAddEngineClick={handleAddEngineClick}
            onDeleteEngine={deleteEngine}
            openInNewTab={settings.openSearchInNewTab}
          />
        </div>

        {settings.showShortcuts && (
          <div className="w-full relative">
            {isEditing && (
              <div className="text-center text-xs text-gray-500 dark:text-zinc-400 mb-4">
                {t.dragHint}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 anim-fade-up-lg anim-delay-200">
              {categories.map((category) => (
                <CategoryGroup
                  key={category.id}
                  category={category}
                  isEditing={isEditing}
                  onAddLink={handleAddLinkClick}
                  onEditLink={handleEditLinkClick}
                  onDeleteLink={deleteLink}
                  onDeleteCategory={deleteCategory}
                  onMoveLink={handleMoveLink}
                  openInNewTab={settings.openLinksInNewTab}
                  showFavicons={settings.showFavicons}
                  layoutMode={settings.layoutMode}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                />
              ))}

              {isEditing && (
                <button
                  onClick={() => setIsAddCategoryModalOpen(true)}
                  className="group flex flex-col items-center justify-center p-6 rounded-3xl border border-dashed border-gray-300 dark:border-zinc-800 text-gray-500 dark:text-zinc-500 hover:border-gray-400 dark:hover:border-zinc-600 hover:text-gray-700 dark:hover:text-zinc-400 transition-all h-full min-h-[160px] bg-white/30 dark:bg-black/20"
                >
                  <Plus size={24} strokeWidth={1.5} aria-hidden="true" className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <span className="font-medium text-xs tracking-wide">{t.newCategory}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        updateSettings={updateSettings}
        searchEngines={searchEngines}
        onExport={handleExportData}
        onImport={handleImportData}
      />

      <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title={editingLink ? t.editShortcut : t.addShortcut}>
        <form onSubmit={submitLink} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">{t.title}</label>
            <input
              type="text"
              required
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-gray-400 dark:focus:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white transition-colors"
              placeholder={t.phLinkTitle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">{t.url}</label>
            <input
              type="text"
              required
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-gray-400 dark:focus:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white transition-colors"
              placeholder={t.phLinkUrl}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">{t.iconUrl}</label>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mb-2">{t.iconUrlHelp}</p>
            <input
              type="text"
              value={newLinkIconUrl}
              onChange={(e) => setNewLinkIconUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-gray-400 dark:focus:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white transition-colors"
              placeholder={t.phLinkIcon}
            />
          </div>
          {formError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}
          <button
            type="submit"
            className="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity font-medium"
          >
            {editingLink ? t.saveChanges : t.addLink}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isAddCategoryModalOpen} onClose={() => setIsAddCategoryModalOpen(false)} title={t.newCategory}>
        <form onSubmit={submitNewCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">{t.categoryName}</label>
            <input
              type="text"
              required
              value={newCategoryTitle}
              onChange={(e) => setNewCategoryTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-gray-400 dark:focus:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white transition-colors"
              placeholder={t.phCategoryName}
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity font-medium"
          >
            {t.createCategory}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isAddEngineModalOpen} onClose={() => setIsAddEngineModalOpen(false)} title={t.addSearchEngine}>
        <form onSubmit={submitNewEngine} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">{t.name}</label>
            <input
              type="text"
              required
              value={newEngineName}
              onChange={(e) => setNewEngineName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-gray-400 dark:focus:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white transition-colors"
              placeholder={t.phEngineName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">{t.searchUrl}</label>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mb-2">{t.searchUrlHelp}</p>
            <input
              type="text"
              required
              value={newEngineUrl}
              onChange={(e) => setNewEngineUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-gray-400 dark:focus:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white transition-colors"
              placeholder={t.phEngineUrl}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">{t.icon}</label>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mb-2">{t.iconHelp}</p>
            <input
              type="text"
              value={newEngineIcon}
              onChange={(e) => setNewEngineIcon(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-gray-400 dark:focus:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white transition-colors"
              placeholder={t.phEngineIcon}
            />
          </div>
          {formError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}
          <button
            type="submit"
            className="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity font-medium"
          >
            {t.addEngine}
          </button>
        </form>
      </Modal>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} onExportData={handleExportData} />
    </div>
  );
};

const App: React.FC = () => {
  // Data is owned here so the locale provider can follow the stored language
  // immediately, including when the user switches it inside the settings modal.
  const data = useAppData();

  return (
    <LocaleProvider language={data.settings.language}>
      <AppShell data={data} />
    </LocaleProvider>
  );
};

export default App;
