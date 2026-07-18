import type { SupabaseClient } from '@supabase/supabase-js';
import { formatDisplayName } from '@/lib/display/formatDisplayName';
import { logBusinessEvent } from '@/lib/events/businessEvents';
import { sendNotification } from '@/lib/notifications/notificationService';
import { NotificationType } from '@/lib/notifications/types';
import type {
  BrowseProjectsFilters,
  CreateProjectInput,
  CreateProposalInput,
  OpenProject,
} from './types';
import {
  checkBuilderProposalLimits,
  incrementBuilderDailyCounter,
  logMarketplaceAudit,
} from './limits';
import { checkDuplicateProjects } from './duplicateDetection';
import { ACTIVE_BUYER_PROJECT_STATUSES } from './constants';
import { runProjectModeration, queueProposalModeration } from '@/lib/moderation';
import type { ProjectModerationOutcome } from '@/lib/moderation/types';
import {
  recordHiringActivity,
  startProjectMonitoring,
  canViewProject,
  isProjectPubliclyVisible,
} from './activityMonitoring';
import { checkBuyerPublishingLimits } from './buyerRestrictions';
import {
  ensureNonEmptyFeatured,
  rankBrowseProjects,
  rankFeaturedProjects,
} from './ranking';
import { getBuyerPublicStats } from './verifiedBuyer';

const PROJECT_SELECT = `
  *,
  skills:project_skills(skill),
  attachments:project_attachments(id, file_url, file_name, file_type),
  buyer:profiles_public!buyer_id(id, full_name, avatar_url, created_at, location, verified_buyer)
`;

const PUBLIC_PROJECT_SELECT = `
  *,
  skills:project_skills(skill),
  attachments:project_attachments(id, file_url, file_name, file_type),
  buyer:profiles_public!buyer_id(id, full_name, avatar_url, created_at, location, verified_buyer)
`;

type PublicBuyerInfo = {
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  location?: string | null;
  verified_buyer?: boolean | null;
  total_jobs_posted?: number;
  total_spent_usd?: number;
};

export function sanitizeProjectForPublicView<
  T extends { buyer_id?: string; buyer?: PublicBuyerInfo | null },
>(project: T, viewerId?: string | null): T {
  if (viewerId && project.buyer_id === viewerId) {
    return project;
  }
  const buyer = project.buyer;
  const publicBuyer: PublicBuyerInfo | null = buyer
    ? {
        full_name: buyer.full_name ? formatDisplayName(buyer.full_name) : null,
        avatar_url: buyer.avatar_url ?? null,
        created_at: buyer.created_at ?? null,
        location: buyer.location ?? null,
        verified_buyer: buyer.verified_buyer ?? false,
        total_jobs_posted: buyer.total_jobs_posted,
        total_spent_usd: buyer.total_spent_usd,
      }
    : null;
  return { ...project, buyer: publicBuyer };
}

export async function createProject(
  supabase: SupabaseClient,
  buyerId: string,
  input: CreateProjectInput
): Promise<OpenProject> {
  const isPublishing = input.status === 'published';

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      buyer_id: buyerId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category ?? null,
      budget_min_usd: input.budget_min_usd ?? null,
      budget_max_usd: input.budget_max_usd ?? null,
      budget_type: input.budget_type ?? 'fixed',
      payment_type: input.payment_type ?? 'single_payment',
      expected_duration_days: input.expected_duration_days ?? null,
      deadline: input.deadline ?? null,
      visibility: input.visibility ?? 'public',
      experience_level: input.experience_level ?? 'intermediate',
      project_type: input.project_type ?? 'one_time',
      builder_preferences: input.builder_preferences ?? {},
      status: input.status ?? 'draft',
      published_at: isPublishing ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw error;

  if (input.skills?.length) {
    await supabase.from('project_skills').insert(
      input.skills.map((skill) => ({ project_id: project.id, skill: skill.trim() }))
    );
  }

  if (input.attachments?.length) {
    await supabase.from('project_attachments').insert(
      input.attachments.map((a) => ({
        project_id: project.id,
        file_url: a.file_url,
        file_name: a.file_name,
        file_type: a.file_type ?? null,
      }))
    );
  }

    if (isPublishing) {
    void logBusinessEvent({
      eventType: 'open_project_published',
      entityType: 'open_project',
      entityId: project.id,
      actorId: buyerId,
      summary: `Published open project "${input.title}"`,
    });

    await startProjectMonitoring(supabase, project.id, buyerId);

    await runProjectModeration({
      projectId: project.id,
      buyerId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      budgetMin: input.budget_min_usd,
      budgetMax: input.budget_max_usd,
    });
  }

  return project as OpenProject;
}

export async function updateProject(
  supabase: SupabaseClient,
  projectId: string,
  buyerId: string,
  input: Partial<CreateProjectInput>
): Promise<OpenProject> {
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.category !== undefined) updates.category = input.category;
  if (input.budget_min_usd !== undefined) updates.budget_min_usd = input.budget_min_usd;
  if (input.budget_max_usd !== undefined) updates.budget_max_usd = input.budget_max_usd;
  if (input.budget_type !== undefined) updates.budget_type = input.budget_type;
  if (input.payment_type !== undefined) updates.payment_type = input.payment_type;
  if (input.expected_duration_days !== undefined) updates.expected_duration_days = input.expected_duration_days;
  if (input.deadline !== undefined) updates.deadline = input.deadline;
  if (input.visibility !== undefined) updates.visibility = input.visibility;
  if (input.experience_level !== undefined) updates.experience_level = input.experience_level;
  if (input.project_type !== undefined) updates.project_type = input.project_type;
  if (input.builder_preferences !== undefined) updates.builder_preferences = input.builder_preferences;

  const { data: project, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .eq('buyer_id', buyerId)
    .select()
    .single();

  if (error) throw error;

  if (input.skills) {
    await supabase.from('project_skills').delete().eq('project_id', projectId);
    if (input.skills.length) {
      await supabase.from('project_skills').insert(
        input.skills.map((skill) => ({ project_id: projectId, skill: skill.trim() }))
      );
    }
  }

  if (input.attachments) {
    await supabase.from('project_attachments').delete().eq('project_id', projectId);
    if (input.attachments.length) {
      await supabase.from('project_attachments').insert(
        input.attachments.map((a) => ({
          project_id: projectId,
          file_url: a.file_url,
          file_name: a.file_name,
          file_type: a.file_type ?? null,
        }))
      );
    }
  }

  return project as OpenProject;
}

export async function publishProject(
  supabase: SupabaseClient,
  projectId: string,
  buyerId: string,
  options: { acknowledgeDuplicate?: boolean } = {}
): Promise<{ project: OpenProject; moderation: ProjectModerationOutcome }> {
  const existing = await getProjectById(supabase, projectId);
  if (!existing || existing.buyer_id !== buyerId) {
    throw new Error('Project not found');
  }

  const buyerLimits = await checkBuyerPublishingLimits(supabase, buyerId, projectId);
  if (!buyerLimits.canPublish) {
    throw new Error(buyerLimits.reason ?? 'Publishing limit reached');
  }

  const duplicateCheck = await checkProjectDuplicates(supabase, buyerId, {
    title: existing.title,
    description: existing.description,
    budget_min_usd: existing.budget_min_usd,
    budget_max_usd: existing.budget_max_usd,
    skills: existing.skills?.map((s: { skill: string }) => s.skill) ?? [],
    excludeProjectId: projectId,
  });

  if (duplicateCheck.isDuplicate && !options.acknowledgeDuplicate) {
    throw new Error(duplicateCheck.warning ?? 'Duplicate project detected');
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      duplicate_warning_acknowledged_at: duplicateCheck.isDuplicate
        ? new Date().toISOString()
        : existing.duplicate_warning_acknowledged_at ?? null,
    })
    .eq('id', projectId)
    .eq('buyer_id', buyerId)
    .eq('status', 'draft')
    .select()
    .single();

  if (error) throw error;

  await startProjectMonitoring(supabase, projectId, buyerId);

  void logBusinessEvent({
    eventType: 'open_project_published',
    entityType: 'open_project',
    entityId: projectId,
    actorId: buyerId,
    summary: `Published open project "${project.title}"`,
  });

  await logMarketplaceAudit(supabase, {
    entity_type: 'project',
    entity_id: projectId,
    action: 'published',
    actor_id: buyerId,
    metadata: { duplicate_acknowledged: Boolean(options.acknowledgeDuplicate) },
  });

  const moderation = await runProjectModeration({
    projectId,
    buyerId,
    title: project.title,
    description: project.description ?? '',
    category: project.category,
    budgetMin: project.budget_min_usd,
    budgetMax: project.budget_max_usd,
  });

  const { data: refreshed } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', projectId)
    .maybeSingle();

  return {
    project: (refreshed ?? project) as OpenProject,
    moderation,
  };
}

export async function closeProject(
  supabase: SupabaseClient,
  projectId: string,
  buyerId: string
): Promise<OpenProject> {
  const { data: project, error } = await supabase
    .from('projects')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('buyer_id', buyerId)
    .in('status', ['published', 'draft'])
    .select()
    .single();

  if (error) throw error;
  return project as OpenProject;
}

export async function reopenProject(
  supabase: SupabaseClient,
  projectId: string,
  buyerId: string
): Promise<OpenProject> {
  const limits = await checkBuyerPublishingLimits(supabase, buyerId, projectId);
  if (!limits.canPublish) {
    throw new Error(limits.reason ?? 'Publishing limit reached');
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update({
      status: 'published',
      closed_at: null,
      published_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('buyer_id', buyerId)
    .eq('status', 'closed')
    .select()
    .single();

  if (error) throw error;

  await startProjectMonitoring(supabase, projectId, buyerId);
  return project as OpenProject;
}

export async function browseProjects(
  supabase: SupabaseClient,
  filters: BrowseProjectsFilters = {},
  viewerId?: string | null
) {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  const useRanking = !filters.sort || filters.sort === 'newest';

  let query = supabase
    .from('projects')
    .select(PUBLIC_PROJECT_SELECT, { count: 'exact' })
    .in('status', ['published', 'receiving_proposals', 'negotiating'])
    .eq('moderation_status', 'approved')
    .is('deleted_at', null);

  if (filters.q) {
    query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  }
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.experience_level) query = query.eq('experience_level', filters.experience_level);
  if (filters.budget_min != null) query = query.gte('budget_max_usd', filters.budget_min);
  if (filters.budget_max != null) query = query.lte('budget_min_usd', filters.budget_max);

  if (!useRanking) {
    switch (filters.sort) {
      case 'budget_high':
        query = query.order('budget_max_usd', { ascending: false, nullsFirst: false });
        break;
      case 'budget_low':
        query = query.order('budget_min_usd', { ascending: true, nullsFirst: false });
        break;
      case 'proposals':
        query = query.order('proposal_count', { ascending: false });
        break;
      default:
        query = query.order('published_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    return {
      projects: (data ?? []).map((project) => sanitizeProjectForPublicView(project, viewerId)),
      total: count ?? 0,
    };
  }

  const fetchLimit = Math.max(limit + offset, 60);
  query = query.order('published_at', { ascending: false }).limit(fetchLimit);
  const { data, error, count } = await query;
  if (error) throw error;

  const ranked = rankBrowseProjects(data ?? [], fetchLimit);
  const page = ranked.slice(offset, offset + limit);
  return {
    projects: page.map((project) => sanitizeProjectForPublicView(project, viewerId)),
    total: count ?? ranked.length,
  };
}

export async function getFeaturedProjects(
  supabase: SupabaseClient,
  limit = 3,
  viewerId?: string | null
) {
  const fetchLimit = Math.max(limit * 8, 24);
  const { data, error } = await supabase
    .from('projects')
    .select(PUBLIC_PROJECT_SELECT)
    .in('status', ['published', 'receiving_proposals', 'negotiating'])
    .eq('moderation_status', 'approved')
    .is('deleted_at', null)
    .order('published_at', { ascending: false })
    .limit(fetchLimit);

  if (error) throw error;

  const pool = data ?? [];
  const ranked = rankFeaturedProjects(pool, limit);
  return ensureNonEmptyFeatured(ranked, pool, limit).map((project) =>
    sanitizeProjectForPublicView(project, viewerId)
  );
}

export async function getProjectById(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getProjectByIdForViewer(
  supabase: SupabaseClient,
  projectId: string,
  viewerId?: string | null
) {
  const project = await getProjectById(supabase, projectId);
  if (!project) return null;

  const canView = await canViewProject(supabase, project, viewerId);
  if (!canView) return null;

  if (
    project.buyer_id &&
    (isProjectPubliclyVisible(project.status) || viewerId === project.buyer_id)
  ) {
    const { createSupabaseAdminClient } = await import('@/lib/server/supabase');
    const admin = createSupabaseAdminClient();
    const stats = await getBuyerPublicStats(admin, project.buyer_id);
    project.buyer = {
      ...(project.buyer ?? {}),
      full_name: stats.fullName ?? project.buyer?.full_name,
      created_at: stats.memberSince ?? project.buyer?.created_at,
      location: stats.country ?? project.buyer?.location,
      verified_buyer: stats.verifiedBuyer,
      total_jobs_posted: stats.totalJobsPosted,
      total_spent_usd: stats.totalSpentUsd,
      response_rate_percent: stats.responseRatePercent,
      average_first_response_label: stats.averageFirstResponseLabel,
    };
  }

  return project;
}

export async function incrementProjectViews(
  supabaseAdmin: SupabaseClient,
  projectId: string,
  actorId?: string
) {
  const { data } = await supabaseAdmin.from('projects').select('view_count').eq('id', projectId).single();
  if (data) {
    await supabaseAdmin.from('projects').update({ view_count: (data.view_count ?? 0) + 1 }).eq('id', projectId);
  }

  await supabaseAdmin.from('project_analytics').insert({
    project_id: projectId,
    event_type: 'view',
    actor_id: actorId ?? null,
  });
}

export async function createProposal(
  supabase: SupabaseClient,
  builderId: string,
  input: CreateProposalInput
) {
  const { data: project } = await supabase
    .from('projects')
    .select('id, buyer_id, title, status')
    .eq('id', input.project_id)
    .single();

  if (!project || project.status !== 'published') {
    throw new Error('Project is not accepting proposals');
  }

  const limits = await checkBuilderProposalLimits(supabase, builderId);
  if (!limits.canSubmit) {
    throw new Error(limits.reason ?? 'Proposal limit reached');
  }

  const { data: proposal, error } = await supabase
    .from('project_proposals')
    .insert({
      project_id: input.project_id,
      builder_id: builderId,
      cover_letter: input.cover_letter.trim(),
      proposed_amount_usd: input.proposed_amount_usd,
      proposed_duration_days: input.proposed_duration_days ?? null,
      payment_type: input.payment_type ?? 'single_payment',
      proposed_milestones: input.proposed_milestones ?? [],
      status: input.status ?? 'submitted',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('You have already submitted a proposal for this project');
    throw error;
  }

  if (input.attachments?.length) {
    await supabase.from('proposal_attachments').insert(
      input.attachments.map((a) => ({
        proposal_id: proposal.id,
        file_url: a.file_url,
        file_name: a.file_name,
        file_type: a.file_type ?? null,
      }))
    );
  }

  if (proposal.status === 'submitted') {
    await incrementBuilderDailyCounter(supabase, builderId, 'proposals_submitted');

    await supabase.from('proposal_status_history').insert({
      proposal_id: proposal.id,
      old_status: null,
      new_status: 'submitted',
      changed_by: builderId,
    });

    void sendNotification({
      type: NotificationType.OPEN_PROJECT_PROPOSAL,
      recipientId: project.buyer_id,
      title: 'New proposal received',
      message: `A builder submitted a proposal for "${project.title}".`,
      link: `/buyer/open-projects/${project.id}/proposals`,
      metadata: { projectId: project.id, proposalId: proposal.id, dashboardPath: '/buyer/open-projects' },
    });

    void logBusinessEvent({
      eventType: 'open_project_proposal_submitted',
      entityType: 'open_project_proposal',
      entityId: proposal.id,
      actorId: builderId,
      summary: `Proposal submitted for project "${project.title}"`,
      metadata: { project_id: project.id, amount: input.proposed_amount_usd },
    });

    queueProposalModeration({
      proposalId: proposal.id,
      builderId,
      coverLetter: input.cover_letter.trim(),
      proposedAmountUsd: input.proposed_amount_usd,
      projectTitle: project.title,
    });
  }

  return proposal;
}

export async function listProjectProposals(
  supabase: SupabaseClient,
  projectId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  const { data, error, count } = await supabase
    .from('project_proposals')
    .select(
      `
      *,
      builder:profiles_public!builder_id(id, full_name, avatar_url, headline, average_rating, is_verified),
      attachments:proposal_attachments(id, file_url, file_name, file_type)
    `,
      { count: 'exact' }
    )
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { proposals: data ?? [], total: count ?? 0 };
}

export async function listBuilderProposals(supabase: SupabaseClient, builderId: string) {
  const { data, error } = await supabase
    .from('project_proposals')
    .select(`
      *,
      project:projects(id, title, status, budget_min_usd, budget_max_usd, buyer_id,
        buyer:profiles_public!buyer_id(full_name, avatar_url))
    `)
    .eq('builder_id', builderId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateProposalStatus(
  supabase: SupabaseClient,
  proposalId: string,
  newStatus: string,
  changedBy: string,
  note?: string
) {
  const { data: existing } = await supabase
    .from('project_proposals')
    .select('status, builder_id, project_id, project:projects(buyer_id, status)')
    .eq('id', proposalId)
    .single();

  if (!existing) throw new Error('Proposal not found');

  const { data: proposal, error } = await supabase
    .from('project_proposals')
    .update({ status: newStatus })
    .eq('id', proposalId)
    .select()
    .single();

  if (error) throw error;

  await supabase.from('proposal_status_history').insert({
    proposal_id: proposalId,
    old_status: existing.status,
    new_status: newStatus,
    changed_by: changedBy,
    note: note ?? null,
  });

  const project = existing.project as { buyer_id?: string; status?: string } | null;
  if (project?.buyer_id === changedBy && project.status && isProjectPubliclyVisible(project.status)) {
    if (newStatus === 'shortlisted') {
      await recordHiringActivity(supabase, {
        projectId: existing.project_id,
        buyerId: project.buyer_id,
        actionType: 'shortlist_proposal',
        actorId: changedBy,
        targetId: proposalId,
      });
    } else if (newStatus === 'negotiating') {
      await recordHiringActivity(supabase, {
        projectId: existing.project_id,
        buyerId: project.buyer_id,
        actionType: 'start_negotiation',
        actorId: changedBy,
        targetId: proposalId,
      });
    }
  }

  return proposal;
}

export async function toggleSavedProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
) {
  const { data: existing } = await supabase
    .from('saved_projects')
    .select('project_id')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (existing) {
    await supabase.from('saved_projects').delete().eq('user_id', userId).eq('project_id', projectId);
    return { saved: false };
  }

  await supabase.from('saved_projects').insert({ user_id: userId, project_id: projectId });
  return { saved: true };
}

export async function listSavedProjects(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('saved_projects')
    .select(`
      created_at,
      project:projects(
        id, title, description, category, budget_min_usd, budget_max_usd,
        proposal_count, experience_level, published_at, is_featured, status,
        skills:project_skills(skill)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listBuyerProjects(
  supabase: SupabaseClient,
  buyerId: string,
  options: { limit?: number; offset?: number; status?: string } = {}
) {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  let query = supabase
    .from('projects')
    .select(PROJECT_SELECT, { count: 'exact' })
    .eq('buyer_id', buyerId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { projects: data ?? [], total: count ?? 0 };
}

export async function getProjectActivity(
  supabase: SupabaseClient,
  projectId: string,
  buyerId: string
) {
  const { data: project } = await supabase
    .from('projects')
    .select('id, title, status, created_at, published_at, closed_at, hired_proposal_id, buyer_id')
    .eq('id', projectId)
    .eq('buyer_id', buyerId)
    .maybeSingle();

  if (!project) return [];

  const events: Array<{ id: string; type: string; label: string; date: string; detail?: string }> = [];

  events.push({
    id: 'created',
    type: 'posted',
    label: 'Project created',
    date: project.created_at,
  });

  if (project.published_at) {
    events.push({
      id: 'published',
      type: 'published',
      label: 'Project published',
      date: project.published_at,
    });
  }

  const { data: proposals } = await supabase
    .from('project_proposals')
    .select('id, status, created_at, builder:profiles_public!builder_id(full_name)')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .neq('status', 'draft')
    .order('created_at', { ascending: true });

  for (const p of proposals ?? []) {
    const builder = p.builder as { full_name?: string } | null;
    events.push({
      id: `proposal-${p.id}`,
      type: 'proposal',
      label: 'Proposal received',
      date: p.created_at,
      detail: builder?.full_name ?? undefined,
    });
    if (p.status === 'accepted') {
      events.push({
        id: `accepted-${p.id}`,
        type: 'accepted',
        label: 'Builder hired',
        date: p.created_at,
        detail: builder?.full_name ?? undefined,
      });
    }
  }

  if (project.closed_at) {
    events.push({
      id: 'closed',
      type: 'closed',
      label: project.status === 'hired' ? 'Project closed (hired)' : 'Project closed',
      date: project.closed_at,
    });
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function softDeleteProject(
  supabase: SupabaseClient,
  projectId: string,
  buyerId: string
) {
  const { data, error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
    .eq('id', projectId)
    .eq('buyer_id', buyerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSimilarProjects(
  supabase: SupabaseClient,
  projectId: string,
  category: string | null,
  limit = 3
) {
  if (!category) return [];

  const { data, error } = await supabase
    .from('projects')
    .select(PUBLIC_PROJECT_SELECT)
    .in('status', ['published', 'receiving_proposals', 'negotiating'])
    .eq('category', category)
    .neq('id', projectId)
    .is('deleted_at', null)
    .eq('moderation_status', 'approved')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function checkProjectDuplicates(
  supabase: SupabaseClient,
  buyerId: string,
  input: {
    title: string;
    description: string;
    budget_min_usd?: number | null;
    budget_max_usd?: number | null;
    skills?: string[];
    excludeProjectId?: string;
  }
) {
  let query = supabase
    .from('projects')
    .select(`
      id, title, description, status, budget_min_usd, budget_max_usd,
      skills:project_skills(skill)
    `)
    .eq('buyer_id', buyerId)
    .is('deleted_at', null)
    .in('status', [...ACTIVE_BUYER_PROJECT_STATUSES, 'closed', 'hired']);

  if (input.excludeProjectId) {
    query = query.neq('id', input.excludeProjectId);
  }

  const { data } = await query;
  return checkDuplicateProjects(input, data ?? []);
}

export async function getBuilderProposalEligibility(
  supabase: SupabaseClient,
  project: OpenProject,
  userId: string | null
) {
  if (!userId) {
    return { canSubmit: true, requiresAuth: true, reason: undefined, limits: null };
  }

  if (project.buyer_id === userId) {
    return {
      canSubmit: false,
      requiresAuth: false,
      reason: 'You cannot propose on your own project',
      limits: null,
    };
  }

  if (project.status !== 'published' && project.status !== 'receiving_proposals' && project.status !== 'negotiating') {
    return {
      canSubmit: false,
      requiresAuth: false,
      reason: 'This project is not accepting proposals',
      limits: null,
    };
  }

  const { canSubmitProposal } = await import('./permissions');
  const permission = await canSubmitProposal(supabase, project, userId);
  const limits = await checkBuilderProposalLimits(supabase, userId);

  return {
    canSubmit: permission.allowed,
    requiresAuth: false,
    reason: permission.reason,
    limits,
    hasExistingProposal: permission.reason?.includes('already submitted') ?? false,
  };
}
