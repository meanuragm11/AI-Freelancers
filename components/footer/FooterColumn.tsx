import Link from 'next/link';
import type { FooterLinkItem } from './footerConfig';

interface FooterColumnProps {
  title: string;
  links?: FooterLinkItem[];
  children?: React.ReactNode;
  className?: string;
}

const linkClassName =
  'inline-flex rounded-lg text-sm font-medium text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 dark:focus-visible:ring-offset-slate-950';

export function FooterColumn({ title, links, children, className = '' }: FooterColumnProps) {
  return (
    <nav aria-labelledby={`footer-${title.toLowerCase().replace(/\s+/g, '-')}`} className={className}>
      <h2
        id={`footer-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="mb-4 text-[10px] font-black uppercase tracking-widest text-white"
      >
        {title}
      </h2>
      {links && links.length > 0 && (
        <ul className="space-y-2.5">
          {links.map((link) => (
            <li key={`${link.href}-${link.label}`}>
              {link.external ? (
                <a
                  href={link.href}
                  className={linkClassName}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ) : (
                <Link href={link.href} className={linkClassName}>
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {children}
    </nav>
  );
}
