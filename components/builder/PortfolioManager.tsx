"use client";

import PortfolioSection from "@/components/portfolio/PortfolioSection";

export default function PortfolioManager({ builderId }: { builderId: string }) {
  return <PortfolioSection builderId={builderId} isOwner variant="dashboard" />;
}
