import Link from 'next/link';
import { bottomBarLinks, SUPPORT_EMAIL } from './footerConfig';

const bottomLinkClassName =
  'rounded-md text-xs font-semibold text-slate-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 dark:text-slate-400 dark:focus-visible:ring-offset-slate-950';

export function FooterBottomBar() {
  return (
    <div className="mt-10 border-t border-slate-800 pt-6 dark:border-slate-800/80">
      <div className="flex flex-col items-center gap-4 text-center md:grid md:grid-cols-3 md:items-center md:gap-6 md:text-left">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} Zelance. All rights reserved.
        </p>

        <nav
          aria-label="Footer legal shortcuts"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-center"
        >
          {bottomBarLinks.map((link) => (
            <Link key={link.href} href={link.href} className={bottomLinkClassName}>
              {link.label}
            </Link>
          ))}
        </nav>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className={`${bottomLinkClassName} md:justify-self-end`}
        >
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
}
