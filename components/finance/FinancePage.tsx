/** Root page wrapper — consistent spacing and max-width for finance console views. */

type FinancePageProps = {
  children: React.ReactNode;
  className?: string;
};

export default function FinancePage({ children, className = '' }: FinancePageProps) {
  return <div className={`w-full space-y-6 ${className}`}>{children}</div>;
}
