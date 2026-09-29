
import React, { useState } from 'react';
import { Plus, Trash2, ExternalLink, GripHorizontal, Pencil } from 'lucide-react';
import { Category, Link, LayoutMode } from '../types';
import { TranslationType } from '../translations';

interface CategoryGroupProps {
  category: Category;
  isEditing: boolean;
  onDeleteLink: (categoryId: string, linkId: string) => void;
  onAddLink: (categoryId: string) => void;
  onEditLink: (link: Link, categoryId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  openInNewTab: boolean;
  showFavicons: boolean;
  layoutMode: LayoutMode;
  t: TranslationType;
  onDragStart: (e: React.DragEvent, type: 'category' | 'link', id: string, parentId?: string) => void;
  onDragOver: (e: React.DragEvent, type: 'category' | 'link', id: string) => void;
  onDrop: (e: React.DragEvent, type: 'category' | 'link', id: string, parentId?: string) => void;
}

const Favicon: React.FC<{ link: Link; className?: string }> = ({ link, className }) => {
  const [error, setError] = useState(false);

  const getFaviconUrl = (u: string) => {
    try {
      const domain = new URL(u).hostname;
      return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;
    } catch {
      return '';
    }
  };

  const imgSrc = link.icon ? link.icon : getFaviconUrl(link.url);

  if (error || !imgSrc) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 rounded-full ${className}`}>
        <span className="font-bold uppercase text-xs sm:text-sm">{link.title.charAt(0)}</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt=""
      className={`object-contain rounded-md ${className}`}
      onError={() => setError(true)}
    />
  );
};

export const CategoryGroup: React.FC<CategoryGroupProps> = ({
  category,
  isEditing,
  onDeleteLink,
  onAddLink,
  onEditLink,
  onDeleteCategory,
  openInNewTab,
  showFavicons,
  layoutMode,
  t,
  onDragStart,
  onDragOver,
  onDrop
}) => {

  const gridClasses = {
    card: 'grid-cols-3 sm:grid-cols-3 gap-3',
    list: 'grid-cols-1 gap-2',
    compact: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'
  }[layoutMode];

  return (
    <div
      className={`bg-white/30 dark:bg-zinc-900/30 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/50 dark:border-zinc-800/50 transition-all duration-300 relative group h-fit flex flex-col
          ${isEditing ? 'cursor-move hover:border-dashed hover:border-gray-400 dark:hover:border-zinc-600' : ''}
        `}
      draggable={isEditing}
      onDragStart={(e) => onDragStart(e, 'category', category.id)}
      onDragOver={(e) => onDragOver(e, 'category', category.id)}
      onDrop={(e) => onDrop(e, 'category', category.id)}
    >

      <div className="flex justify-between items-center mb-4 pl-1">
        <h3 className="font-semibold text-gray-700 dark:text-zinc-200 text-sm tracking-wide flex items-center gap-2 select-none">
          {isEditing && <GripHorizontal size={14} className="text-gray-400" />}
          {category.title}
          <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-400 px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            {category.links.length}
          </span>
        </h3>
        {isEditing && (
          <button
            onClick={() => onDeleteCategory(category.id)}
            className="text-gray-400 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            title="Delete Category"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className={`grid ${gridClasses}`}>
        {category.links.map((link) => (
          <div
            key={link.id}
            className={`relative group/link w-full ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}
            draggable={isEditing}
            onDragStart={(e) => {
              e.stopPropagation();
              onDragStart(e, 'link', link.id, category.id);
            }}
            onDragOver={(e) => {
              e.stopPropagation();
              onDragOver(e, 'link', link.id);
            }}
            onDrop={(e) => {
              e.stopPropagation();
              onDrop(e, 'link', link.id, category.id);
            }}
          >
            <a
              href={link.url}
              target={isEditing ? "_self" : (openInNewTab ? "_blank" : "_self")}
              rel={openInNewTab ? "noopener noreferrer" : undefined}
              onClick={(e) => {
                if (isEditing) {
                  e.preventDefault();
                  onEditLink(link, category.id);
                }
              }}
              className={`
                flex items-center relative overflow-hidden transition-all duration-200 w-full outline-none focus-visible:ring-2 ring-blue-500/50
                ${isEditing
                  ? 'bg-gray-50/50 dark:bg-zinc-800/30 cursor-pointer border border-dashed border-gray-300 dark:border-zinc-700 opacity-80 hover:opacity-100'
                  : 'bg-white dark:bg-zinc-800/40 border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 hover:shadow-lg dark:hover:shadow-black/40 hover:bg-white dark:hover:bg-zinc-800'
                }
                
                ${layoutMode === 'card' ? `
                  flex-col p-4 aspect-[4/3] rounded-2xl gap-3 justify-center
                ` : ''}

                ${layoutMode === 'list' ? `
                  flex-row p-3 h-14 rounded-xl gap-4 justify-start px-4
                ` : ''}

                ${layoutMode === 'compact' ? `
                  flex-row p-2 h-10 rounded-lg gap-2 justify-center
                ` : ''}
              `}
            >
              {showFavicons && (
                <div className={`
                  flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover/link:scale-110
                  ${layoutMode === 'card' ? 'w-10 h-10 shadow-sm rounded-xl' : ''}
                  ${layoutMode === 'list' ? 'w-6 h-6' : ''}
                  ${layoutMode === 'compact' ? 'w-4 h-4' : ''}
                `}>
                  <Favicon
                    link={link}
                    className="w-full h-full"
                  />
                </div>
              )}

              <div className={`
                 flex flex-col overflow-hidden
                 ${layoutMode === 'card' ? 'items-center text-center w-full' : ''}
                 ${layoutMode === 'list' ? 'items-start flex-1' : ''}
                 ${layoutMode === 'compact' ? 'items-center max-w-full' : ''}
              `}>
                <span className={`
                  font-medium truncate w-full text-gray-700 dark:text-zinc-200 group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400 transition-colors
                  ${layoutMode === 'card' ? (showFavicons ? 'text-xs' : 'text-sm font-semibold') : ''}
                  ${layoutMode === 'list' ? 'text-sm' : ''}
                  ${layoutMode === 'compact' ? 'text-xs' : ''}
                `}>
                  {link.title}
                </span>

                {layoutMode === 'list' && (
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 truncate w-full max-w-[200px]">
                    {new URL(link.url).hostname.replace('www.', '')}
                  </span>
                )}
              </div>

              {!isEditing && layoutMode === 'list' && (
                <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 text-gray-300 dark:text-zinc-600 absolute right-3 transition-opacity" />
              )}

              {isEditing && (
                 <div className="absolute inset-0 bg-black/20 dark:bg-black/50 flex items-center justify-center opacity-0 group-hover/link:opacity-100 transition-opacity">
                   <Pencil size={layoutMode === 'card' ? 20 : 16} className="text-white" />
                 </div>
              )}
            </a>

            {isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteLink(category.id, link.id);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 hover:scale-110 transition-all z-20"
              >
                <Plus size={12} className="rotate-45" />
              </button>
            )}
          </div>
        ))}

        {isEditing && (
          <button
            onClick={() => onAddLink(category.id)}
            className={`
              flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group/add w-full
              text-gray-400 dark:text-zinc-600 hover:text-blue-500 dark:hover:text-blue-400
              ${layoutMode === 'card' ? 'aspect-[4/3] rounded-2xl flex-col gap-2' : ''}
              ${layoutMode === 'list' ? 'h-14 rounded-xl' : ''}
              ${layoutMode === 'compact' ? 'h-10 rounded-lg' : ''}
            `}
          >
            <Plus size={layoutMode === 'card' ? 20 : 16} />
            {layoutMode === 'card' && <span className="text-xs font-medium">{t.add}</span>}
          </button>
        )}
      </div>
    </div>
  );
};
