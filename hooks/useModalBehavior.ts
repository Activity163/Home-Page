import { useEffect, useRef } from 'react';

/**
 * Shared dialog behaviour for all modals: Escape to close, backdrop click to
 * close, background scroll lock, and initial focus.
 *
 * None of the three modals previously supported Escape or backdrop dismissal,
 * and none exposed `role="dialog"`/`aria-modal`, which made them invisible to
 * screen readers as dialogs.
 */
export const useModalBehavior = (isOpen: boolean, onClose: () => void) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    // Prevent the page behind the dialog from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    // Focus the panel so screen readers announce the dialog and Escape works
    // without requiring a click first.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  /** Clicking the backdrop (but not the panel) dismisses the dialog. */
  const onBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return { panelRef, onBackdropClick };
};

/**
 * Keep Tab focus inside the dialog. Without this, tabbing walks into the page
 * behind the modal.
 */
export const useFocusTrap = (
  isOpen: boolean,
  panelRef: React.RefObject<HTMLDivElement | null>,
) => {
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [isOpen, panelRef]);
};
