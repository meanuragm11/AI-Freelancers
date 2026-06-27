import { supabase } from "@/lib/supabaseClient";
import { ProjectMilestone } from "@/types/marketplace";

export async function createMilestones(
  collabId: string,
  milestones: ProjectMilestone[]
) {
  const payload = milestones.map((m, index) => ({
    collab_id: collabId,
    milestone_order: index + 1,
    title: m.title,
    description: m.description,
    amount_usd: m.amount_usd,
    due_date: m.due_date,
    status: "draft",
  }));

  const { error } = await supabase
    .from("project_milestones")
    .insert(payload);

  if (error) throw error;
}