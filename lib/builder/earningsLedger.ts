import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CANCELLED_COLLAB_STATUSES,
  COMPLETED_MILESTONE_STATUSES,
  LOCKED_MILESTONE_STATUSES,
} from '@/lib/marketplace/status';

export const BUILDER_PLATFORM_FEE_USD = 5;
export const MIN_WITHDRAWAL_USD = 10;

/** Statuses that reserve balance against available earnings (TOCTOU-safe). */
export const RESERVED_WITHDRAWAL_STATUSES = [
  'requested',
  'pending_review',
  'approved',
  'processing',
  'completed',
] as const;

export type LedgerTransaction = {
  id: string;
  date: string;
  description: string;
  type: 'milestone_release' | 'component_sale' | 'withdrawal' | 'adjustment' | 'escrow_deposit' | 'escrow_refund';
  status: 'cleared' | 'processing' | 'pending' | 'failed';
  amountUsd: number;
};

export type PayoutMethodSummary = {
  connected: boolean;
  payoutRegion?: 'india' | 'international';
  accountHolderName?: string;
  bankName?: string;
  accountLast4?: string;
  routingLast4?: string;
  ifscCode?: string;
  paypalEmail?: string;
};

export type EarningsLedgerSummary = {
  availableBalanceUsd: number;
  pendingEscrowUsd: number;
  lifetimeEarnedUsd: number;
  totalWithdrawnUsd: number;
  payoutMethod: PayoutMethodSummary;
  transactions: LedgerTransaction[];
};

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

function componentNetFromTransaction(amountUsd: number, feeUsd: number) {
  return roundUsd(Math.max(0, Number(amountUsd) - Number(feeUsd || 0)));
}

function collabNetFromGross(grossUsd: number) {
  return roundUsd(Math.max(0, Number(grossUsd) - BUILDER_PLATFORM_FEE_USD));
}

function isReleasedInvoiceStatus(status?: string | null) {
  const normalized = (status || '').toLowerCase();
  return normalized === 'paid' || normalized === 'processing';
}

function escrowDepositStatus(
  escrowStatus: string,
  milestoneStatus: string,
  collabStatus: string
): LedgerTransaction['status'] {
  const normalizedEscrow = escrowStatus.toLowerCase();
  const normalizedMilestone = milestoneStatus.toLowerCase();
  const normalizedCollab = collabStatus.toLowerCase();

  if (
    (CANCELLED_COLLAB_STATUSES as readonly string[]).includes(normalizedCollab) &&
    normalizedEscrow === 'funded'
  ) {
    return 'failed';
  }

  if (normalizedEscrow === 'pending_payment') return 'pending';
  if (normalizedEscrow !== 'funded') return 'failed';

  if ((COMPLETED_MILESTONE_STATUSES as readonly string[]).includes(normalizedMilestone)) {
    return 'cleared';
  }

  return 'pending';
}

// TODO(FINANCE_PHASE_1): Integrate with Finance V2 ledger — event-sourced entries, service_purchase earnings, SQL/TS parity tests.
export async function computeBuilderEarningsLedger(
  supabaseAdmin: SupabaseClient,
  builderId: string
): Promise<EarningsLedgerSummary> {
  const collabsRes = await supabaseAdmin
    .from('collabs')
    .select('id, title, status, escrow_amount_usd, created_at, updated_at')
    .eq('builder_id', builderId);

  if (collabsRes.error) throw collabsRes.error;

  const collabs = collabsRes.data ?? [];
  const collabIds = collabs.map((collab) => collab.id);

  const [
    milestonesRes,
    componentsRes,
    invoicesRes,
    transactionsRes,
    payoutMethodRes,
    withdrawalsRes,
    escrowRes,
  ] = await Promise.all([
    collabIds.length > 0
      ? supabaseAdmin
          .from('milestones')
          .select('id, collab_id, title, amount_usd, status, created_at')
          .in('collab_id', collabIds)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin.from('components').select('id, title, price_usd, sales_count').eq('builder_id', builderId),
    supabaseAdmin
      .from('invoices')
      .select('id, collab_id, gross_amount_usd, net_payout_usd, status, invoice_number, created_at')
      .eq('builder_id', builderId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('transactions')
      .select('id, item_id, amount_usd, fee_usd, status, created_at, updated_at')
      .eq('status', 'completed')
      .eq('transaction_type', 'component_purchase')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('builder_payout_methods')
      .select('*')
      .eq('builder_id', builderId)
      .eq('status', 'active')
      .maybeSingle(),
    supabaseAdmin
      .from('builder_withdrawals')
      .select('id, amount_usd, status, reference_code, created_at, completed_at, failure_reason')
      .eq('builder_id', builderId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('escrow_transactions')
      .select('id, collab_id, milestone_id, amount_usd, transaction_type, status, created_at')
      .eq('builder_id', builderId)
      .order('created_at', { ascending: false }),
  ]);

  if (milestonesRes.error) throw milestonesRes.error;
  if (componentsRes.error) throw componentsRes.error;
  if (invoicesRes.error) throw invoicesRes.error;
  if (transactionsRes.error) throw transactionsRes.error;
  if (payoutMethodRes.error) throw payoutMethodRes.error;
  if (withdrawalsRes.error) throw withdrawalsRes.error;
  if (escrowRes.error) throw escrowRes.error;

  const collabIdsSet = new Set(collabIds);
  const collabById = new Map(collabs.map((collab) => [collab.id, collab]));
  const milestones = (milestonesRes.data ?? []).filter((milestone) => collabIdsSet.has(milestone.collab_id));
  const milestoneById = new Map(milestones.map((milestone) => [milestone.id, milestone]));
  const components = componentsRes.data ?? [];
  const componentIds = new Set(components.map((component) => component.id));
  const componentById = new Map(components.map((component) => [component.id, component]));
  const escrowRows = escrowRes.data ?? [];

  const lockedStatuses = LOCKED_MILESTONE_STATUSES as readonly string[];
  const cancelledCollabStatuses = CANCELLED_COLLAB_STATUSES as readonly string[];

  let pendingEscrowUsd = 0;
  for (const escrow of escrowRows) {
    if (escrow.transaction_type !== 'milestone_funding') continue;

    const milestone = escrow.milestone_id ? milestoneById.get(escrow.milestone_id) : undefined;
    const collabMeta = collabById.get(escrow.collab_id);
    const milestoneStatus = (milestone?.status || '').toLowerCase();
    const collabStatus = (collabMeta?.status || '').toLowerCase();
    const escrowStatus = (escrow.status || '').toLowerCase();
    const amount = Number(escrow.amount_usd || 0);
    if (amount <= 0) continue;

    if (cancelledCollabStatuses.includes(collabStatus)) continue;

    if (escrowStatus === 'pending_payment') {
      pendingEscrowUsd += amount;
      continue;
    }

    if (escrowStatus === 'funded' && lockedStatuses.includes(milestoneStatus)) {
      pendingEscrowUsd += amount;
    }
  }

  if (pendingEscrowUsd <= 0) {
    pendingEscrowUsd = milestones
      .filter((milestone) => lockedStatuses.includes((milestone.status || '').toLowerCase()))
      .reduce((sum, milestone) => sum + Number(milestone.amount_usd || 0), 0);

    if (pendingEscrowUsd <= 0) {
      pendingEscrowUsd = collabs
        .filter((collab) => ['funded', 'in_progress', 'submitted', 'active'].includes((collab.status || '').toLowerCase()))
        .reduce((sum, collab) => sum + Number(collab.escrow_amount_usd || 0), 0);
    }
  }

  const transactions: LedgerTransaction[] = [];
  let lifetimeEarnedUsd = 0;

  for (const invoice of invoicesRes.data ?? []) {
    const net = roundUsd(Number(invoice.net_payout_usd || 0));
    if (net <= 0) continue;

    const collab = collabById.get(invoice.collab_id);
    const isCleared = isReleasedInvoiceStatus(invoice.status);
    if (isCleared) lifetimeEarnedUsd += net;

    transactions.push({
      id: `invoice-${invoice.id}`,
      date: invoice.created_at,
      description: `${collab?.title || 'Milestone Release'} · Invoice ${invoice.invoice_number || ''}`.trim(),
      type: 'milestone_release',
      status: invoice.status === 'paid' ? 'cleared' : isCleared ? 'processing' : 'pending',
      amountUsd: net,
    });
  }

  const invoicedCollabIds = new Set((invoicesRes.data ?? []).map((invoice) => invoice.collab_id));

  for (const collab of collabs) {
    if (invoicedCollabIds.has(collab.id)) continue;
    if (!['completed', 'released'].includes((collab.status || '').toLowerCase())) continue;

    const net = collabNetFromGross(Number(collab.escrow_amount_usd || 0));
    if (net <= 0) continue;

    lifetimeEarnedUsd += net;
    transactions.push({
      id: `collab-${collab.id}`,
      date: collab.updated_at || collab.created_at,
      description: `${collab.title} · Milestone Release`,
      type: 'milestone_release',
      status: 'cleared',
      amountUsd: net,
    });
  }

  for (const transaction of transactionsRes.data ?? []) {
    if (!componentIds.has(transaction.item_id)) continue;

    const component = componentById.get(transaction.item_id);
    const net = componentNetFromTransaction(Number(transaction.amount_usd || 0), Number(transaction.fee_usd || 0));
    if (net <= 0) continue;

    lifetimeEarnedUsd += net;
    transactions.push({
      id: `component-${transaction.id}`,
      date: transaction.updated_at || transaction.created_at,
      description: `${component?.title || 'AI Component'} · Component Sale`,
      type: 'component_sale',
      status: 'cleared',
      amountUsd: net,
    });
  }

  for (const escrow of escrowRows) {
    if (escrow.transaction_type !== 'milestone_funding') continue;

    const milestone = escrow.milestone_id ? milestoneById.get(escrow.milestone_id) : undefined;
    const collabMeta = collabById.get(escrow.collab_id);
    const milestoneStatus = (milestone?.status || '').toLowerCase();
    const collabStatus = (collabMeta?.status || '').toLowerCase();
    const escrowStatus = (escrow.status || '').toLowerCase();
    const amount = Number(escrow.amount_usd || 0);
    if (amount <= 0) continue;

    const title = milestone?.title || collabMeta?.title || 'Milestone';

    transactions.push({
      id: `escrow-${escrow.id}`,
      date: escrow.created_at,
      description: `${title} · Escrow Deposit`,
      type: 'escrow_deposit',
      status: escrowDepositStatus(escrowStatus, milestoneStatus, collabStatus),
      amountUsd: amount,
    });

    if (cancelledCollabStatuses.includes(collabStatus) && escrowStatus === 'funded') {
      transactions.push({
        id: `escrow-refund-${escrow.id}`,
        date: escrow.created_at,
        description: `${title} · Escrow Refund to Buyer`,
        type: 'escrow_refund',
        status: 'cleared',
        amountUsd: -amount,
      });
    }
  }

  let totalWithdrawnUsd = 0;
  for (const withdrawal of withdrawalsRes.data ?? []) {
    const amount = roundUsd(Number(withdrawal.amount_usd || 0));
    const status = (withdrawal.status || '').toLowerCase();
    const reservesBalance = (RESERVED_WITHDRAWAL_STATUSES as readonly string[]).includes(status);

    if (reservesBalance) {
      totalWithdrawnUsd += amount;
    }

    const ledgerStatus: LedgerTransaction['status'] =
      status === 'completed'
        ? 'cleared'
        : ['requested', 'pending_review', 'approved'].includes(status)
          ? 'pending'
          : status === 'processing'
            ? 'processing'
            : 'failed';

    transactions.push({
      id: `withdrawal-${withdrawal.id}`,
      date: withdrawal.completed_at || withdrawal.created_at,
      description: `Withdrawal · ${withdrawal.reference_code}`,
      type: 'withdrawal',
      status: ledgerStatus,
      amountUsd: -amount,
    });
  }

  lifetimeEarnedUsd = roundUsd(lifetimeEarnedUsd);
  totalWithdrawnUsd = roundUsd(totalWithdrawnUsd);
  pendingEscrowUsd = roundUsd(pendingEscrowUsd);
  const availableBalanceUsd = roundUsd(Math.max(0, lifetimeEarnedUsd - totalWithdrawnUsd));

  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const payoutRow = payoutMethodRes.data;
  const payoutMethod: PayoutMethodSummary = payoutRow
    ? {
        connected: true,
        payoutRegion: payoutRow.payout_region as 'india' | 'international',
        accountHolderName: payoutRow.account_holder_name,
        bankName: payoutRow.bank_name ?? undefined,
        accountLast4: payoutRow.account_last4,
        routingLast4: payoutRow.routing_last4 ?? undefined,
        ifscCode: payoutRow.ifsc_code ?? undefined,
        paypalEmail: payoutRow.paypal_email ?? undefined,
      }
    : { connected: false };

  return {
    availableBalanceUsd,
    pendingEscrowUsd,
    lifetimeEarnedUsd,
    totalWithdrawnUsd,
    payoutMethod,
    transactions: transactions.slice(0, 100),
  };
}
