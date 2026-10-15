import { useEffect } from 'react';

/**
 * Hide and remove the static loading screen once React has mounted.
 *
 * This lives in a hook because the markup is in index.html (it must paint
 * before the bundle loads) while the dismissal has to happen after the first
 * render. Without it the spinner stays on top of the app forever.
 */
export const useLoadingScreen = (): void => {
  useEffect(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    let removeTimer: ReturnType<typeof setTimeout> | undefined;

    // One frame of delay so the first paint is committed before the fade.
    const showTimer = setTimeout(() => {
      loadingScreen.classList.add('loaded');
      // Remove after the CSS transition (0.3s) so it cannot intercept clicks.
      removeTimer = setTimeout(() => loadingScreen.remove(), 300);
    }, 100);

    return () => {
      clearTimeout(showTimer);
      if (removeTimer) clearTimeout(removeTimer);
    };
  }, []);
};
