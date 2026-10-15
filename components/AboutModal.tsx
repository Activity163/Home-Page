import React from 'react';
import { X, Download, Trash2, Database, Shield, Info } from 'lucide-react';
import { useT } from '../contexts/locale-context';
import { useFocusTrap, useModalBehavior } from '../hooks/useModalBehavior';
import { clearAppStorage } from '../lib/storage';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportData: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onExportData }) => {
  const t = useT();
  const { panelRef, onBackdropClick } = useModalBehavior(isOpen, onClose);
  useFocusTrap(isOpen, panelRef);

  if (!isOpen) return null;

  const handleClearCache = () => {
    if (!confirm(t.clearCacheConfirm)) return;
    // `localStorage.clear()` used to wipe the entire origin, which would take
    // out any unrelated app co-hosted on the same origin. Only our keys now.
    clearAppStorage();
    window.location.reload();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm anim-fade"
      onClick={onBackdropClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.aboutTitle}
        tabIndex={-1}
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden anim-zoom border border-gray-200 dark:border-zinc-800 max-h-[85vh] overflow-y-auto custom-scrollbar outline-none"
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t.aboutTitle}</h3>
          <button
            onClick={onClose}
            aria-label={t.closeDialog}
            className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Privacy Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-gray-800 dark:text-white">
              <Shield size={20} aria-hidden="true" className="text-blue-500" />
              <h4 className="font-semibold text-base">{t.privacyTitle}</h4>
            </div>
            <div className="pl-7 space-y-2 text-sm text-gray-600 dark:text-zinc-400">
              <p>{t.privacyDesc1}</p>
              <p>{t.privacyDesc2}</p>
              <p>{t.privacyDesc3}</p>
            </div>
          </section>

          {/* Data Storage Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-gray-800 dark:text-white">
              <Database size={20} aria-hidden="true" className="text-green-600 dark:text-green-500" />
              <h4 className="font-semibold text-base">{t.dataStorageTitle}</h4>
            </div>
            <div className="pl-7 space-y-2 text-sm text-gray-600 dark:text-zinc-400">
              <p>{t.dataStorageDesc}</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>{t.dataItem1}</li>
                <li>{t.dataItem2}</li>
                <li>{t.dataItem3}</li>
              </ul>
            </div>
          </section>

          {/* Data Management Actions */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-gray-800 dark:text-white">
              <Info size={20} aria-hidden="true" className="text-purple-600 dark:text-purple-500" />
              <h4 className="font-semibold text-base">{t.dataManagementTitle}</h4>
            </div>
            <div className="pl-7 space-y-3">
              <p className="text-sm text-gray-600 dark:text-zinc-400">{t.dataManagementDesc}</p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onExportData}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Download size={16} aria-hidden="true" />
                  {t.exportData}
                </button>

                <button
                  onClick={handleClearCache}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  {t.clearCache}
                </button>
              </div>
            </div>
          </section>

          {/* Footer Info */}
          <section className="pt-4 border-t border-gray-100 dark:border-zinc-800">
            <p className="text-xs text-gray-500 dark:text-zinc-500 text-center">{t.aboutFooter}</p>
          </section>
        </div>
      </div>
    </div>
  );
};
