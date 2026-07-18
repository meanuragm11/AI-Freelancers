"use client";

import React from "react";
import { SOLUTION_CARD_GRID_CLASS } from "@/components/service-cards/solutionCardLayout";

type SolutionCardGridProps = {
  children: React.ReactNode;
  className?: string;
};

export function SolutionCardGrid({ children, className = "" }: SolutionCardGridProps) {
  return <div className={`${SOLUTION_CARD_GRID_CLASS}${className ? ` ${className}` : ""}`}>{children}</div>;
}
