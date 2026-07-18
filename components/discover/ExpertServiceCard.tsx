"use client";

import React, { memo, useCallback } from "react";
import type { ServiceCardData } from "@/types/marketplace";
import { ServiceBrowseCard } from "@/components/service-cards/ServiceBrowseCard";
import { formatBuilderName } from "@/lib/display/formatBuilderName";

type ExpertServiceCardProps = {
  expert: ServiceCardData;
  index?: number;
  recognitionBadge?: import('@/lib/arena/badges/types').RecognitionBadgeGrant | null;
  onViewService: (serviceId: string) => void;
  onRequestCustomProject: (builderId: string, serviceId?: string) => void;
};

function ExpertServiceCardComponent({
  expert,
  index = 0,
  recognitionBadge = null,
  onViewService,
  onRequestCustomProject,
}: ExpertServiceCardProps) {
  const category = expert.category || expert.tech_stack?.[0] || "AI Automation";
  const price = expert.starting_price_usd || 50;
  const coverImage = expert.service_image || expert.banner_url || "";

  const handleViewService = useCallback(
    () => onViewService(expert.service_id),
    [expert.service_id, onViewService]
  );
  const handleRequestProject = useCallback(
    () => onRequestCustomProject(expert.builder_id, expert.service_id),
    [expert.builder_id, expert.service_id, onRequestCustomProject]
  );

  return (
    <article className="h-full" aria-label={`${expert.service_title} by ${formatBuilderName(expert.full_name)}`}>
      <ServiceBrowseCard
        index={index}
        category={category}
        coverImage={coverImage}
        serviceTitle={expert.service_title}
        fullName={expert.full_name}
        headline={expert.headline}
        avatarUrl={expert.avatar_url}
        price={price}
        calculatedRating={expert.calculated_rating}
        reviewCount={expert.review_count}
        deliveryTimeDays={expert.delivery_time_days}
        isVerified={expert.is_verified}
        isTopExpert={expert.is_top_expert}
        recognitionBadge={recognitionBadge}
        footer={
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={handleViewService}
              aria-label={`View details for ${expert.service_title}`}
              className="text-[11px] font-medium text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 rounded"
            >
              View Details →
            </button>
            <button
              type="button"
              onClick={handleRequestProject}
              aria-label={`Request custom project from ${formatBuilderName(expert.full_name)}`}
              className="text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 rounded"
            >
              Request Project
            </button>
          </div>
        }
      />
    </article>
  );
}

export const ExpertServiceCard = memo(ExpertServiceCardComponent);
