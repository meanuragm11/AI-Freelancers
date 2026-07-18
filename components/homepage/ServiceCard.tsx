"use client";

import React, { memo } from "react";
import Link from "next/link";
import type { ServiceCardData } from "@/types/marketplace";
import { ServiceBrowseCard } from "@/components/service-cards/ServiceBrowseCard";
import { formatBuilderName } from "@/lib/display/formatBuilderName";
import type { RecognitionBadgeGrant } from "@/lib/arena/badges/types";

type ServiceCardProps = {
  service: ServiceCardData;
  index?: number;
  recognitionBadge?: RecognitionBadgeGrant | null;
};

function ServiceCardComponent({ service, index = 0, recognitionBadge = null }: ServiceCardProps) {
  const category = service.category || service.tech_stack?.[0] || "AI Service";
  const price = service.starting_price_usd || 0;

  return (
    <Link
      href={`/service/${service.service_id}`}
      className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 rounded-xl"
      aria-label={`${service.service_title} by ${formatBuilderName(service.full_name)}`}
    >
      <ServiceBrowseCard
        index={index}
        category={category}
        coverImage={service.service_image}
        serviceTitle={service.service_title}
        fullName={service.full_name}
        headline={service.headline}
        avatarUrl={service.avatar_url}
        price={price}
        calculatedRating={service.calculated_rating}
        reviewCount={service.review_count}
        deliveryTimeDays={service.delivery_time_days}
        isVerified={service.is_verified}
        isTopExpert={service.is_top_expert}
        recognitionBadge={recognitionBadge}
        showViewDetails
      />
    </Link>
  );
}

export const ServiceCard = memo(ServiceCardComponent);
