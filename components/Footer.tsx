"use client";

import Link from 'next/link';
import Image from 'next/image';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { FooterColumn } from '@/components/footer/FooterColumn';
import { FooterSocialLinks } from '@/components/footer/FooterSocialLinks';
import { FooterBottomBar } from '@/components/footer/FooterBottomBar';
import {
  companyDescription,
  companyLinks,
  legalLinks,
  platformLinks,
  resourceLinks,
  SUPPORT_EMAIL,
} from '@/components/footer/footerConfig';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-900 py-10 text-slate-300 dark:border-slate-800/80 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 lg:gap-8">
          <div className="sm:col-span-2 md:col-span-3 lg:col-span-1">
            <Link
              href="/"
              aria-label="Zelance homepage"
              className="mb-4 inline-block rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 dark:focus-visible:ring-offset-slate-950"
            >
              <Image src="/logo.svg" alt="Zelance Logo" width={140} height={40} className="h-8 w-auto object-contain" />
            </Link>
            <p className="mb-5 max-w-xs text-sm font-medium leading-relaxed text-slate-400 dark:text-slate-500">
              {companyDescription}
            </p>
            <FooterColumn title="Company" links={companyLinks} />
          </div>

          <FooterColumn title="Platform" links={platformLinks} />
          <FooterColumn title="Resources" links={resourceLinks} />
          <FooterColumn title="Legal" links={legalLinks} />

          <FooterColumn title="Connect">
            <FooterSocialLinks />
          </FooterColumn>

          <FooterColumn title="Contact">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="group inline-flex items-center gap-2.5 rounded-xl text-sm font-medium text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 dark:focus-visible:ring-offset-slate-950"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/80 text-slate-300 transition-all duration-200 group-hover:border-blue-500/50 group-hover:bg-blue-600 group-hover:text-white dark:border-slate-700 dark:bg-slate-800">
                <EnvelopeIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span>{SUPPORT_EMAIL}</span>
            </a>
          </FooterColumn>
        </div>

        <FooterBottomBar />
      </div>
    </footer>
  );
}
