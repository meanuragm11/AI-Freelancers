"use client";

import React, { memo } from "react";
import Link from "next/link";
import type { ServiceCardData } from "@/types/marketplace";
import {
  ServiceCardShell,
  serviceCardPrimaryButtonClass,
} from "@/components/service-cards/ServiceCardShell";

type ServiceCardProps = {
  service: ServiceCardData;
  index?: number;
};

function ServiceCardComponent({ service, index = 0 }: ServiceCardProps) {
  const category = service.category || service.tech_stack?.[0] || "AI Service";
  const price = service.starting_price_usd || 0;

  return (
    <Link
      href={`/service/${service.service_id}`}
      className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 rounded-2xl"
      aria-label={`${service.service_title} by ${service.full_name}`}
    >
      <ServiceCardShell
        index={index}
        category={category}
        coverImage={service.service_image}
        serviceTitle={service.service_title}
        serviceDescription={service.service_description}
        fullName={service.full_name}
        headline={service.headline}
        avatarUrl={service.avatar_url}
        price={price}
        calculatedRating={service.calculated_rating}
        reviewCount={service.review_count}
        deliveryTimeDays={service.delivery_time_days}
        completedProjects={service.completed_projects}
        isVerified={service.is_verified}
        isTopExpert={service.is_top_expert}
        footer={
          <span className={`${serviceCardPrimaryButtonClass} inline-flex items-center justify-center`}>
            View Services
          </span>
        }
      />
    </Link>
  );
}

export const ServiceCard = memo(ServiceCardComponent);
