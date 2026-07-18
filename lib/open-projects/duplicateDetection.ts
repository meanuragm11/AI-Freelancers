function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeText(value).split(' ').filter(Boolean));
}

/** Jaccard similarity between two texts (0–1). */
export function descriptionSimilarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export type DuplicateProjectCandidate = {
  id: string;
  title: string;
  status: string;
  budget_min_usd: number | null;
  budget_max_usd: number | null;
  skills?: Array<{ skill: string }>;
  similarityScore: number;
  matchReasons: string[];
};

export type DuplicateCheckInput = {
  title: string;
  description: string;
  budget_min_usd?: number | null;
  budget_max_usd?: number | null;
  skills?: string[];
};

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  candidates: DuplicateProjectCandidate[];
  warning: string | null;
};

const DESCRIPTION_SIMILARITY_THRESHOLD = 0.75;

function budgetsMatch(
  aMin: number | null | undefined,
  aMax: number | null | undefined,
  bMin: number | null | undefined,
  bMax: number | null | undefined
): boolean {
  return aMin === bMin && aMax === bMax;
}

function skillsMatch(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const setB = new Set(b.map((s) => normalizeText(s)));
  const overlap = a.filter((s) => setB.has(normalizeText(s))).length;
  const ratio = overlap / Math.max(a.length, b.length);
  return ratio >= 0.8;
}

export function evaluateDuplicateProject(
  input: DuplicateCheckInput,
  existing: {
    id: string;
    title: string;
    description: string;
    status: string;
    budget_min_usd: number | null;
    budget_max_usd: number | null;
    skills?: Array<{ skill: string }>;
  }
): DuplicateProjectCandidate | null {
  const matchReasons: string[] = [];
  const normalizedTitle = normalizeText(input.title);
  const existingTitle = normalizeText(existing.title);

  const titleMatch = normalizedTitle === existingTitle;
  if (titleMatch) matchReasons.push('Same title');

  const similarity = descriptionSimilarity(input.description, existing.description);
  if (similarity >= DESCRIPTION_SIMILARITY_THRESHOLD) {
    matchReasons.push('Nearly identical description');
  }

  const budgetMatch = budgetsMatch(
    input.budget_min_usd,
    input.budget_max_usd,
    existing.budget_min_usd,
    existing.budget_max_usd
  );
  if (budgetMatch && input.budget_max_usd != null) {
    matchReasons.push('Same budget range');
  }

  const inputSkills = input.skills ?? [];
  const existingSkills = existing.skills?.map((s) => s.skill) ?? [];
  if (skillsMatch(inputSkills, existingSkills)) {
    matchReasons.push('Same required skills');
  }

  if (matchReasons.length < 2) return null;

  return {
    id: existing.id,
    title: existing.title,
    status: existing.status,
    budget_min_usd: existing.budget_min_usd,
    budget_max_usd: existing.budget_max_usd,
    skills: existing.skills,
    similarityScore: similarity,
    matchReasons,
  };
}

export function buildDuplicateWarning(candidates: DuplicateProjectCandidate[]): string | null {
  if (candidates.length === 0) return null;
  return (
    'This project looks very similar to one you already posted. ' +
    'Duplicate listings may be flagged. Review your existing project before publishing.'
  );
}

export function checkDuplicateProjects(
  input: DuplicateCheckInput,
  existingProjects: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    budget_min_usd: number | null;
    budget_max_usd: number | null;
    skills?: Array<{ skill: string }>;
  }>
): DuplicateCheckResult {
  const candidates = existingProjects
    .map((project) => evaluateDuplicateProject(input, project))
    .filter((c): c is DuplicateProjectCandidate => c !== null)
    .sort((a, b) => b.similarityScore - a.similarityScore);

  const warning = buildDuplicateWarning(candidates);

  return {
    isDuplicate: candidates.length > 0,
    candidates,
    warning,
  };
}
