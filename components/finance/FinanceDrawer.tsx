'use client';

/** Slide-over drawer for finance detail panels — sm/md/lg sizes with header, body, footer. */

import { useEffect, useId, useRef } from 'react';
import FinanceLoading from './FinanceLoading';

type FinanceDrawerSize = 'sm' | 'md' | 'lg';

type FinanceDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: FinanceDrawerSize;
  loading?: boolean;
};

const SIZES: Record<FinanceDrawerSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

export default function FinanceDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  loading = false,
}: FinanceDrawerProps) {
  const titleId = useId();
  const descId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        aria-label="Close drawer"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`relative flex flex-col w-full ${SIZES[size]} h-full bg-white border-l border-slate-200 shadow-2xl`}
      >
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-black text-slate-900 tracking-tight truncate">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-sm font-medium text-slate-500 mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? <FinanceLoading variant="inline" /> : children}
        </div>

        {footer && (
          <footer className="px-5 py-4 border-t border-slate-200 bg-slate-50 shrink-0">{footer}</footer>
        )}
      </aside>
    </div>
  );
}
