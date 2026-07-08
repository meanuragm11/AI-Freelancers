export type ProfileAccountFlags = {
  role?: string | null;
  is_freelancer?: boolean | null;
};

/** Verified expert — completed Become AI Expert onboarding. */
export function isVerifiedBuilder(profile: ProfileAccountFlags | null | undefined): boolean {
  return profile?.is_freelancer === true;
}

/** Buyer/marketplace nav for everyone who is not a verified builder. */
export function showsBuyerNav(profile: ProfileAccountFlags | null | undefined): boolean {
  return !isVerifiedBuilder(profile);
}
