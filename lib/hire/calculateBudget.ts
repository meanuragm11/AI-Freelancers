import { ProjectMilestone } from "@/types/marketplace";

export function calculateBudget(
  milestones: ProjectMilestone[]
) {
  return milestones.reduce(
    (sum, item) => sum + Number(item.amount_usd || 0),
    0
  );
}

export function platformFee(total: number) {
  return Number((total * 0.05).toFixed(2));
}

export function builderReceives(total: number) {
  return Number((total - platformFee(total)).toFixed(2));
}