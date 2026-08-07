import { useEffect } from 'react';

/**
 * Soft deterrents against right-click / DevTools shortcuts on the user app.
 * Note: browsers cannot fully block Inspect — determined users can still open it.
 */
const DevToolsGuard = () => {
  useEffect(() => {
    const onContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const onKeyDown = (e) => {
      const key = e.key?.toLowerCase();
      const isF12 = e.key === 'F12';
      const isCtrlShift =
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        ['i', 'j', 'c', 'k', 'u'].includes(key);
      const isCtrlU = (e.ctrlKey || e.metaKey) && key === 'u';
      const isCtrlS = (e.ctrlKey || e.metaKey) && key === 's';

      if (isF12 || isCtrlShift || isCtrlU || isCtrlS) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const onSelectStart = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (['input', 'textarea'].includes(tag) || e.target?.isContentEditable) return;
      // Allow normal selection in form fields only
    };

    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('selectstart', onSelectStart, true);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('selectstart', onSelectStart, true);
    };
  }, []);

  return null;
};

export default DevToolsGuard;
