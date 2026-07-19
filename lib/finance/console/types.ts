export type ConsolePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const CONSOLE_PRIORITY_RANK: Record<ConsolePriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export interface InboxUrgentItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  priority: ConsolePriority;
  actionUrl: string;
  createdAt: string;
}

export interface InboxResponse {
  escrowBalance: number;
  pendingMoney: number;
  financeHealth: string;
  urgentItems: InboxUrgentItem[];
}

export interface FinanceCaseItem {
  id: string;
  type: 'refund' | 'dispute';
  buyer: { id: string; name: string | null };
  builder: { id: string; name: string | null };
  project: { id: string; title: string | null };
  amount: number;
  status: string;
  openedAt: string;
  priority: ConsolePriority;
  assignedTo: string | null;
  actionUrl: string;
}

export interface FinanceCasesResponse {
  items: FinanceCaseItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
