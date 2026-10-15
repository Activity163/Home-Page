import React from 'react';
import { X } from 'lucide-react';
import { useFocusTrap, useModalBehavior } from '../hooks/useModalBehavior';
import { useT } from '../contexts/locale-context';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const t = useT();
  const { panelRef, onBackdropClick } = useModalBehavior(isOpen, onClose);
  useFocusTrap(isOpen, panelRef);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm anim-fade"
      onClick={onBackdropClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden anim-zoom border border-gray-200 dark:border-zinc-800 outline-none"
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label={t.closeDialog}
            className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 dark:text-zinc-200">{children}</div>
      </div>
    </div>
  );
};
