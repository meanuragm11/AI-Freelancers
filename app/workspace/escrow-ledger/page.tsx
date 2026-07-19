import { redirect } from 'next/navigation';

import { getEscrowLedgerHref } from '@/lib/accountMode';
import { resolveWorkspaceProfile } from '@/lib/workspace/resolveWorkspaceProfile';

export default async function EscrowLedgerRedirectPage() {
  const { userId, profile } = await resolveWorkspaceProfile();

  if (!userId) {
    redirect('/auth?redirect=/workspace/escrow-ledger');
  }

  redirect(getEscrowLedgerHref(profile));
}
