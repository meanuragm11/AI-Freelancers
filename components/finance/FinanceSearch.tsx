'use client';

/** Controlled search input styled for finance toolbars and filter rows. */

type FinanceSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
};

export default function FinanceSearch({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search…',
  disabled = false,
  loading = false,
  className = '',
  id = 'finance-search',
  'aria-label': ariaLabel = 'Search finance records',
}: FinanceSearchProps) {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <form onSubmit={handleSubmit} className={`relative flex-1 min-w-[180px] max-w-md ${className}`}>
      <svg
        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl pl-10 pr-4 py-2 text-sm font-medium text-slate-900 outline-none transition-colors disabled:opacity-60"
      />
    </form>
  );
}
