import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpenProject, OpenProjectProposal } from './types';

export async function canViewProject(
  supabase: SupabaseClient,
  project: OpenProject,
  userId: string | null
): Promise<boolean> {
  if (project.deleted_at) return false;
  if (project.status === 'published') return true;
  if (!userId) return false;
  if (project.buyer_id === userId) return true;
  if (project.hired_builder_id === userId) return true;
  return false;
}

export async function canEditProject(project: OpenProject, userId: string): Promise<boolean> {
  return project.buyer_id === userId && !project.deleted_at && project.status !== 'hired';
}

export async function canSubmitProposal(
  supabase: SupabaseClient,
  project: OpenProject,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (project.deleted_at) return { allowed: false, reason: 'Project no longer available' };
  if (project.status !== 'published') return { allowed: false, reason: 'Project is not accepting proposals' };
  if (project.buyer_id === userId) return { allowed: false, reason: 'You cannot propose on your own project' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_freelancer, is_verified')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.is_freelancer) {
    return { allowed: false, reason: 'Only verified AI experts can submit proposals' };
  }

  const prefs = project.builder_preferences ?? {};
  if (prefs.verified_only && !profile.is_verified) {
    return { allowed: false, reason: 'This project requires verified experts only' };
  }

  const { count } = await supabase
    .from('project_proposals')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .eq('builder_id', userId)
    .is('deleted_at', null);

  if ((count ?? 0) > 0) {
    return { allowed: false, reason: 'You have already submitted a proposal for this project' };
  }

  return { allowed: true };
}

export function canViewProposal(
  proposal: OpenProjectProposal,
  project: OpenProject,
  userId: string
): boolean {
  if (proposal.deleted_at) return false;
  if (proposal.builder_id === userId) return true;
  if (project.buyer_id === userId) return true;
  return false;
}

export function canHireProposal(project: OpenProject, userId: string): boolean {
  return (
    project.buyer_id === userId &&
    project.status === 'published' &&
    !project.deleted_at &&
    !project.hired_proposal_id
  );
}
