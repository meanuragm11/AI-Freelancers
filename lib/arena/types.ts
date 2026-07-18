/** Arena event types for badge eligibility tracking */



export type ArenaEventType =

  | 'profile_updated'

  | 'solution_published'

  | 'project_completed'

  | 'review_received'

  | 'profile_shared'

  | 'referral'

  | 'profile_view'

  | 'login'

  | 'revenue_milestone';



export type ArenaMilestoneKey =

  | 'first_solution'

  | 'first_review'

  | 'first_project'

  | 'profile_complete'

  | 'revenue_100'

  | 'revenue_1000'

  | 'verified_builder';



/** Internal pillar identifiers — used for signal gathering only */

export type ArenaPillarId = 'trust' | 'expertise' | 'activity' | 'community' | 'growth';

