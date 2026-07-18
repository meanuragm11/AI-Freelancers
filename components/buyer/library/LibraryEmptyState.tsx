import Link from "next/link";

export default function LibraryEmptyState() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-sm">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-amber-100/40 blur-3xl" />

      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-slate-50 shadow-sm">
        <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </div>

      <h3 className="relative text-xl font-black text-slate-900">Your library is empty</h3>
      <p className="relative mx-auto mt-2 max-w-md text-sm font-medium text-slate-500">
        Purchased AI agents, prompts, and architectures will appear here with instant download access.
      </p>

      <Link
        href="/buyer/discover"
        className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-blue-600"
      >
        Discover AI Solutions
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </Link>
    </div>
  );
}
