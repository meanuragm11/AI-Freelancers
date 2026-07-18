import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';
import {
  ATTENTION_PRIORITY_RANK,
  disputeAttentionPriority,
  moderationAttentionPriority,
  OPEN_DISPUTE_STATUSES,
  OPEN_TICKET_STATUSES,
  PENDING_MODERATION_STATUSES,
  ticketAttentionPriority,
  type AttentionPriority,
} from '@/lib/founder/overview';

const PAGE_SIZE = 20;
const SOURCE_FETCH_LIMIT = 100;

type AttentionItem = {
  id: string;
  priority: AttentionPriority;
  type: 'support_ticket' | 'dispute' | 'moderation';
  title: string;
  created_at: string;
  status: string;
  href: string;
};

function sortAttentionItems(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => {
    const rankDiff = ATTENTION_PRIORITY_RANK[a.priority] - ATTENTION_PRIORITY_RANK[b.priority];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function GET(req: Request) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));

    const [ticketsRes, disputesRes, moderationRes, ticketCount, disputeCount, moderationCount] =
      await Promise.all([
        supabaseAdmin
          .from('support_tickets')
          .select('id, subject, status, priority, created_at')
          .in('status', [...OPEN_TICKET_STATUSES])
          .order('created_at', { ascending: false })
          .limit(SOURCE_FETCH_LIMIT),
        supabaseAdmin
          .from('disputes')
          .select('id, primary_reason, status, priority, created_at')
          .in('status', [...OPEN_DISPUTE_STATUSES])
          .order('created_at', { ascending: false })
          .limit(SOURCE_FETCH_LIMIT),
        supabaseAdmin
          .from('moderation_logs')
          .select('id, entity_type, entity_id, reason, category, status, risk_score, created_at')
          .in('status', [...PENDING_MODERATION_STATUSES])
          .order('created_at', { ascending: false })
          .limit(SOURCE_FETCH_LIMIT),
        supabaseAdmin
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .in('status', [...OPEN_TICKET_STATUSES]),
        supabaseAdmin
          .from('disputes')
          .select('id', { count: 'exact', head: true })
          .in('status', [...OPEN_DISPUTE_STATUSES]),
        supabaseAdmin
          .from('moderation_logs')
          .select('id', { count: 'exact', head: true })
          .in('status', [...PENDING_MODERATION_STATUSES]),
      ]);

    const items: AttentionItem[] = [];

    for (const ticket of ticketsRes.data ?? []) {
      items.push({
        id: `ticket-${ticket.id}`,
        priority: ticketAttentionPriority(ticket.status, ticket.priority),
        type: 'support_ticket',
        title: ticket.subject,
        created_at: ticket.created_at,
        status: ticket.status,
        href: `/founder/tickets/${ticket.id}`,
      });
    }

    for (const dispute of disputesRes.data ?? []) {
      items.push({
        id: `dispute-${dispute.id}`,
        priority: disputeAttentionPriority(dispute.status, dispute.priority),
        type: 'dispute',
        title: dispute.primary_reason,
        created_at: dispute.created_at,
        status: dispute.status,
        href: `/founder/disputes/${dispute.id}`,
      });
    }

    for (const row of moderationRes.data ?? []) {
      const entityLabel = row.entity_type.replace(/_/g, ' ');
      items.push({
        id: `moderation-${row.id}`,
        priority: moderationAttentionPriority(row.status, Number(row.risk_score ?? 0)),
        type: 'moderation',
        title: row.reason?.trim() || row.category?.trim() || `${entityLabel} review`,
        created_at: row.created_at,
        status: row.status,
        href: `/founder/moderation?type=${row.entity_type === 'chat' ? 'chat' : row.entity_type}`,
      });
    }

    const sorted = sortAttentionItems(items);
    const total =
      (ticketCount.count ?? 0) + (disputeCount.count ?? 0) + (moderationCount.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const offset = (page - 1) * PAGE_SIZE;

    return NextResponse.json({
      items: sorted.slice(offset, offset + PAGE_SIZE),
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error('Founder overview attention error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
