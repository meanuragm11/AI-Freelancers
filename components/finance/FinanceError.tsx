/** Error panel with optional retry callback for finance data views. */

type FinanceErrorProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export default function FinanceError({
  title = 'Unable to load data',
  message,
  onRetry,
  retryLabel = 'Try again',
  className = '',
}: FinanceErrorProps) {
  return (
    <div
      role="alert"
      className={`rounded-xl border border-rose-200 bg-rose-50 px-5 py-8 text-center ${className}`}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">{title}</p>
      <p className="text-sm font-medium text-rose-700 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center justify-center bg-white hover:bg-rose-100 border border-rose-200 text-rose-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
