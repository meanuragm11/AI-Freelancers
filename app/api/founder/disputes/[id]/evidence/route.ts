import { NextResponse } from 'next/server';
import { requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { formatProfileDisplayName } from '@/lib/display/formatDisplayName';

type RouteParams = { params: Promise<{ id: string }> };

async function getDisputeCollabId(disputeId: string) {
  const { data, error } = await supabaseAdmin
    .from('disputes')
    .select('id, collab_id, buyer_id, freelancer_id')
    .eq('id', disputeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const dispute = await getDisputeCollabId(id);
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    const { data: evidence, error } = await supabaseAdmin
      .from('dispute_evidence')
      .select('id, dispute_id, uploaded_by, file_name, file_url, file_type, file_size, created_at')
      .eq('dispute_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const uploaderIds = Array.from(
      new Set((evidence ?? []).map((row) => row.uploaded_by).filter(Boolean))
    ) as string[];

    const { data: profiles } = uploaderIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', uploaderIds)
      : { data: [] };

    const namesById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

    const buyerEvidence = (evidence ?? [])
      .filter((row) => row.uploaded_by === dispute.buyer_id)
      .map((row) => ({
        ...row,
        uploaded_by_name: formatProfileDisplayName({ full_name: namesById.get(row.uploaded_by || '') }),
        side: 'buyer' as const,
      }));

    const builderEvidence = (evidence ?? [])
      .filter((row) => row.uploaded_by === dispute.freelancer_id)
      .map((row) => ({
        ...row,
        uploaded_by_name: formatProfileDisplayName({ full_name: namesById.get(row.uploaded_by || '') }),
        side: 'builder' as const,
      }));

    const otherEvidence = (evidence ?? [])
      .filter(
        (row) => row.uploaded_by !== dispute.buyer_id && row.uploaded_by !== dispute.freelancer_id
      )
      .map((row) => ({
        ...row,
        uploaded_by_name: formatProfileDisplayName({ full_name: namesById.get(row.uploaded_by || '') }),
        side: 'other' as const,
      }));

    return NextResponse.json({
      buyerEvidence,
      builderEvidence,
      otherEvidence,
    });
  } catch (error: unknown) {
    console.error('Founder dispute evidence error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
