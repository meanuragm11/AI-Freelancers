import { redirect } from 'next/navigation';

import { getWorkspaceHref } from '@/lib/accountMode';
import { resolveWorkspaceProfile } from '@/lib/workspace/resolveWorkspaceProfile';

export default async function WorkspaceRedirectPage() {
  const { userId, profile } = await resolveWorkspaceProfile();

  if (!userId) {
    redirect('/auth?redirect=/workspace');
  }

  redirect(getWorkspaceHref(profile));
}
