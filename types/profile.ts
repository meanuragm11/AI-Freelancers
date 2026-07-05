import type { PortfolioProject, Service } from "@/types/marketplace";

export type AvailabilityStatus = "available" | "limited" | "unavailable";

export interface BuilderProfileView {
  id: string;
  full_name: string;
  headline: string | null;
  location: string | null;
  bio: string | null;
  tech_stack: string[];
  external_projects: ExternalProject[];
  avatar_url: string | null;
  banner_url: string | null;
  is_verified: boolean;
  average_rating: number;
  review_count: number;
  average_response_hours: number | null;
  completed_projects: number;
  is_top_expert: boolean;
  created_at: string;
  languages: string[];
  availability_status: AvailabilityStatus;
}

export interface ExternalProject {
  id: string;
  title: string;
  description: string;
  url?: string;
  file_name?: string;
}

export interface BuilderPublishedService {
  id: string;
  title: string;
  short_description: string | null;
  starting_price_usd: number;
  delivery_time_days: number;
  cover_image_url: string | null;
  banner_image_url: string | null;
  rating_avg: number;
  review_count: number;
  order_count: number;
  category: string | null;
}

export interface BuilderPublishedComponent {
  id: string;
  title: string;
  category: string | null;
  thumbnail_url: string | null;
  price_usd: number;
  sales_count: number;
}

export interface CompletedProjectReview {
  id: string;
  rating: number;
  review: string;
  created_at: string;
  service_name: string;
  buyer_name: string;
  buyer_avatar_url: string | null;
  amount_usd: number | null;
  completed_at: string;
}

export interface ProfilePageData {
  profile: BuilderProfileView;
  services: BuilderPublishedService[];
  components: BuilderPublishedComponent[];
  portfolioProjects: PortfolioProject[];
  workHistory: CompletedProjectReview[];
  publishedServiceCount: number;
}

export type { Service, PortfolioProject };
