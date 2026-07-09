export const CREATIVE_MIN_BUDGET_USD = 5;
export const PROFESSIONAL_MIN_BUDGET_USD = 10;

export const OTHER_CUSTOM_CATEGORY = 'Other (Custom)' as const;

export const CREATIVE_CATEGORIES = [
  'AI Image Generation',
  'AI Video Generation',
  'AI Avatar Generation',
  'AI Voice Generation',
  'AI Music Generation',
  'AI Logo Design',
  'AI Graphic Design',
  'AI Thumbnail Design',
  'AI Social Media Creatives',
  'Prompt Engineering',
  'AI Content Writing',
  'AI Copywriting',
  'AI Translation',
  'AI Resume / CV Writing',
  'AI Presentation Design',
] as const;

export const PROFESSIONAL_CATEGORIES = [
  'AI Chatbot Development',
  'AI Agent Development',
  'AI Automation',
  'Workflow Automation',
  'RAG Development',
  'LLM Integration',
  'AI SaaS Development',
  'AI Web Development',
  'AI Mobile App Development',
  'AI API Integration',
  'Data Analysis',
  'Data Engineering',
  'Machine Learning',
  'Deep Learning',
  'Computer Vision',
  'NLP',
  'Fine-tuning LLMs',
  'MLOps',
  'AI Consulting',
  'AI Strategy',
  'AI Training',
  'AI Research',
  'AI Product Development',
  'AI Testing',
  'AI Deployment',
  'AI Maintenance',
] as const;

export const PROJECT_CATEGORIES = [
  ...CREATIVE_CATEGORIES,
  ...PROFESSIONAL_CATEGORIES,
  OTHER_CUSTOM_CATEGORY,
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export type CategoryTier = 'creative' | 'professional' | 'other';

export function getCategoryTier(category: string | null | undefined): CategoryTier {
  if (!category) return 'professional';
  if ((CREATIVE_CATEGORIES as readonly string[]).includes(category)) return 'creative';
  if (category === OTHER_CUSTOM_CATEGORY) return 'other';
  return 'professional';
}

export function getCategoryMinBudgetUsd(category: string | null | undefined): number {
  const tier = getCategoryTier(category);
  return tier === 'creative' ? CREATIVE_MIN_BUDGET_USD : PROFESSIONAL_MIN_BUDGET_USD;
}

export function getBudgetValidationMessage(category: string | null | undefined): string {
  const min = getCategoryMinBudgetUsd(category);
  return `Projects in this category require a minimum budget of $${min}.`;
}

export function isOtherCustomCategory(category: string | null | undefined): boolean {
  return category === OTHER_CUSTOM_CATEGORY;
}

export function isValidCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  return (PROJECT_CATEGORIES as readonly string[]).includes(category);
}
