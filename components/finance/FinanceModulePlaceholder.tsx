import { FinanceCard, FinanceEmptyState, FinancePage } from '@/components/finance';

type FinanceModulePlaceholderProps = {
  module: string;
  description: string;
};

export default function FinanceModulePlaceholder({ module, description }: FinanceModulePlaceholderProps) {
  return (
    <FinancePage>
      <FinanceCard padding="none">
        <FinanceEmptyState
          title={`${module} coming soon`}
          description={description}
        />
      </FinanceCard>
    </FinancePage>
  );
}
