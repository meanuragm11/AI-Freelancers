import { supabaseAdmin } from '@/lib/founder/server';
import { PRIORITY_RANK } from '@/lib/disputes/constants';

export type FounderDisputeListRow = {
  id: string;
  collab_id: string;
  buyer_id: string;
  freelancer_id: string;
  status: string;
  priority: string;
  decision_type: string;
  primary_reason: string;
  created_at: string;
  updated_at: string;
  escrow_frozen_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  buyer: { id: string; full_name: string | null } | null;
  freelancer: { id: string; full_name: string | null } | null;
  collab: {
    id: string;
    title: string | null;
    escrow_amount_usd: number | null;
    status: string | null;
  } | null;
};

export type FounderDisputeListResult = {
  disputes: FounderDisputeListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type ListParams = {
  status?: string | null;
  priority?: string | null;
  decision?: string | null;
  q?: string | null;
  page?: number;
  pageSize?: number;
};

function isClosedStatus(status: string) {
  return status === 'closed';
}

function compareDisputes(a: FounderDisputeListRow, b: FounderDisputeListRow) {
  const aClosed = isClosedStatus(a.status) ? 1 : 0;
  const bClosed = isClosedStatus(b.status) ? 1 : 0;
  if (aClosed !== bClosed) return aClosed - bClosed;

  const aPriority = PRIORITY_RANK[a.priority] ?? 3;
  const bPriority = PRIORITY_RANK[b.priority] ?? 3;
  if (aPriority !== bPriority) return aPriority - bPriority;

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

async function listFounderDisputesFallback(params: ListParams): Promise<FounderDisputeListResult> {
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

  let query = supabaseAdmin.from('disputes').select(
    `id, collab_id, buyer_id, freelancer_id, status, priority, decision_type, primary_reason,
     created_at, updated_at, escrow_frozen_at, resolved_at, closed_at,
     buyer:buyer_id(id, full_name), freelancer:freelancer_id(id, full_name),
     collab:collab_id(id, title, escrow_amount_usd, status)`,
    { count: 'exact' }
  );

  if (params.status) query = query.eq('status', params.status);
  if (params.priority) {
    if (params.priority === 'critical') {
      query = query.in('priority', ['critical', 'high']);
    } else {
      query = query.eq('priority', params.priority);
    }
  }
  if (params.decision) query = query.eq('decision_type', params.decision);
  if (params.q?.trim()) {
    const term = params.q.trim();
    query = query.or(
      `id.eq.${term},collab_id.eq.${term},primary_reason.ilike.%${term}%`
    );
  }

  const { count, error: countError } = await query;
  if (countError) throw countError;

  const { data, error } = await query.limit(5000);
  if (error) throw error;

  const sorted = [...(data ?? [])] as unknown as FounderDisputeListRow[];
  sorted.sort(compareDisputes);

  const total = count ?? sorted.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const offset = (page - 1) * pageSize;

  return {
    disputes: sorted.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function listFounderDisputes(params: ListParams): Promise<FounderDisputeListResult> {
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);

  const { data, error } = await supabaseAdmin.rpc('founder_list_disputes', {
    p_status: params.status || null,
    p_priority: params.priority || null,
    p_decision: params.decision || null,
    p_q: params.q?.trim() || null,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error || !data) {
    if (error) {
      console.warn('founder_list_disputes RPC unavailable, using fallback:', error.message);
    }
    return listFounderDisputesFallback({ ...params, page, pageSize });
  }

  return {
    disputes: (data.disputes ?? []) as FounderDisputeListRow[],
    total: Number(data.total ?? 0),
    page: Number(data.page ?? page),
    pageSize: Number(data.pageSize ?? pageSize),
    totalPages: Number(data.totalPages ?? 1),
  };
}
