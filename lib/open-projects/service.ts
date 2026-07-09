import type { SupabaseClient } from '@supabase/supabase-js';
import { logBusinessEvent } from '@/lib/events/businessEvents';
import { sendNotification } from '@/lib/notifications/notificationService';
import { NotificationType } from '@/lib/notifications/types';
import type {
  BrowseProjectsFilters,
  CreateProjectInput,
  CreateProposalInput,
  OpenProject,
} from './types';

const PROJECT_SELECT = `
  *,
  skills:project_skills(skill),
  attachments:project_attachments(id, file_url, file_name, file_type),
  buyer:profiles_public!buyer_id(id, full_name, avatar_url)
`;

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
  buyerId: string
): Promise<OpenProject> {
  const { data: project, error } = await supabase
    .from('projects')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('buyer_id', buyerId)
    .eq('status', 'draft')
    .select()
    .single();

  if (error) throw error;

  void logBusinessEvent({
    eventType: 'open_project_published',
    entityType: 'open_project',
    entityId: projectId,
    actorId: buyerId,
    summary: `Published open project "${project.title}"`,
  });

  return project as OpenProject;
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

export async function browseProjects(
  supabase: SupabaseClient,
  filters: BrowseProjectsFilters = {}
) {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  let query = supabase
    .from('projects')
    .select(PROJECT_SELECT, { count: 'exact' })
    .eq('status', 'published')
    .is('deleted_at', null);

  if (filters.q) {
    query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  }
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.experience_level) query = query.eq('experience_level', filters.experience_level);
  if (filters.budget_min != null) query = query.gte('budget_max_usd', filters.budget_min);
  if (filters.budget_max != null) query = query.lte('budget_min_usd', filters.budget_max);

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
  return { projects: data ?? [], total: count ?? 0 };
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
  }

  return proposal;
}

export async function listProjectProposals(
  supabase: SupabaseClient,
  projectId: string
) {
  const { data, error } = await supabase
    .from('project_proposals')
    .select(`
      *,
      builder:profiles_public!builder_id(id, full_name, avatar_url, headline, average_rating, is_verified),
      attachments:proposal_attachments(id, file_url, file_name, file_type)
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
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
    .select('status, builder_id, project_id')
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

export async function askProjectQuestion(
  supabase: SupabaseClient,
  projectId: string,
  askerId: string,
  question: string
) {
  const { data, error } = await supabase
    .from('project_questions')
    .insert({ project_id: projectId, asker_id: askerId, question: question.trim() })
    .select()
    .single();

  if (error) throw error;

  const { data: project } = await supabase
    .from('projects')
    .select('buyer_id, title')
    .eq('id', projectId)
    .single();

  if (project) {
    void sendNotification({
      type: NotificationType.OPEN_PROJECT_QUESTION,
      recipientId: project.buyer_id,
      title: 'New question on your project',
      message: `Someone asked a question about "${project.title}".`,
      link: `/buyer/open-projects/${projectId}`,
      metadata: { projectId, dashboardPath: '/buyer/open-projects' },
    });
  }

  return data;
}

export async function answerProjectQuestion(
  supabase: SupabaseClient,
  questionId: string,
  buyerId: string,
  answer: string
) {
  const { data, error } = await supabase
    .from('project_questions')
    .update({ answer: answer.trim(), answered_at: new Date().toISOString() })
    .eq('id', questionId)
    .select('*, project:projects!inner(buyer_id)')
    .single();

  if (error) throw error;
  if ((data as { project: { buyer_id: string } }).project.buyer_id !== buyerId) {
    throw new Error('Forbidden');
  }
  return data;
}

export async function listBuyerProjects(supabase: SupabaseClient, buyerId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('buyer_id', buyerId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
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
