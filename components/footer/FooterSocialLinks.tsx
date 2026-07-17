import { socialLinks } from './footerConfig';

function SocialIcon({ icon }: { icon: 'x' | 'linkedin' }) {
  const shared = 'h-4 w-4';

  if (icon === 'x') {
    return (
      <svg className={shared} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  return (
    <svg className={shared} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.126 0 2.063 2.063 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function FooterSocialLinks() {
  return (
    <ul className="flex flex-wrap items-center gap-3">
      {socialLinks.map((social) => (
        <li key={social.icon}>
          <a
            href={social.href}
            aria-label={social.label}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/80 text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/50 hover:bg-blue-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
          >
            <SocialIcon icon={social.icon} />
          </a>
        </li>
      ))}
    </ul>
  );
}
