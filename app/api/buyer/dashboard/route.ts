import { NextResponse } from 'next/server';
import { formatBuilderName } from '@/lib/display/formatBuilderName';
import { createSupabaseAdminClient, getAuthenticatedUser } from '@/lib/server/supabase';
import {
  ACTIVE_COLLAB_STATUSES,
  COMPLETED_COLLAB_STATUSES,
  LOCKED_MILESTONE_STATUSES,
  UPCOMING_MILESTONE_STATUSES,
  mapProjectStatus,
} from '@/lib/marketplace/status';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createSupabaseAdminClient();
    const [profileRes, collabsRes, purchasesRes, savedRes, txRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabaseAdmin
        .from('collabs')
        .select('*, profiles_public!builder_id(full_name, avatar_url, headline), service:services!service_id(id, title, cover_image_url)')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin.from('library').select('id').eq('user_id', user.id),
      supabaseAdmin.from('saved_experts').select('*', { count: 'exact', head: true }).eq('buyer_id', user.id),
      supabaseAdmin
        .from('transactions')
        .select('amount_usd, transaction_type, status')
        .eq('buyer_id', user.id)
        .in('status', ['completed', 'paid', 'captured']),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (collabsRes.error) throw collabsRes.error;
    if (purchasesRes.error) throw purchasesRes.error;
    if (savedRes.error) throw savedRes.error;
    if (txRes.error) throw txRes.error;

    const collabs = collabsRes.data ?? [];
    const collabIds = collabs.map((collab) => collab.id);
    const activeCollabs = collabs.filter((collab) =>
      (ACTIVE_COLLAB_STATUSES as readonly string[]).includes((collab.status || '').toLowerCase())
    );
    const activeCollabIds = activeCollabs.map((collab) => collab.id);

    const [milestonesRes, messagesRes] = activeCollabIds.length
      ? await Promise.all([
          supabaseAdmin
            .from('milestones')
            .select('id, collab_id, title, status, amount_usd, due_date, created_at')
            .in('collab_id', activeCollabIds)
            .order('created_at', { ascending: false }),
          supabaseAdmin
            .from('messages')
            .select('collab_id, created_at')
            .in('collab_id', activeCollabIds)
            .order('created_at', { ascending: false }),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

    if (milestonesRes.error) throw milestonesRes.error;
    if (messagesRes.error) throw messagesRes.error;

    type DashboardMilestone = {
      id: string;
      collab_id: string;
      title?: string | null;
      status?: string | null;
      amount_usd?: number | string | null;
      due_date?: string | null;
      created_at?: string | null;
    };

    const milestonesByCollab = new Map<string, DashboardMilestone[]>();
    for (const milestone of milestonesRes.data ?? []) {
      const current = milestonesByCollab.get(milestone.collab_id) || [];
      current.push(milestone);
      milestonesByCollab.set(milestone.collab_id, current);
    }

    const lastMessageByCollab = new Map<string, string>();
    for (const message of messagesRes.data ?? []) {
      if (!lastMessageByCollab.has(message.collab_id)) {
        lastMessageByCollab.set(message.collab_id, message.created_at);
      }
    }

    const activeProjects = activeCollabs.length;

    const pendingMilestones = (milestonesRes.data ?? []).filter((milestone) =>
      (UPCOMING_MILESTONE_STATUSES as readonly string[]).includes((milestone.status || '').toLowerCase())
    ).length;

    const escrowBalance = (milestonesRes.data ?? []).reduce((sum, milestone) => {
      if (!(LOCKED_MILESTONE_STATUSES as readonly string[]).includes((milestone.status || '').toLowerCase())) return sum;
      return sum + Number(milestone.amount_usd || 0);
    }, 0);

    const totalSpent = (txRes.data ?? []).reduce((sum, tx) => sum + Number(tx.amount_usd || 0), 0);

    const services = activeCollabs.map((collab) => {
      const milestones = milestonesByCollab.get(collab.id) || [];
      const completed = milestones.filter((milestone) =>
        ['released', 'completed', 'approved'].includes((milestone.status || '').toLowerCase())
      ).length;
      const completionPercentage = milestones.length
        ? Math.round((completed / milestones.length) * 100)
        : Math.max(0, Math.min(100, Number(collab.completion_percentage || 0)));
      const escrowLocked = milestones.reduce((sum, milestone) => {
        if (!(LOCKED_MILESTONE_STATUSES as readonly string[]).includes((milestone.status || '').toLowerCase())) return sum;
        return sum + Number(milestone.amount_usd || 0);
      }, 0);
      const nextMilestone = milestones
        .filter((milestone): milestone is DashboardMilestone & { due_date: string } =>
          Boolean(milestone.due_date) &&
          (UPCOMING_MILESTONE_STATUSES as readonly string[]).includes((milestone.status || '').toLowerCase())
        )
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
      const latestMilestoneDate = milestones
        .map((milestone) => milestone.created_at)
        .filter((date): date is string => Boolean(date))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      const lastActivity = [lastMessageByCollab.get(collab.id), latestMilestoneDate, collab.created_at]
        .filter((date): date is string => Boolean(date))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

      return {
        id: collab.id,
        serviceId: collab.service_id || '',
        serviceTitle: collab.service?.title || collab.title || 'Purchased Service',
        serviceThumbnail: collab.service?.cover_image_url || null,
        freelancerName: formatBuilderName(collab.profiles?.full_name),
        freelancerAvatar: collab.profiles?.avatar_url || null,
        status: mapProjectStatus(collab.status),
        milestoneProgress: milestones.length ? `${completed}/${milestones.length} milestones` : `${completionPercentage}% complete`,
        escrowLocked,
        nextDueDate: nextMilestone?.due_date || null,
        lastActivity,
        completionPercentage,
      };
    });

    const recentActivity = collabIds.length
      ? collabs
          .map((collab) => ({
            id: `act_${collab.id}`,
            type: (COMPLETED_COLLAB_STATUSES as readonly string[]).includes((collab.status || '').toLowerCase())
              ? 'delivered'
              : collab.status === 'funded'
                ? 'funded'
                : 'started',
            title: collab.title,
            expert: formatBuilderName(collab.profiles?.full_name),
            amount: Number(collab.escrow_amount_usd || 0),
            date: collab.created_at,
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5)
      : [];

    return NextResponse.json({
      profile: profileRes.data,
      stats: {
        activeProjects,
        pendingMilestones,
        escrowBalance,
        totalSpent,
        purchasedAssets: purchasesRes.data?.length || 0,
        savedExperts: savedRes.count || 0,
      },
      services,
      recentActivity,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
