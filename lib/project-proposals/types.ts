export type ProposalMilestone = {
  title: string;
  description: string;
  amount: number;
  deadline: string;
};

export type ProposalSnapshot = {
  title: string;
  description: string;
  payment_type: 'single_payment' | 'milestone_payment';
  budget_usd: number | null;
  expected_deadline?: string | null;
  reference_links?: string[];
  required_technologies?: string[];
  attachment_urls?: Array<{ type?: string; url: string; name: string }>;
  priority?: string;
  additional_notes?: string | null;
};

export type ProposalCardPayload = {
  negotiation: {
    id: string;
    version: number;
    proposal_type: string;
    proposed_amount_usd: number | null;
    proposed_milestones: ProposalMilestone[];
    explanation: string | null;
    status: string;
    created_at: string;
    proposed_by: string;
    proposal_snapshot: ProposalSnapshot;
  };
  projectRequest: {
    id: string;
    status: string;
    payment_type: 'single_payment' | 'milestone_payment';
    conversation_id: string | null;
    buyer_id: string;
    builder_id: string;
    accepted_negotiation_id: string | null;
  };
  proposer: { full_name?: string; avatar_url?: string | null };
  previousVersion: {
    proposed_amount_usd: number | null;
    proposed_milestones: ProposalMilestone[];
  } | null;
  platformFeeUsd: number;
  isLocked: boolean;
  isAwaitingPayment: boolean;
  isSuperseded?: boolean;
};

export const PROPOSAL_CARD_PREFIX = '[[PROPOSAL_CARD|';
export const PLATFORM_FEE_USD = 5;

export function proposalCardMessage(negotiationId: string) {
  return `${PROPOSAL_CARD_PREFIX}${negotiationId}]]`;
}

export function parseProposalCardMessage(text: string): string | null {
  const match = text.match(/\[\[PROPOSAL_CARD\|([0-9a-f-]{36})\]\]/i);
  return match?.[1] ?? null;
}
