'use client';

/** Finance module nested layout — sticky sub-sidebar, header, and scrollable content region. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FINANCE_NAV_ITEMS } from './constants';

type FinanceLayoutShellProps = {
  children: React.ReactNode;
};

function getActiveModule(pathname: string) {
  return FINANCE_NAV_ITEMS.find((item) => pathname.startsWith(item.href));
}

export default function FinanceLayoutShell({ children }: FinanceLayoutShellProps) {
  const pathname = usePathname();
  const activeModule = getActiveModule(pathname);

  return (
    <div className="-m-4 md:-m-8 flex min-h-[calc(100vh-12rem)] bg-slate-100/50">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white sticky top-20 self-start h-[calc(100vh-5rem)]">
        <div className="px-4 py-5 border-b border-slate-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Founder</p>
          <p className="text-sm font-black uppercase tracking-widest text-slate-900">Finance</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label="Finance modules">
          {FINANCE_NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-3 overflow-x-auto">
          <nav className="flex gap-2 min-w-max" aria-label="Finance modules">
            {FINANCE_NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <header className="sticky top-20 z-10 bg-white/95 backdrop-blur border-b border-slate-200 px-4 md:px-6 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Finance Console
          </p>
          <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
            {activeModule?.label ?? 'Finance'}
          </h1>
          {activeModule?.description && (
            <p className="text-sm font-medium text-slate-500 mt-1">{activeModule.description}</p>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
