import { supabaseAdmin } from '@/lib/founder/server';
import {
  FOUNDER_CATEGORY_DB_VALUES,
  type FounderTicketCategory,
} from '@/lib/support/founderConstants';

export type FounderTicketListRow = {
  id: string;
  ticket_number: string;
  user_id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
};

export type FounderTicketListResult = {
  tickets: FounderTicketListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type ListParams = {
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  q?: string | null;
  userId?: string | null;
  page?: number;
  pageSize?: number;
};

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function isResolvedStatus(status: string) {
  return status === 'resolved' || status === 'closed';
}

function compareTickets(a: FounderTicketListRow, b: FounderTicketListRow) {
  const aResolved = isResolvedStatus(a.status) ? 1 : 0;
  const bResolved = isResolvedStatus(b.status) ? 1 : 0;
  if (aResolved !== bResolved) return aResolved - bResolved;

  const aPriority = PRIORITY_RANK[a.priority] ?? 3;
  const bPriority = PRIORITY_RANK[b.priority] ?? 3;
  if (aPriority !== bPriority) return aPriority - bPriority;

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function applyFilters(query: any, params: ListParams) {
  let filtered = query;

  if (params.userId) {
    filtered = filtered.eq('user_id', params.userId);
  }
  if (params.status) {
    filtered = filtered.eq('status', params.status);
  }
  if (params.priority) {
    if (params.priority === 'critical') {
      filtered = filtered.in('priority', ['critical', 'high']);
    } else {
      filtered = filtered.eq('priority', params.priority);
    }
  }
  if (params.category && params.category in FOUNDER_CATEGORY_DB_VALUES) {
    filtered = filtered.in(
      'category',
      FOUNDER_CATEGORY_DB_VALUES[params.category as FounderTicketCategory]
    );
  }
  if (params.q?.trim()) {
    const term = params.q.trim();
    filtered = filtered.or(
      `ticket_number.ilike.%${term}%,subject.ilike.%${term}%,email.ilike.%${term}%,name.ilike.%${term}%`
    );
  }

  return filtered;
}

async function listFounderTicketsFallback(params: ListParams): Promise<FounderTicketListResult> {
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

  const countQuery = applyFilters(
    supabaseAdmin.from('support_tickets').select('id', { count: 'exact', head: true }),
    params
  );
  const { count, error: countError } = await countQuery;
  if (countError) throw countError;

  const total = count ?? 0;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const { data, error } = await applyFilters(
    supabaseAdmin
      .from('support_tickets')
      .select(
        'id, ticket_number, user_id, name, email, category, subject, status, priority, created_at, updated_at'
      ),
    params
  ).limit(5000);

  if (error) throw error;

  const sorted = [...(data ?? [])].sort(compareTickets);
  const offset = (page - 1) * pageSize;

  return {
    tickets: sorted.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function listFounderTickets(params: ListParams): Promise<FounderTicketListResult> {
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

  const { data, error } = await supabaseAdmin.rpc('founder_list_support_tickets', {
    p_status: params.status || null,
    p_priority: params.priority || null,
    p_category: params.category || null,
    p_q: params.q?.trim() || null,
    p_user_id: params.userId || null,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error || !data) {
    if (error) {
      console.warn('founder_list_support_tickets RPC unavailable, using fallback:', error.message);
    }
    return listFounderTicketsFallback({ ...params, page, pageSize });
  }

  return {
    tickets: (data.tickets ?? []) as FounderTicketListRow[],
    total: Number(data.total ?? 0),
    page: Number(data.page ?? page),
    pageSize: Number(data.pageSize ?? pageSize),
    totalPages: Number(data.totalPages ?? 1),
  };
}
