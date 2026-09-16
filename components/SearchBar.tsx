
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { SearchEngine } from '../types';
import { TranslationType } from '../translations';

interface SearchBarProps {
  searchEngines: SearchEngine[];
  isEditing: boolean;
  onAddEngineClick: () => void;
  onDeleteEngine: (id: string) => void;
  openInNewTab: boolean;
  t: TranslationType;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  searchEngines,
  isEditing,
  onAddEngineClick,
  onDeleteEngine,
  openInNewTab,
  t
}) => {
  const [query, setQuery] = useState('');
  const [selectedEngine, setSelectedEngine] = useState<SearchEngine | null>(searchEngines[0] ?? null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync selected engine if searchEngines changes
  useEffect(() => {
    if (!searchEngines.find(e => e.id === selectedEngine?.id)) {
      setSelectedEngine(searchEngines[0] || null);
    }
  }, [searchEngines, selectedEngine?.id]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = (text: string) => {
    if (!text.trim()) return;

    const url = selectedEngine?.searchUrl.replace('%s', encodeURIComponent(text));
    if (!url) return;
    if (openInNewTab) {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleEngineSelect = (engine: SearchEngine) => {
    setSelectedEngine(engine);
    setIsDropdownOpen(false);
  };

  const renderIcon = (icon: string, className: string = "") => {
    const isUrl = icon.startsWith('http') || icon.startsWith('data:');
    const isSvg = icon.trim().startsWith('<svg');

    if (isUrl) {
      return <img src={icon} alt="" className={`object-contain ${className}`} />;
    }
    if (isSvg) {
      // Render as <img> via data URL: scripts inside user-supplied SVG cannot execute
      const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(icon)}`;
      return <img src={svgDataUrl} alt="" className={`object-contain ${className}`} />;
    }
    return <span className={className}>{icon}</span>;
  };

  if (!selectedEngine) return null;

  const placeholderText = t.searchPlaceholder.replace('%s', selectedEngine.name);

  return (
    <div className="w-full max-w-3xl mx-auto relative z-20" ref={searchContainerRef}>
      <form onSubmit={handleSearch} className="relative group">
        <div className={`
          flex items-center bg-white dark:bg-zinc-900 shadow-lg dark:shadow-black/40 border border-transparent dark:border-zinc-800
          transition-all duration-300 rounded-full
          focus-within:shadow-xl focus-within:border-blue-400 dark:focus-within:border-blue-600
        `}>
          {/* Engine Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 sm:gap-2 pl-3 sm:pl-5 pr-2 sm:pr-3 py-4 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors border-r border-gray-100 dark:border-zinc-800 justify-center"
            >
              <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6">
                {renderIcon(selectedEngine.icon, "w-5 h-5 sm:w-6 sm:h-6 text-lg sm:text-xl")}
              </div>
              <ChevronDown size={14} className={`hidden sm:block text-gray-400 dark:text-zinc-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-3 w-64 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl dark:shadow-black/50 border border-gray-100 dark:border-zinc-800 overflow-hidden py-2 anim-zoom origin-top-left z-30">
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {searchEngines.map((engine) => (
                    <div 
                      key={engine.id}
                      className={`flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group/item
                        ${selectedEngine.id === engine.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                      `}
                      onClick={() => handleEngineSelect(engine)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-gray-700 dark:text-gray-200">
                          {renderIcon(engine.icon, "w-5 h-5 text-lg")}
                        </div>
                        <span className={`text-sm truncate ${selectedEngine.id === engine.id ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-zinc-300'}`}>
                          {engine.name}
                        </span>
                      </div>
                      
                      {isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEngine(engine.id);
                          }}
                          className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover/item:opacity-100 transition-all"
                          title="Remove Engine"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddEngineClick();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-5 py-3 text-sm flex items-center gap-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800 transition-colors"
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      <Plus size={16} />
                    </div>
                    {t.addSearchEngine}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholderText}
            className="flex-1 px-3 sm:px-4 py-4 bg-transparent outline-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 text-base sm:text-lg"
            autoFocus
            autoComplete="off"
          />

          {/* Action Button */}
          <button
            type="submit"
            className="pr-4 sm:pr-6 pl-3 sm:pl-4 text-gray-400 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            <Search size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};
