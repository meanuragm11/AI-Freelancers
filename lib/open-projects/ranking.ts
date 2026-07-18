import {
  BROWSE_MAX_VERIFIED_RATIO,
  BROWSE_MIN_NEW_RATIO,
  FEATURED_ACTIVITY_LOOKBACK_DAYS,
  FEATURED_MAX_AGE_DAYS,
  FEATURED_MAX_VERIFIED_RATIO,
  FEATURED_MIN_NEW_RATIO,
  MAX_CONSECUTIVE_SAME_BUYER,
  QUALITY_SCORE_WEIGHTS,
} from './buyerPublishingConstants';

export type RankableProject = {
  id: string;
  buyer_id: string;
  category?: string | null;
  published_at?: string | null;
  activity_count?: number;
  proposal_count?: number;
  description?: string;
  budget_min_usd?: number | null;
  budget_max_usd?: number | null;
  monitoring_started_at?: string | null;
  buyer?: {
    verified_buyer?: boolean | null;
    location?: string | null;
    full_name?: string | null;
  } | null;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

export function computeProjectQualityScore(project: RankableProject): number {
  const weights = QUALITY_SCORE_WEIGHTS;

  const verificationScore = project.buyer?.verified_buyer ? 1 : 0.35;

  const activityCount = project.activity_count ?? 0;
  const recentActivityScore = clamp(activityCount / 3);

  const descLen = project.description?.trim().length ?? 0;
  let completenessScore = 0;
  if (descLen >= 180) completenessScore = 1;
  else if (descLen >= 120) completenessScore = 0.85;
  else if (descLen >= 60) completenessScore = 0.6;
  else completenessScore = 0.25;
  if (project.category) completenessScore = clamp(completenessScore + 0.1);

  let budgetScore = 0.4;
  if (project.budget_min_usd != null && project.budget_max_usd != null) {
    if (project.budget_max_usd >= project.budget_min_usd) {
      budgetScore = project.budget_max_usd >= 50 ? 1 : 0.75;
    }
  }

  const proposalCount = project.proposal_count ?? 0;
  const proposalScore = clamp(proposalCount / 5);

  const publishedDays = daysSince(project.published_at);
  let freshnessScore = 0.3;
  if (publishedDays != null) {
    if (publishedDays <= 7) freshnessScore = 1;
    else if (publishedDays <= 14) freshnessScore = 0.85;
    else if (publishedDays <= 30) freshnessScore = 0.65;
    else freshnessScore = 0.35;
  }

  return (
    verificationScore * weights.buyerVerification +
    recentActivityScore * weights.recentBuyerActivity +
    completenessScore * weights.projectCompleteness +
    budgetScore * weights.budgetRealism +
    proposalScore * weights.proposalActivity +
    freshnessScore * weights.projectFreshness
  );
}

export function isFeaturedFresh(project: RankableProject): boolean {
  const publishedDays = daysSince(project.published_at);
  if (publishedDays != null && publishedDays <= FEATURED_MAX_AGE_DAYS) return true;

  const activityDays = daysSince(project.monitoring_started_at);
  const hasRecentActivity =
    (project.activity_count ?? 0) > 0 &&
    activityDays != null &&
    activityDays <= FEATURED_ACTIVITY_LOOKBACK_DAYS;

  return hasRecentActivity;
}

export function filterFeaturedFresh<T extends RankableProject>(projects: T[]): T[] {
  return projects.filter(isFeaturedFresh);
}

function sortByQuality(projects: RankableProject[]): RankableProject[] {
  return shuffle(projects).sort(
    (a, b) => computeProjectQualityScore(b) - computeProjectQualityScore(a)
  );
}

function diversifyByCategory(projects: RankableProject[]): RankableProject[] {
  const byCategory = new Map<string, RankableProject[]>();
  for (const project of projects) {
    const key = project.category ?? 'uncategorized';
    const list = byCategory.get(key) ?? [];
    list.push(project);
    byCategory.set(key, list);
  }

  const categories = shuffle([...byCategory.keys()]);
  const result: RankableProject[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const category of categories) {
      const bucket = byCategory.get(category);
      if (!bucket?.length) continue;
      result.push(bucket.shift()!);
      added = true;
    }
  }
  return result;
}

function interleaveWithCaps(
  verified: RankableProject[],
  regular: RankableProject[],
  maxVerifiedRatio: number,
  minNewRatio: number,
  limit: number
): RankableProject[] {
  const maxVerified = Math.floor(limit * maxVerifiedRatio);
  const minNew = Math.ceil(limit * minNewRatio);

  let verifiedPool = diversifyByCategory(sortByQuality(verified));
  let regularPool = diversifyByCategory(sortByQuality(regular));

  const result: RankableProject[] = [];
  const usedIds = new Set<string>();
  let consecutiveBuyer: string | null = null;
  let consecutiveCount = 0;
  let verifiedTaken = 0;
  let regularTaken = 0;

  const takeFrom = (pool: RankableProject[]): RankableProject | null => {
    for (let i = 0; i < pool.length; i += 1) {
      const candidate = pool[i];
      if (usedIds.has(candidate.id)) {
        pool.splice(i, 1);
        i -= 1;
        continue;
      }
      if (
        candidate.buyer_id === consecutiveBuyer &&
        consecutiveCount >= MAX_CONSECUTIVE_SAME_BUYER
      ) {
        continue;
      }
      pool.splice(i, 1);
      return candidate;
    }
    return null;
  };

  while (result.length < limit && (verifiedPool.length || regularPool.length)) {
    const remaining = limit - result.length;
    const newStillNeeded = Math.max(0, minNew - regularTaken);
    const verifiedCapRemaining = Math.max(0, maxVerified - verifiedTaken);

    let preferRegular =
      newStillNeeded >= remaining ||
      (verifiedCapRemaining === 0 && regularPool.length > 0) ||
      (regularPool.length > 0 && verifiedPool.length === 0);

    if (!preferRegular && verifiedCapRemaining === 0) {
      preferRegular = true;
    }

    if (
      !preferRegular &&
      verifiedTaken < maxVerified &&
      verifiedPool.length > 0 &&
      regularTaken >= minNew
    ) {
      preferRegular = false;
    }

    const primary = preferRegular ? regularPool : verifiedPool;
    const secondary = preferRegular ? verifiedPool : regularPool;

    let picked = takeFrom(primary);
    if (!picked) picked = takeFrom(secondary);
    if (!picked) picked = takeFrom([...regularPool, ...verifiedPool]);
    if (!picked) break;

    result.push(picked);
    usedIds.add(picked.id);

    if (picked.buyer_id === consecutiveBuyer) consecutiveCount += 1;
    else {
      consecutiveBuyer = picked.buyer_id;
      consecutiveCount = 1;
    }

    if (picked.buyer?.verified_buyer) verifiedTaken += 1;
    else regularTaken += 1;
  }

  if (result.length < limit) {
    const filler = sortByQuality([...verifiedPool, ...regularPool]).filter(
      (project) => !usedIds.has(project.id)
    );
    for (const project of filler) {
      if (result.length >= limit) break;
      result.push(project);
    }
  }

  return result;
}

export function rankFeaturedProjects<T extends RankableProject>(
  projects: T[],
  limit: number
): T[] {
  const fresh = filterFeaturedFresh(projects);
  const verified = fresh.filter((p) => p.buyer?.verified_buyer);
  const regular = fresh.filter((p) => !p.buyer?.verified_buyer);
  return interleaveWithCaps(
    verified,
    regular,
    FEATURED_MAX_VERIFIED_RATIO,
    FEATURED_MIN_NEW_RATIO,
    limit
  ) as T[];
}

export function rankBrowseProjects<T extends RankableProject>(
  projects: T[],
  limit: number
): T[] {
  const verified = projects.filter((p) => p.buyer?.verified_buyer);
  const regular = projects.filter((p) => !p.buyer?.verified_buyer);
  return interleaveWithCaps(
    verified,
    regular,
    BROWSE_MAX_VERIFIED_RATIO,
    BROWSE_MIN_NEW_RATIO,
    limit
  ) as T[];
}

export function ensureNonEmptyFeatured<T extends RankableProject>(
  ranked: T[],
  pool: T[],
  limit: number
): T[] {
  if (ranked.length >= limit) return ranked.slice(0, limit);
  const freshPool = filterFeaturedFresh(pool);
  const used = new Set(ranked.map((p) => p.id));
  const filler = sortByQuality(freshPool.filter((p) => !used.has(p.id))) as T[];
  return [...ranked, ...filler].slice(0, Math.max(limit, ranked.length));
}
