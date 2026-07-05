export type ServiceStatus = "draft" | "published" | "paused" | "archived";

export type ProjectRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "negotiating"
  | "quoted"
  | "completed"
  | "funded";

export type QuotationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "changes_requested";

export interface ServiceFAQ {
  question: string;
  answer: string;
}

export interface PortfolioMediaFile {
  type: string;
  url: string;
  name: string;
}

export interface PortfolioProjectLink {
  title: string;
  url: string;
}

export interface Service {
  id: string;
  builder_id: string;
  title: string;
  short_description: string | null;
  detailed_description: string | null;
  category: string | null;
  ai_skills: string[];
  tags: string[];
  cover_image_url: string | null;
  banner_image_url: string | null;
  gallery_urls: string[];
  demo_video_url: string | null;
  faqs: ServiceFAQ[];
  whats_included: string[];
  delivery_time_days: number;
  included_revisions: number;
  extra_revision_price_usd: number;
  requirements_from_buyer: string | null;
  status: ServiceStatus;
  archived_at?: string | null;
  starting_price_usd: number;
  view_count: number;
  order_count: number;
  rating_avg: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  builder?: ExpertProfile;
}

export interface PortfolioProject {
  id: string;
  builder_id: string;
  service_id?: string | null;
  title: string;
  short_description: string | null;
  detailed_description: string | null;
  ai_technologies: string[];
  category: string | null;
  project_url: string | null;
  github_url: string | null;
  live_demo_url: string | null;
  links: PortfolioProjectLink[];
  media_files: PortfolioMediaFile[];
  created_at: string;
  updated_at: string;
}

export interface ProjectRequest {
  id: string;
  buyer_id: string;
  builder_id: string;
  service_id: string | null;
  title: string;
  description: string;
  budget_usd: number | null;
  expected_deadline: string | null;
  reference_links: string[];
  required_technologies: string[];
  attachment_urls: PortfolioMediaFile[];
  priority: string;
  additional_notes: string | null;
  status: ProjectRequestStatus;
  payment_type?: "single_payment" | "milestone_payment";
  agreed_amount_usd?: number | null;
  accepted_negotiation_id?: string | null;
  negotiation_round?: number | null;
  conversation_id: string | null;
  created_at: string;
}

export interface Quotation {
  id: string;
  project_request_id: string;
  builder_id: string;
  buyer_id: string;
  price_usd: number;
  estimated_delivery_days: number;
  included_revisions: number;
  notes: string | null;
  status: QuotationStatus;
  created_at: string;
}

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
  external_projects: unknown[];
  created_at: string;
  languages?: string[];
  average_rating?: number;
  review_count?: number;
  average_response_hours?: number | null;
  completed_projects?: number;
  is_top_expert?: boolean;
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
  service_id?: string | null;
  project_request_id?: string | null;
}

export interface Review {
  id: string;
  rating: number;
  review: string;
  buyer_id: string;
  builder_id: string;
  collab_id?: string | null;
  service_id?: string | null;
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

/** Enriched service card data for discovery grid */
export interface ServiceCardData {
  service_id: string;
  builder_id: string;
  full_name?: string;
  headline?: string;
  location?: string | null;
  avatar_url?: string;
  banner_url?: string;
  tech_stack?: string[];
  completed_projects: number;
  is_verified: boolean;
  is_top_expert: boolean;
  calculated_rating: number;
  service_title: string;
  service_description: string;
  service_image?: string;
  delivery_time_days: number;
  review_count: number;
  response_time_label?: string;
  is_fast_response?: boolean;
  starting_price_usd: number;
  category?: string;
  created_at?: string;
}
