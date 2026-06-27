import { ProjectMilestone } from "@/types/marketplace";

export function validateHireForm(data: any) {

    if (!data.title?.trim())
        return "Project title is required.";

    if (!data.description?.trim())
        return "Project description is required.";

    if (!data.deadline)
        return "Delivery date is required.";

    if (data.milestones.length === 0)
        return "Add at least one milestone.";

    for (const m of data.milestones as ProjectMilestone[]) {

        if (!m.title.trim())
            return "Every milestone needs a title.";

        if (m.amount_usd <= 0)
            return "Milestone amount must be greater than zero.";
    }

    return null;
}