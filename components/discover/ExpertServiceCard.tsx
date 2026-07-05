"use client";

import React, { memo, useCallback } from "react";
import type { ServiceCardData } from "@/types/marketplace";
import {
  ServiceCardShell,
  serviceCardPrimaryButtonClass,
  serviceCardSecondaryButtonClass,
} from "@/components/service-cards/ServiceCardShell";

type ExpertServiceCardProps = {
  expert: ServiceCardData;
  index?: number;
  onViewService: (serviceId: string) => void;
  onRequestCustomProject: (builderId: string, serviceId?: string) => void;
};

function ExpertServiceCardComponent({
  expert,
  index = 0,
  onViewService,
  onRequestCustomProject,
}: ExpertServiceCardProps) {
  const category = expert.category || expert.tech_stack?.[0] || "AI Automation";
  const price = expert.starting_price_usd || 50;
  const coverImage = expert.service_image || expert.banner_url || "";
  const responseTime = expert.response_time_label || "< 4 hrs";

  const handleViewService = useCallback(
    () => onViewService(expert.service_id),
    [expert.service_id, onViewService]
  );
  const handleRequestProject = useCallback(
    () => onRequestCustomProject(expert.builder_id, expert.service_id),
    [expert.builder_id, expert.service_id, onRequestCustomProject]
  );

  return (
    <article className="h-full" aria-label={`${expert.service_title} by ${expert.full_name}`}>
      <ServiceCardShell
        index={index}
        category={category}
        coverImage={coverImage}
        serviceTitle={expert.service_title}
        serviceDescription={expert.service_description}
        fullName={expert.full_name}
        headline={expert.headline}
        avatarUrl={expert.avatar_url}
        price={price}
        calculatedRating={expert.calculated_rating}
        reviewCount={expert.review_count}
        deliveryTimeDays={expert.delivery_time_days}
        completedProjects={expert.completed_projects}
        isVerified={expert.is_verified}
        isTopExpert={expert.is_top_expert}
        isFastResponse={expert.is_fast_response}
        responseTimeLabel={responseTime}
        footer={
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleViewService}
              aria-label={`View Services by ${expert.full_name}`}
              className={serviceCardPrimaryButtonClass}
            >
              View Services
            </button>
            <button
              type="button"
              onClick={handleRequestProject}
              aria-label={`Request custom project from ${expert.full_name}`}
              className={serviceCardSecondaryButtonClass}
            >
              Request Custom Project
            </button>
          </div>
        }
      />
    </article>
  );
}

export const ExpertServiceCard = memo(ExpertServiceCardComponent);
