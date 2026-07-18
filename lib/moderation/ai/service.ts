import { callGeminiModeration } from './client';
import {
  parseAiModerationResponse,
  parseChatModerationResponse,
  parseProjectModerationResponse,
} from './parser';
import {
  getChatModerationPrompt,
  getProjectModerationPrompt,
  getProposalModerationPrompt,
} from './prompts';
import type { AiModerationResult, ProjectModerationResult } from '../types';
import type { RegexFinding } from '../regex/scan';

async function moderate(prompt: string): Promise<AiModerationResult> {
  const { text, failed } = await callGeminiModeration(prompt);
  return parseAiModerationResponse(text, failed);
}

export async function moderateProjectContent(input: {
  title: string;
  description: string;
  category?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
}): Promise<ProjectModerationResult> {
  const prompt = getProjectModerationPrompt(input);
  const { text, failed } = await callGeminiModeration(prompt);
  return parseProjectModerationResponse(text, failed);
}

export async function moderateProposalContent(input: {
  coverLetter: string;
  proposedAmountUsd: number;
  projectTitle?: string;
}): Promise<AiModerationResult> {
  const prompt = getProposalModerationPrompt(input);
  return moderate(prompt);
}

export async function moderateChatMessage(input: {
  content: string;
  regexFindings?: RegexFinding[];
}): Promise<AiModerationResult> {
  const prompt = getChatModerationPrompt({
    content: input.content,
    regexFindings: input.regexFindings,
  });

  console.log('[moderation] Gemini Request', {
    contentLength: input.content.length,
    regexFindingCount: input.regexFindings?.length ?? 0,
  });

  const { text, failed } = await callGeminiModeration(prompt);
  const result = parseChatModerationResponse(text, failed);

  console.log('[moderation] Gemini Response', {
    failed,
    category: result.category,
    riskLevel: result.riskLevel,
    riskScore: result.riskScore,
    confidenceScore: result.confidenceScore,
    shouldFlag: result.shouldFlag,
    shouldBlock: result.shouldBlock,
  });

  return result;
}
