export type ProfileAccountFlags = {
  role?: string | null;
  is_freelancer?: boolean | null;
};

export type NavContext = {
  /** Buyer-side activity (purchases, posted projects, etc.) for dual-role detection. */
  hasBuyerActivity?: boolean;
};

/** Verified expert — completed Become an AI Expert onboarding. */
export function isVerifiedBuilder(profile: ProfileAccountFlags | null | undefined): boolean {
  return profile?.is_freelancer === true;
}

/** Buyer/marketplace route access for everyone who is not a verified builder. */
export function showsBuyerNav(profile: ProfileAccountFlags | null | undefined): boolean {
  return !isVerifiedBuilder(profile);
}

/** Verified expert who also uses buyer/marketplace features. */
export function isDualRoleUser(
  profile: ProfileAccountFlags | null | undefined,
  ctx?: NavContext,
): boolean {
  if (!isVerifiedBuilder(profile)) return false;
  return profile?.role === 'buyer' || Boolean(ctx?.hasBuyerActivity);
}

/** Primary nav: Discover Experts (buyers, guests, and dual-role users). */
export function showsDiscoverExpertsNav(
  profile: ProfileAccountFlags | null | undefined,
  ctx?: NavContext,
): boolean {
  if (!isVerifiedBuilder(profile)) return true;
  return isDualRoleUser(profile, ctx);
}

/** Primary nav: Become an AI Expert (buyers / non-verified only). */
export function showsBecomeExpertNav(profile: ProfileAccountFlags | null | undefined): boolean {
  return !isVerifiedBuilder(profile);
}

/** Workspace destination — builder dashboard for experts, buyer dashboard otherwise. */
export function getWorkspaceHref(profile: ProfileAccountFlags | null | undefined): string {
  return isVerifiedBuilder(profile) ? '/builder/dashboard' : '/buyer/dashboard';
}

/** Escrow ledger destination used by transactional email CTAs. */
export function getEscrowLedgerHref(profile: ProfileAccountFlags | null | undefined): string {
  return isVerifiedBuilder(profile) ? '/builder/dashboard' : '/buyer/billing';
}
