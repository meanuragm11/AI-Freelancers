import { supabase } from '@/lib/supabaseClient';
import { createProjectRequestWithConversation } from '@/lib/project-requests';

/**
 * Opens an existing buyer↔builder collab conversation, or creates one via the
 * established project-request flow when none exists yet.
 */
export async function openBuilderConversation(params: {
  buyerId: string;
  builderId: string;
  projectTitle: string;
  projectDescription?: string;
}): Promise<string> {
  const { buyerId, builderId, projectTitle, projectDescription } = params;

  const { data: existing } = await supabase
    .from('collabs')
    .select('id')
    .eq('buyer_id', buyerId)
    .eq('builder_id', builderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { conversationId } = await createProjectRequestWithConversation({
    buyer_id: buyerId,
    builder_id: builderId,
    title: `Re: ${projectTitle}`,
    description:
      projectDescription?.trim() ||
      `I'd like to discuss your proposal for "${projectTitle}".`,
    budget_usd: null,
    payment_type: 'single_payment',
  });

  return conversationId;
}
