export interface ExpertProfile {
  id: string;

  full_name: string;

  headline: string;

  bio: string;

  location: string | null;

  avatar_url: string | null;

  banner_url: string | null;

  tech_stack: string[];

  base_price_usd: number;

  is_verified: boolean;

  reputation_score: number;

  external_projects: any[];

  created_at: string;
}

export interface ProjectMilestone {
  id?: string;

  title: string;

  description: string;

  amount_usd: number;

  milestone_order: number;

  due_date?: string;

  status?:
    | "draft"
    | "funded"
    | "submitted"
    | "approved"
    | "released";
}

export interface CollabProject {
  id: string;

  buyer_id: string;

  builder_id: string;

  title: string;

  project_description: string;

  fixed_price_usd: number;

  project_deadline: string;

  completion_percentage: number;

  current_milestone: number;

  status: string;

  created_at: string;
}

export interface Review {
  id: string;

  rating: number;

  review: string;

  buyer_id: string;

  builder_id: string;

  created_at: string;
}

export interface Invoice {
  id: string;

  gross_amount_usd: number;

  platform_fee_usd: number;

  net_payout_usd: number;

  status: string;
}

export interface WorkDiaryEntry {
  id: string;

  segment_start: string;

  segment_end: string;

  screenshot_url: string | null;

  active_window_title: string | null;

  mouse_click_count: number;

  keystroke_count: number;
}