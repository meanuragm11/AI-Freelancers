/**
 * Prompt templates are separated from scoring/business logic so they can evolve
 * independently. Templates are cached in memory after first compilation.
 */

const promptCache = new Map<string, string>();

function cached(key: string, builder: () => string): string {
  const existing = promptCache.get(key);
  if (existing) return existing;
  const compiled = builder();
  promptCache.set(key, compiled);
  return compiled;
}

const JSON_SCHEMA = `Return ONLY raw JSON (no markdown fences):
{
  "risk_score": <number 0-100>,
  "confidence_score": <number 0-100>,
  "category": "<one of: spam, contact_sharing, external_payment, off_platform, harassment, hate_speech, scam, illegal, offensive, low_quality, duplicate, fake_job, copy_paste, unrealistic, suspicious, safe>",
  "reason": "<concise explanation>",
  "detected_issues": ["<issue1>", "<issue2>"]
}`;

const PROJECT_JSON_SCHEMA = `Return ONLY raw JSON (no markdown fences):
{
  "safe": <boolean — false if any policy violation is present>,
  "domain": "<one of: AI_PROJECT, NON_AI_PROJECT, AMBIGUOUS_PROJECT>",
  "confidence": <number 0-100 — confidence in the domain classification>,
  "reason": "<concise explanation covering safety and domain eligibility>",
  "recommended_action": "<one of: PUBLISH, FOUNDER_REVIEW, REJECT>",
  "risk_score": <number 0-100 — policy/safety risk>,
  "confidence_score": <number 0-100 — confidence in safety assessment>,
  "category": "<one of: spam, contact_sharing, external_payment, off_platform, harassment, hate_speech, scam, illegal, offensive, low_quality, duplicate, fake_job, copy_paste, unrealistic, suspicious, safe>",
  "detected_issues": ["<issue1>", "<issue2>"]
}`;

export function getProjectModerationPrompt(input: {
  title: string;
  description: string;
  category?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
}): string {
  return cached('project_v2', () =>
    `You are a Trust & Safety and AI Domain Eligibility moderator for Zelance, an AI-first freelancing marketplace.
Every open project on Zelance must be AI-related. Evaluate BOTH policy safety AND AI domain eligibility using semantic reasoning about the project's intent — do NOT rely on keyword matching alone.

## Policy safety (Trust & Safety)
Detect: spam, fake jobs, duplicates, contact info (phone/email/Telegram/WhatsApp/Discord),
external links, external payment requests, illegal content, offensive language,
unrealistic descriptions, suspicious behavior.
Set safe=false and recommended_action=REJECT when policy is violated.

## AI domain eligibility
Classify the project's core intent into exactly ONE domain:
- AI_PROJECT — The work fundamentally requires AI/ML (models, agents, RAG, fine-tuning, AI automation, LLM apps, computer vision, NLP, generative AI, AI data pipelines, etc.)
- NON_AI_PROJECT — The work is clearly not AI-related (generic web dev, logo design, manual data entry, traditional IT with no AI component, etc.)
- AMBIGUOUS_PROJECT — Could plausibly involve AI but intent is unclear, too vague, or only tangentially mentions AI without substantive AI work

## recommended_action rules
- AI_PROJECT with no policy violations → recommended_action PUBLISH, safe=true
- NON_AI_PROJECT → recommended_action FOUNDER_REVIEW (never PUBLISH automatically)
- AMBIGUOUS_PROJECT → recommended_action FOUNDER_REVIEW (never PUBLISH automatically)
- Any policy violation → recommended_action REJECT, safe=false

Use semantic understanding of title, description, category, and budget context. A project titled "Build a website" is NON_AI_PROJECT even if posted in an AI category.

${PROJECT_JSON_SCHEMA}`
  ) + `

Project title: ${JSON.stringify(input.title)}
Category: ${JSON.stringify(input.category ?? 'unspecified')}
Budget: $${input.budgetMin ?? '?'} - $${input.budgetMax ?? '?'}
Description:
${input.description.slice(0, 8000)}
`.trim();
}

export function getProposalModerationPrompt(input: {
  coverLetter: string;
  proposedAmountUsd: number;
  projectTitle?: string;
}): string {
  return `
You are a Trust & Safety moderator for Zelance, an AI freelancing marketplace.
Analyze this builder proposal for policy violations.

Detect: spam, copy-paste generic proposals, contact sharing, external payment requests,
low quality or irrelevant proposals, repeated submission patterns.

${JSON_SCHEMA}

Project: ${JSON.stringify(input.projectTitle ?? 'unknown')}
Proposed amount: $${input.proposedAmountUsd}
Cover letter:
${input.coverLetter.slice(0, 8000)}
`.trim();
}

const CHAT_JSON_SCHEMA = `Return ONLY raw JSON (no markdown fences):
{
  "category": "<one of: contact_sharing, off_platform, external_payment, spam, scam, harassment, hate_speech, threat, fraud, safe>",
  "risk": "<one of: low, medium, high, critical>",
  "confidence": <number 0-100>,
  "reason": "<concise explanation>"
}`;

export function getChatModerationPrompt(input: {
  content: string;
  regexFindings?: { type: string; label: string; match: string }[];
}): string {
  const findingsBlock =
    input.regexFindings && input.regexFindings.length > 0
      ? `\nRegex pre-scan extracted these patterns (use as signals, not as the final verdict):\n${input.regexFindings
          .map((f) => `- ${f.label}: "${f.match}" (${f.type})`)
          .join('\n')}\n`
      : '\nRegex pre-scan found no contact/payment patterns.\n';

  return `
You are a Trust & Safety moderator for Zelance, an AI freelancing marketplace.
Analyze EVERY chat message for policy violations — including subtle off-platform intent
with no explicit contact details (e.g. "let's connect somewhere else", "pay me directly").

Detect: phone numbers, email addresses, WhatsApp, Telegram, Discord, LinkedIn, external payment
(crypto, UPI, PayPal, bank transfer), harassment, threats, hate speech, scams, spam,
off-platform communication attempts, and indirect requests to leave the platform.

Users must communicate and pay through Zelance. Any attempt to move conversation or payment
off-platform is a violation — even without sharing explicit contact info.

Classify as Safe when the message is normal project communication with no policy concerns.

${CHAT_JSON_SCHEMA}
${findingsBlock}
Message:
${input.content.slice(0, 4000)}
`.trim();
}

/** Clear cached prompts (useful for testing or hot-reload in dev) */
export function clearPromptCache(): void {
  promptCache.clear();
}
