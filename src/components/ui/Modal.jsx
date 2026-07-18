import React, { useEffect } from 'react';

export default function Modal({
  open = false,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 600,
  closeOnEscape = true,
}) {
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl max-h-[88vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        style={{ width: `${width}px` }}
      >
        {/* Header */}
        {(title || subtitle || onClose) && (
          <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none"
                aria-label="Cerrar"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Body */}
        {children && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {children}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
