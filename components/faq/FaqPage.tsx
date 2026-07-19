'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FAQ_CATEGORIES, type FaqCategory } from '@/lib/faq/content';

function FaqAccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left md:px-6 md:py-5"
      >
        <span className="text-sm font-bold text-slate-900 md:text-[15px] dark:text-white">
          {question}
        </span>
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 dark:bg-slate-800 dark:text-slate-400 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <p className="border-t border-slate-100 px-5 pb-5 pt-3 text-sm leading-relaxed text-slate-600 md:px-6 md:pb-6 dark:border-slate-800 dark:text-slate-300">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FaqPage() {
  const [query, setQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState(FAQ_CATEGORIES[0]?.id ?? '');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCategories = useMemo((): FaqCategory[] => {
    if (!normalizedQuery) return FAQ_CATEGORIES;

    return FAQ_CATEGORIES.map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.question.toLowerCase().includes(normalizedQuery) ||
          item.answer.toLowerCase().includes(normalizedQuery)
      ),
    })).filter((category) => category.items.length > 0);
  }, [normalizedQuery]);

  const hasResults = filteredCategories.length > 0;

  useEffect(() => {
    if (filteredCategories.length === 0) return;

    const stillVisible = filteredCategories.some((category) => category.id === activeCategoryId);
    if (!stillVisible) {
      setActiveCategoryId(filteredCategories[0].id);
    }
  }, [activeCategoryId, filteredCategories]);

  useEffect(() => {
    const headings = FAQ_CATEGORIES.map((category) =>
      document.getElementById(`faq-${category.id}`)
    ).filter((element): element is HTMLElement => element !== null);

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const id = visible[0]?.target.id.replace('faq-', '');
        if (id) setActiveCategoryId(id);
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [hasResults]);

  const scrollToCategory = useCallback((id: string) => {
    const element = document.getElementById(`faq-${id}`);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveCategoryId(id);
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  const toggleItem = useCallback((itemId: string) => {
    setOpenItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
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
            Frequently Asked Questions
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-500 md:text-lg dark:text-slate-400">
            Quick answers about projects, AI Solutions, payments, and your account.
          </p>

          <div className="relative mt-8 max-w-xl">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search questions..."
              aria-label="Search FAQs"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-blue-700 dark:focus:ring-blue-950/50"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        {!hasResults ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-lg font-black text-slate-900 dark:text-white">No results found</p>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              Try a different search term or browse the categories below.
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-600 dark:bg-white dark:text-slate-900 dark:hover:bg-blue-100"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="flex gap-12 lg:gap-16">
            <aside className="hidden w-56 shrink-0 lg:block">
              <nav
                aria-label="FAQ categories"
                className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Categories
                </p>
                <ul className="mt-4 space-y-1">
                  {(normalizedQuery ? filteredCategories : FAQ_CATEGORIES).map((category) => (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => scrollToCategory(category.id)}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                          activeCategoryId === category.id
                            ? 'bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                        }`}
                      >
                        {category.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <div className="min-w-0 flex-1 space-y-12">
              {filteredCategories.map((category) => (
                <section key={category.id} id={`faq-${category.id}`} className="scroll-mt-28">
                  <h2 className="mb-4 text-xl font-black tracking-tight text-slate-900 md:text-2xl dark:text-white">
                    {category.title}
                  </h2>
                  <div className="space-y-3">
                    {category.items.map((item) => (
                      <FaqAccordionItem
                        key={item.id}
                        question={item.question}
                        answer={item.answer}
                        isOpen={Boolean(openItems[item.id])}
                        onToggle={() => toggleItem(item.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center md:py-16">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl dark:text-white">
            Still need help?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm font-medium text-slate-500 md:text-base dark:text-slate-400">
            Can&apos;t find what you&apos;re looking for?
          </p>
          <Link
            href="/support"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-blue-700"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
