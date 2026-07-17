import type { ProposalMilestone } from '@/lib/project-proposals/types';
export { PROJECT_CATEGORIES } from './categories';
export type { ProjectCategory } from './categories';

export type ProjectStatus = 'draft' | 'published' | 'closed' | 'hired' | 'cancelled';
export type ProjectVisibility = 'public' | 'invite_only' | 'private';
export type BudgetType = 'fixed' | 'hourly' | 'open';
export type ExperienceLevel = 'entry' | 'intermediate' | 'expert';
export type ProjectType = 'one_time' | 'ongoing';
export type ProposalStatus = 'draft' | 'submitted' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';

export type BuilderPreferences = {
  verified_only?: boolean;
  custom_category?: string;
  min_rating?: number;
  preferred_skills?: string[];
  timezone_preference?: string;
  languages?: string[];
};

export type OpenProject = {
  id: string;
  buyer_id: string;
  title: string;
  description: string;
  category: string | null;
  budget_min_usd: number | null;
  budget_max_usd: number | null;
  budget_type: BudgetType;
  payment_type: 'single_payment' | 'milestone_payment';
  expected_duration_days: number | null;
  deadline: string | null;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  experience_level: ExperienceLevel;
  project_type: ProjectType;
  builder_preferences: BuilderPreferences;
  is_featured: boolean;
  proposal_count: number;
  view_count: number;
  hired_builder_id: string | null;
  hired_proposal_id: string | null;
  collab_id: string | null;
  project_request_id: string | null;
  published_at: string | null;
  closed_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectAttachment = {
  id: string;
  project_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
};

export type OpenProjectProposal = {
  id: string;
  project_id: string;
  builder_id: string;
  cover_letter: string;
  proposed_amount_usd: number;
  proposed_duration_days: number | null;
  payment_type: 'single_payment' | 'milestone_payment';
  proposed_milestones: ProposalMilestone[];
  status: ProposalStatus;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateProjectInput = {
  title: string;
  description: string;
  category?: string | null;
  budget_min_usd?: number | null;
  budget_max_usd?: number | null;
  budget_type?: BudgetType;
  payment_type?: 'single_payment' | 'milestone_payment';
  expected_duration_days?: number | null;
  deadline?: string | null;
  visibility?: ProjectVisibility;
  experience_level?: ExperienceLevel;
  project_type?: ProjectType;
  builder_preferences?: BuilderPreferences;
  skills?: string[];
  attachments?: Array<{ file_url: string; file_name: string; file_type?: string }>;
  status?: 'draft' | 'published';
};

export type CreateProposalInput = {
  project_id: string;
  cover_letter: string;
  proposed_amount_usd: number;
  proposed_duration_days?: number | null;
  payment_type?: 'single_payment' | 'milestone_payment';
  proposed_milestones?: ProposalMilestone[];
  attachments?: Array<{ file_url: string; file_name: string; file_type?: string }>;
  status?: 'draft' | 'submitted';
};

export type BrowseProjectsFilters = {
  q?: string;
  category?: string;
  budget_min?: number;
  budget_max?: number;
  experience_level?: ExperienceLevel;
  skills?: string[];
  sort?: 'newest' | 'budget_high' | 'budget_low' | 'proposals';
  limit?: number;
  offset?: number;
};

export const PROJECT_WIZARD_STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Budget' },
  { id: 3, label: 'Builder Preferences' },
  { id: 4, label: 'Review' },
] as const;

export const PROPOSAL_ATTACHMENT_ACCEPT =
  '.pdf,.doc,.docx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.mp4';

export type ProposalExtras = {
  _kind: 'proposal_extras';
  highlighted_portfolio_project_id?: string;
  highlighted_work_ids?: string[];
};

export function buildProposalExtrasPayload(extras: {
  highlighted_portfolio_project_id?: string | null;
  highlighted_work_ids?: string[];
}): ProposalExtras[] {
  const hasPortfolio = Boolean(extras.highlighted_portfolio_project_id);
  const hasWork = (extras.highlighted_work_ids?.length ?? 0) > 0;
  if (!hasPortfolio && !hasWork) return [];

  const payload: ProposalExtras = { _kind: 'proposal_extras' };
  if (hasPortfolio && extras.highlighted_portfolio_project_id) {
    payload.highlighted_portfolio_project_id = extras.highlighted_portfolio_project_id;
  }
  if (hasWork && extras.highlighted_work_ids) {
    payload.highlighted_work_ids = extras.highlighted_work_ids;
  }
  return [payload];
}

export const PROPOSAL_WIZARD_STEPS = [
  { id: 1, label: 'Approach' },
  { id: 2, label: 'Pricing' },
  { id: 3, label: 'Highlights' },
  { id: 4, label: 'Review' },
] as const;
