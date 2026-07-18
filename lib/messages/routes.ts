import { getWorkspaceHref, isVerifiedBuilder, type ProfileAccountFlags } from "@/lib/accountMode";

/** Primary inbox route for marketplace messaging (buyer vs builder workspace). */
export function getMessagesHref(profile: ProfileAccountFlags | null | undefined): string {
  return isVerifiedBuilder(profile) ? "/builder/inbox" : "/buyer/messages";
}

/** Founder admins without a builder account use the buyer inbox; builders keep builder inbox. */
export function getMessagesHrefForUser(
  profile: (ProfileAccountFlags & { is_admin?: boolean | null }) | null | undefined,
): string {
  return getMessagesHref(profile);
}

export { getWorkspaceHref };
