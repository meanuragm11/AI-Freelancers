import { supabase } from '@/lib/supabaseClient';

export interface BillingRecord {
  id: string;
  date: string;
  description: string;
  sublabel?: string;
  amount: number;
  currency: 'USD';
  type: 'subscription' | 'component' | 'escrow' | 'invoice';
  status: string;
  invoiceNumber?: string;
}

export async function fetchBuyerBillingHistory(userId: string): Promise<BillingRecord[]> {
  const records: BillingRecord[] = [];

  const [txResult, libraryResult, subsResult, invoicesResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .eq('buyer_id', userId)
      .in('status', ['completed', 'paid', 'captured'])
      .order('created_at', { ascending: false }),
    supabase
      .from('library')
      .select('id, component_id, purchased_at, components(title, price_usd)')
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false }),
    supabase
      .from('active_subscriptions')
      .select('id, amount, status, created_at, renewal_date, listings(title)')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, gross_amount_usd, status, created_at, collabs(title)')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  for (const tx of txResult.data ?? []) {
    records.push({
      id: `tx-${tx.id}`,
      date: tx.created_at,
      description: tx.transaction_type === 'component_purchase'
        ? 'Component Purchase'
        : 'Escrow Funding',
      sublabel: tx.order_id ? `Order ${tx.order_id.slice(-8)}` : undefined,
      amount: Number(tx.amount_usd),
      currency: 'USD',
      type: tx.transaction_type === 'component_purchase' ? 'component' : 'escrow',
      status: tx.status,
    });
  }

  const paidComponentIds = new Set(
    (txResult.data ?? [])
      .filter((tx) => tx.transaction_type === 'component_purchase' && tx.item_id)
      .map((tx) => tx.item_id as string)
  );

  for (const entry of libraryResult.data ?? []) {
    const component = entry.components as { title?: string; price_usd?: number } | null;
    if (entry.component_id && paidComponentIds.has(entry.component_id)) continue;

    records.push({
      id: `lib-${entry.id}`,
      date: entry.purchased_at,
      description: component?.title ?? 'Component License',
      sublabel: 'Asset Acquisition',
      amount: Number(component?.price_usd ?? 0),
      currency: 'USD',
      type: 'component',
      status: 'completed',
    });
  }

  for (const sub of subsResult.data ?? []) {
    const listing = sub.listings as { title?: string } | null;
    records.push({
      id: `sub-${sub.id}`,
      date: sub.created_at ?? sub.renewal_date,
      description: listing?.title ?? 'Subscription',
      sublabel: 'Subscription',
      amount: Number(sub.amount),
      currency: 'USD',
      type: 'subscription',
      status: sub.status ?? 'active',
    });
  }

  for (const inv of invoicesResult.data ?? []) {
    const collab = inv.collabs as { title?: string } | null;
    records.push({
      id: `inv-${inv.id}`,
      date: inv.created_at,
      description: collab?.title ?? 'Escrow Release',
      sublabel: 'Invoice',
      amount: Number(inv.gross_amount_usd),
      currency: 'USD',
      type: 'invoice',
      status: inv.status,
      invoiceNumber: inv.invoice_number,
    });
  }

  return records.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
