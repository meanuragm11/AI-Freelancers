import FinanceLayoutShell from '@/components/finance/FinanceLayoutShell';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <FinanceLayoutShell>{children}</FinanceLayoutShell>;
}
