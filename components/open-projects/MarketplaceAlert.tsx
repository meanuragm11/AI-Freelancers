'use client';

import React from 'react';

type MarketplaceAlertProps = {
  title: string;
  message: string;
  variant?: 'warning' | 'error' | 'info';
  action?: React.ReactNode;
};

const VARIANTS = {
  warning: {
    container: 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50',
    icon: 'text-amber-600',
    title: 'text-amber-950',
    message: 'text-amber-800/90',
  },
  error: {
    container: 'border-rose-200/80 bg-gradient-to-br from-rose-50 to-red-50/50',
    icon: 'text-rose-600',
    title: 'text-rose-950',
    message: 'text-rose-800/90',
  },
  info: {
    container: 'border-blue-200/80 bg-gradient-to-br from-blue-50 to-slate-50',
    icon: 'text-blue-600',
    title: 'text-slate-900',
    message: 'text-slate-600',
  },
};

export function MarketplaceAlert({
  title,
  message,
  variant = 'warning',
  action,
}: MarketplaceAlertProps) {
  const styles = VARIANTS[variant];

  return (
    <div
      className={`rounded-xl border p-4 md:p-5 shadow-sm ${styles.container}`}
      role="alert"
    >
      <div className="flex gap-3">
        <div className={`mt-0.5 shrink-0 ${styles.icon}`} aria-hidden="true">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${styles.title}`}>{title}</p>
          <p className={`mt-1 text-sm leading-relaxed ${styles.message}`}>{message}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
