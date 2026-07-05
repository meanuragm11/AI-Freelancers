import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { isUuid } from '@/lib/founder/utils';

type SearchResult = {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const results: SearchResult[] = [];
  const uuidMatch = isUuid(q);

  try {
    const [tickets, users, transactions, escrow, services, assets, disputes, refunds, withdrawals] = await Promise.all([
      supabaseAdmin
        .from('support_tickets')
        .select('id, ticket_number, subject, email, name')
        .or(`ticket_number.ilike.%${q}%,subject.ilike.%${q}%,email.ilike.%${q}%,name.ilike.%${q}%`)
        .limit(10),
      uuidMatch
        ? supabaseAdmin.from('profiles').select('id, full_name, role').eq('id', q).limit(10)
        : supabaseAdmin.from('profiles').select('id, full_name, role').ilike('full_name', `%${q}%`).limit(10),
      uuidMatch
        ? supabaseAdmin.from('transactions').select('id, order_id, amount_usd, status').or(`id.eq.${q},buyer_id.eq.${q}`).limit(10)
        : supabaseAdmin.from('transactions').select('id, order_id, amount_usd, status').ilike('order_id', `%${q}%`).limit(10),
      uuidMatch
        ? supabaseAdmin.from('collabs').select('id, title, status, escrow_amount_usd').or(`id.eq.${q},buyer_id.eq.${q},builder_id.eq.${q}`).limit(10)
        : supabaseAdmin.from('collabs').select('id, title, status, escrow_amount_usd').ilike('title', `%${q}%`).limit(10),
      uuidMatch
        ? supabaseAdmin.from('services').select('id, title, status').eq('id', q).limit(10)
        : supabaseAdmin.from('services').select('id, title, status').ilike('title', `%${q}%`).limit(10),
      uuidMatch
        ? supabaseAdmin.from('components').select('id, title, status').eq('id', q).limit(10)
        : supabaseAdmin.from('components').select('id, title, status').ilike('title', `%${q}%`).limit(10),
      uuidMatch
        ? supabaseAdmin.from('disputes').select('id, primary_reason, status').or(`id.eq.${q},collab_id.eq.${q},buyer_id.eq.${q},freelancer_id.eq.${q}`).limit(10)
        : supabaseAdmin.from('disputes').select('id, primary_reason, status').ilike('primary_reason', `%${q}%`).limit(10),
      uuidMatch
        ? supabaseAdmin.from('refund_requests').select('id, requested_amount_usd, status, collab_id').or(`id.eq.${q},collab_id.eq.${q},buyer_id.eq.${q},builder_id.eq.${q}`).limit(10)
        : { data: [] as Array<{ id: string; requested_amount_usd: number; status: string; collab_id: string }> },
      uuidMatch
        ? supabaseAdmin.from('builder_withdrawals').select('id, reference_code, amount_usd, status').or(`id.eq.${q},builder_id.eq.${q}`).limit(10)
        : supabaseAdmin.from('builder_withdrawals').select('id, reference_code, amount_usd, status').ilike('reference_code', `%${q}%`).limit(10),
    ]);

    (tickets.data ?? []).forEach((t) =>
      results.push({
        type: 'Support Ticket',
        id: t.id,
        title: t.subject,
        subtitle: `${t.ticket_number} · ${t.name} (${t.email})`,
        href: `/founder/tickets/${t.id}`,
      })
    );

    (users.data ?? []).forEach((u) =>
      results.push({
        type: 'User',
        id: u.id,
        title: u.full_name || 'Unnamed User',
        subtitle: u.role || 'user',
        href: `/founder/users/${u.id}`,
      })
    );

    (transactions.data ?? []).forEach((t) =>
      results.push({
        type: 'Transaction',
        id: t.id,
        title: t.order_id,
        subtitle: `$${Number(t.amount_usd).toFixed(2)} · ${t.status}`,
        href: `/founder/payments?q=${t.id}`,
      })
    );

    (escrow.data ?? []).forEach((c) =>
      results.push({
        type: 'Escrow / Project',
        id: c.id,
        title: c.title,
        subtitle: `${c.status} · $${Number(c.escrow_amount_usd).toFixed(2)}`,
        href: `/founder/payments?q=${c.id}`,
      })
    );

    (services.data ?? []).forEach((s) =>
      results.push({
        type: 'Service',
        id: s.id,
        title: s.title,
        subtitle: s.status,
        href: `/founder/users?q=${s.id}`,
      })
    );

    (assets.data ?? []).forEach((a) =>
      results.push({
        type: 'AI Asset',
        id: a.id,
        title: a.title,
        subtitle: a.status,
        href: `/founder/users?q=${a.id}`,
      })
    );

    (disputes.data ?? []).forEach((d) =>
      results.push({
        type: 'Dispute',
        id: d.id,
        title: d.primary_reason,
        subtitle: d.status,
        href: `/founder/disputes/${d.id}`,
      })
    );

    (refunds.data ?? []).forEach((r) =>
      results.push({
        type: 'Refund Request',
        id: r.id,
        title: `$${Number(r.requested_amount_usd).toFixed(2)} refund`,
        subtitle: r.status,
        href: `/founder/payments?tab=refunds&q=${r.id}`,
      })
    );

    (withdrawals.data ?? []).forEach((w) =>
      results.push({
        type: 'Withdrawal',
        id: w.id,
        title: `$${Number(w.amount_usd).toFixed(2)} withdrawal`,
        subtitle: `${w.reference_code} · ${w.status}`,
        href: `/founder/payments?tab=withdrawals&q=${w.id}`,
      })
    );

    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error('Founder global search error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
