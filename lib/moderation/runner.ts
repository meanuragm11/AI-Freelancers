import { supabaseAdmin } from '@/lib/founder/server';
import { sendNotification, NotificationType } from '@/lib/notifications/notificationService';
import type {
  AiModerationResult,
  ChatModerationInput,
  ModerationEntityType,
  ModerationStatus,
  ProjectModerationInput,
  ProjectModerationOutcome,
  ProjectModerationResult,
  ProposalModerationInput,
} from './types';
import { PROJECT_DOMAIN_MODERATION, TRUST_SCORE } from './constants';
import {
  moderateChatMessage,
  moderateProjectContent,
  moderateProposalContent,
} from './ai/service';
import { applyEscalation } from './escalation';
import { scanChatContent } from './regex/scan';
import type { RegexFinding } from './regex/scan';
import { requiresFounderAlert } from './risk';
import { createFounderModerationAlert, createFounderProjectReviewAlert } from './founderAlert';

function buildGeminiFailedResult(findings: RegexFinding[]): AiModerationResult {
  if (findings.length === 0) {
    return {
      riskScore: 0,
      confidenceScore: 0,
      category: 'unknown',
      reason: 'AI moderation unavailable — no regex signals detected',
      riskLevel: 'low',
      shouldFlag: false,
      shouldBlock: false,
      geminiFailed: true,
    };
  }

  const labels = findings.map((f) => f.label).join(', ');
  return {
    riskScore: 65,
    confidenceScore: 50,
    category: 'suspicious',
    reason: `AI moderation unavailable. Regex detected: ${labels} — pending founder review.`,
    riskLevel: 'high',
    shouldFlag: true,
    shouldBlock: false,
    geminiFailed: true,
  };
}

async function runChatModerationPipeline(input: ChatModerationInput): Promise<AiModerationResult> {
  console.log('[moderation] Chat Moderation Started', {
    messageId: input.messageId,
    collabId: input.collabId,
    senderId: input.senderId,
  });

  const regexScan = scanChatContent(input.content);

  if (regexScan.findings.length > 0) {
    console.log('[moderation] Regex Match', {
      messageId: input.messageId,
      findings: regexScan.findings,
    });
  } else {
    console.log('[moderation] Regex scan complete — no pattern matches');
  }

  try {
    const result = await moderateChatMessage({
      content: input.content,
      regexFindings: regexScan.findings,
    });

    if (result.geminiFailed) {
      return buildGeminiFailedResult(regexScan.findings);
    }

    return result;
  } catch (error) {
    console.error('[moderation] Gemini chat moderation error (non-blocking):', error);
    return buildGeminiFailedResult(regexScan.findings);
  }
}

function resolveStatus(result: AiModerationResult): ModerationStatus {
  if (result.geminiFailed) return 'pending';
  if (result.shouldBlock) return 'blocked';
  if (result.shouldFlag) return 'flagged';
  return 'approved';
}

function projectResultToAiLog(result: ProjectModerationResult): AiModerationResult {
  return {
    riskScore: result.riskScore,
    confidenceScore: result.confidenceScore,
    category: result.category,
    reason: result.reason,
    shouldFlag: result.shouldFlag,
    shouldBlock: result.shouldBlock,
    rawResponse: result.rawResponse,
    geminiFailed: result.geminiFailed,
  };
}

type ProjectDecision = {
  logStatus: ModerationStatus;
  projectModerationStatus: 'pending' | 'approved' | 'flagged' | 'rejected';
  visibility: 'published' | 'hidden' | 'rejected';
  pendingFounderReview: boolean;
  userMessage?: string;
};

function resolveProjectDecision(result: ProjectModerationResult): ProjectDecision {
  if (result.recommendedAction === 'REJECT' || result.shouldBlock || !result.safe) {
    return {
      logStatus: 'blocked',
      projectModerationStatus: 'rejected',
      visibility: 'rejected',
      pendingFounderReview: false,
      userMessage: PROJECT_DOMAIN_MODERATION.rejectedUserMessage,
    };
  }

  if (
    result.recommendedAction === 'PUBLISH' &&
    result.domain === 'AI_PROJECT' &&
    result.safe
  ) {
    return {
      logStatus: 'approved',
      projectModerationStatus: 'approved',
      visibility: 'published',
      pendingFounderReview: false,
    };
  }

  return {
    logStatus: 'flagged',
    projectModerationStatus: 'flagged',
    visibility: 'hidden',
    pendingFounderReview: true,
    userMessage: PROJECT_DOMAIN_MODERATION.founderReviewUserMessage,
  };
}

async function notifyProjectModerationUser(
  buyerId: string,
  projectId: string,
  title: string,
  decision: ProjectDecision
) {
  if (!decision.userMessage) return;

  const isRejected = decision.visibility === 'rejected';

  await sendNotification({
    type: NotificationType.SYSTEM,
    recipientId: buyerId,
    title: isRejected ? 'Project not published' : 'Project under review',
    message: decision.userMessage,
    link: `/buyer/open-projects/${projectId}`,
    metadata: {
      projectId,
      projectTitle: title,
      moderationStatus: decision.projectModerationStatus,
      idempotencyKey: `project-moderation-${projectId}-${decision.projectModerationStatus}`,
    },
  });
}

async function insertModerationLog(params: {
  entityType: ModerationEntityType;
  entityId: string;
  userId: string;
  result: AiModerationResult;
  status: ModerationStatus;
}) {
  const { data, error } = await supabaseAdmin
    .from('moderation_logs')
    .insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      user_id: params.userId,
      ai_model: 'gemini-2.5-flash',
      risk_score: params.result.riskScore,
      confidence_score: params.result.confidenceScore,
      category: params.result.category,
      reason: params.result.reason,
      status: params.status,
      raw_ai_response: params.result.rawResponse ?? {},
      gemini_failed: params.result.geminiFailed ?? false,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

async function updateUserTrustScore(userId: string, result: AiModerationResult) {
  const { data: existing } = await supabaseAdmin
    .from('user_trust_scores')
    .select('trust_score, offence_count')
    .eq('user_id', userId)
    .maybeSingle();

  let penalty = 0;
  if (result.shouldBlock) penalty = TRUST_SCORE.blockPenalty;
  else if (result.shouldFlag) penalty = TRUST_SCORE.flagPenalty;

  const currentScore = existing?.trust_score ?? TRUST_SCORE.initial;
  const newScore = Math.max(TRUST_SCORE.min, currentScore - penalty);
  const offenceCount = (existing?.offence_count ?? 0) + (penalty > 0 ? 1 : 0);

  await supabaseAdmin.from('user_trust_scores').upsert({
    user_id: userId,
    trust_score: newScore,
    offence_count: offenceCount,
    last_offence_at: penalty > 0 ? new Date().toISOString() : existing ? undefined : null,
    last_moderation_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function runProjectModeration(
  input: ProjectModerationInput
): Promise<ProjectModerationOutcome> {
  const fallbackOutcome: ProjectModerationOutcome = {
    visibility: 'hidden',
    moderationStatus: 'flagged',
    pendingFounderReview: true,
    userMessage: PROJECT_DOMAIN_MODERATION.founderReviewUserMessage,
  };

  try {
    const result = await moderateProjectContent({
      title: input.title,
      description: input.description,
      category: input.category,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
    });

    const decision = resolveProjectDecision(result);
    const aiLog = projectResultToAiLog(result);

    const logId = await insertModerationLog({
      entityType: 'project',
      entityId: input.projectId,
      userId: input.buyerId,
      result: aiLog,
      status: decision.logStatus,
    });

    const { data: moderationRecord, error: moderationInsertError } = await supabaseAdmin
      .from('project_moderation')
      .insert({
        project_id: input.projectId,
        buyer_id: input.buyerId,
        title_snapshot: input.title,
        description_snapshot: input.description,
        risk_score: result.riskScore,
        confidence_score: result.confidence,
        category: result.category,
        reason: result.reason,
        status: decision.logStatus,
        domain: result.domain,
        recommended_action: result.recommendedAction,
        safe: result.safe,
        moderation_log_id: logId,
      })
      .select('id')
      .single();

    if (moderationInsertError) throw moderationInsertError;

    await supabaseAdmin
      .from('projects')
      .update({ moderation_status: decision.projectModerationStatus })
      .eq('id', input.projectId);

    if (decision.visibility === 'hidden' || decision.visibility === 'rejected') {
      await supabaseAdmin
        .from('projects')
        .update({ status: 'draft' })
        .eq('id', input.projectId)
        .eq('status', 'published');
    }

    if (decision.visibility === 'rejected') {
      await updateUserTrustScore(input.buyerId, aiLog);
    }

    if (decision.pendingFounderReview) {
      await createFounderProjectReviewAlert({
        projectId: input.projectId,
        buyerId: input.buyerId,
        title: input.title,
        description: input.description,
        domain: result.domain,
        confidence: result.confidence,
        reason: result.reason,
        projectModerationId: moderationRecord?.id,
      });
    }

    if (result.shouldBlock || (result.shouldFlag && decision.pendingFounderReview)) {
      await applyEscalation({
        userId: input.buyerId,
        category: result.category,
        reason: result.reason,
        sourceEntityType: 'project',
        sourceEntityId: input.projectId,
        moderationLogId: logId,
        riskScore: result.riskScore,
      });
    }

    await supabaseAdmin.from('marketplace_audit_logs').insert({
      entity_type: 'project',
      entity_id: input.projectId,
      action: `moderation.${decision.logStatus}`,
      actor_id: null,
      metadata: {
        domain: result.domain,
        recommended_action: result.recommendedAction,
        safe: result.safe,
        confidence: result.confidence,
        risk_score: result.riskScore,
        confidence_score: result.confidenceScore,
        category: result.category,
        reason: result.reason,
        visibility: decision.visibility,
        gemini_failed: result.geminiFailed ?? false,
      },
    });

    await notifyProjectModerationUser(input.buyerId, input.projectId, input.title, decision);

    return {
      visibility: decision.visibility,
      moderationStatus: decision.logStatus,
      domain: result.domain,
      recommendedAction: result.recommendedAction,
      userMessage: decision.userMessage,
      pendingFounderReview: decision.pendingFounderReview,
    };
  } catch (error) {
    console.error('[moderation] Project moderation failed:', error);
    return fallbackOutcome;
  }
}

export async function runProposalModeration(input: ProposalModerationInput): Promise<void> {
  try {
    const result = await moderateProposalContent({
      coverLetter: input.coverLetter,
      proposedAmountUsd: input.proposedAmountUsd,
      projectTitle: input.projectTitle,
    });

    const status = resolveStatus(result);
    const logId = await insertModerationLog({
      entityType: 'proposal',
      entityId: input.proposalId,
      userId: input.builderId,
      result,
      status,
    });

    await supabaseAdmin.from('proposal_moderation').insert({
      proposal_id: input.proposalId,
      builder_id: input.builderId,
      cover_letter_snapshot: input.coverLetter,
      risk_score: result.riskScore,
      confidence_score: result.confidenceScore,
      category: result.category,
      reason: result.reason,
      status,
      moderation_log_id: logId,
    });

    await supabaseAdmin
      .from('project_proposals')
      .update({ moderation_status: status })
      .eq('id', input.proposalId);

    if (status === 'blocked') {
      await supabaseAdmin
        .from('project_proposals')
        .update({ status: 'cancelled' })
        .eq('id', input.proposalId);
    }

    await updateUserTrustScore(input.builderId, result);

    if (result.shouldFlag || result.shouldBlock) {
      await applyEscalation({
        userId: input.builderId,
        category: result.category,
        reason: result.reason,
        sourceEntityType: 'proposal',
        sourceEntityId: input.proposalId,
        moderationLogId: logId,
        riskScore: result.riskScore,
      });
    }

    await supabaseAdmin.from('marketplace_audit_logs').insert({
      entity_type: 'proposal',
      entity_id: input.proposalId,
      action: `moderation.${status}`,
      actor_id: null,
      metadata: {
        risk_score: result.riskScore,
        confidence_score: result.confidenceScore,
        category: result.category,
        reason: result.reason,
      },
    });
  } catch (error) {
    console.error('[moderation] Proposal moderation failed:', error);
  }
}

export async function runChatModeration(input: ChatModerationInput): Promise<void> {
  try {
    const { data: existingRecord } = await supabaseAdmin
      .from('chat_moderation')
      .select('id')
      .eq('message_id', input.messageId)
      .maybeSingle();

    if (existingRecord) {
      console.log('[moderation] Chat moderation already recorded — skipping', {
        messageId: input.messageId,
      });
      return;
    }

    const result = await runChatModerationPipeline(input);
    const status = resolveStatus(result);
    const alertFounder = requiresFounderAlert(result);
    const isHidden = status === 'blocked';

    const logId = await insertModerationLog({
      entityType: 'chat',
      entityId: input.messageId,
      userId: input.senderId,
      result,
      status,
    });

    let chatModerationId: string | undefined;

    if (alertFounder) {
      const { data: chatModeration, error: chatModError } = await supabaseAdmin
        .from('chat_moderation')
        .insert({
          message_id: input.messageId,
          collab_id: input.collabId,
          sender_id: input.senderId,
          content_snapshot: input.content,
          risk_score: result.riskScore,
          confidence_score: result.confidenceScore,
          category: result.category,
          reason: result.reason,
          status,
          moderation_log_id: logId,
          is_hidden: isHidden,
        })
        .select('id')
        .single();

      if (chatModError) throw chatModError;
      chatModerationId = chatModeration?.id;
    }

    console.log('[moderation] Moderation Saved', {
      messageId: input.messageId,
      chatModerationId,
      status,
      category: result.category,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      founderAlert: alertFounder,
    });

    await supabaseAdmin
      .from('messages')
      .update({
        moderation_status: status,
        is_flagged: result.shouldFlag || result.shouldBlock,
        is_hidden: isHidden,
      })
      .eq('id', input.messageId);

    if (alertFounder) {
      await updateUserTrustScore(input.senderId, result);

      await createFounderModerationAlert({
        messageId: input.messageId,
        collabId: input.collabId,
        category: result.category,
        riskScore: result.riskScore,
        confidenceScore: result.confidenceScore,
        reason: result.reason,
        contentPreview: input.content,
        chatModerationId,
      });

      if (result.shouldFlag || result.shouldBlock) {
        await applyEscalation({
          userId: input.senderId,
          category: result.category,
          reason: result.reason,
          sourceEntityType: 'chat',
          sourceEntityId: input.messageId,
          moderationLogId: logId,
          riskScore: result.riskScore,
        });
      }
    }
  } catch (error) {
    console.error('[moderation] Chat moderation failed:', error);
  }
}

/** Fire-and-forget background moderation — never blocks the caller */
export function queueProjectModeration(input: ProjectModerationInput): void {
  void runProjectModeration(input);
}

export function queueProposalModeration(input: ProposalModerationInput): void {
  void runProposalModeration(input);
}

export function queueChatModeration(input: ChatModerationInput): void {
  void runChatModeration(input).catch((error) => {
    console.error('[moderation] queueChatModeration unhandled error:', error);
  });
}
