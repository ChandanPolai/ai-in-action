import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Right-side drawer panel (replaces centered popups/modals).
 * Mobile: full-width bottom-friendly slide; Desktop: right edge drawer.
 */
export const Drawer = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer = null
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-2xl'
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        aria-label="Close drawer overlay"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm border-0 cursor-pointer"
        onClick={onClose}
      />

      <aside
        className={`relative w-full ${widths[size] || widths.md} h-full bg-white shadow-2xl flex flex-col animate-drawer-in border-l border-slate-200`}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Drawer'}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
          <h3 className="text-lg font-bold text-slate-800 truncate">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-slate-100 p-4 bg-slate-50/80">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
};

export default Drawer;
