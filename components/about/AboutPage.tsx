'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export type AboutSection = {
  id: string;
  title: string;
  level?: 2 | 3;
  content: React.ReactNode | null;
};

export type AboutPageProps = {
  title: string;
  subtitle: string;
  intro?: React.ReactNode;
  sections: AboutSection[];
};

export default function AboutPage({
  title,
  subtitle,
  intro,
  sections,
}: AboutPageProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  return (
    <div className="min-h-[calc(100vh-160px)] bg-slate-50 dark:bg-slate-950">
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/80 via-transparent to-transparent dark:from-blue-950/30" />
        <div className="relative mx-auto max-w-6xl px-6 py-14 md:py-20">
          <Link
            href="/"
            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
          >
            ← Back to Home
          </Link>
          <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-slate-900 md:text-5xl dark:text-white">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-500 md:text-lg dark:text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="flex gap-12 lg:gap-16">
          <aside className="hidden w-56 shrink-0 lg:block">
            <nav
              aria-label="Table of contents"
              className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                On this page
              </p>
              <ul className="mt-4 space-y-1">
                {sections.map((section) => (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                        section.level === 3 ? 'pl-6 text-xs' : ''
                      } ${
                        activeId === section.id
                          ? 'bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                      }`}
                    >
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="min-w-0 max-w-[52rem] flex-1">
            {intro ? (
              <div className="prose-about mb-12 space-y-4 text-[15px] leading-7 text-slate-600 dark:text-slate-300">
                {intro}
              </div>
            ) : null}

            <div className="space-y-12">
              {sections.map((section) => {
                const HeadingTag = section.level === 3 ? 'h3' : 'h2';
                const headingClass =
                  section.level === 3
                    ? 'scroll-mt-28 text-lg font-bold text-slate-800 dark:text-slate-200'
                    : 'scroll-mt-28 text-2xl font-black tracking-tight text-slate-900 dark:text-white';

                return (
                  <section key={section.id} aria-labelledby={section.id}>
                    <HeadingTag id={section.id} className={headingClass}>
                      {section.title}
                    </HeadingTag>
                    {section.content ? (
                      <div className="prose-about mt-4 space-y-4 text-[15px] leading-7 text-slate-600 dark:text-slate-300">
                        {section.content}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>

            <footer className="mt-16 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Ready to get started?{' '}
                <Link
                  href="/buyer/discover"
                  className="font-bold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Discover experts
                </Link>{' '}
                or{' '}
                <Link
                  href="/builder/dashboard"
                  className="font-bold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  join as a builder
                </Link>
                .
              </p>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
