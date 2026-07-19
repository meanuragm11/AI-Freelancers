/** Shared skeleton primitives for finance console loading states. */

type FinanceSkeletonProps = {
  className?: string;
};

export function FinanceSkeleton({ className = '' }: FinanceSkeletonProps) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} aria-hidden="true" />;
}

export function FinanceSkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <FinanceSkeleton key={i} className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}
