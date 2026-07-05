import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { SupportAttachment } from './types';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getProfileName(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();

  return data?.full_name || 'Zelance User';
}

export function normalizeAttachments(value: unknown): SupportAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is SupportAttachment =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as SupportAttachment).name === 'string' &&
      typeof (item as SupportAttachment).url === 'string'
  );
}

export function ticketDetailPath(ticketNumber: string) {
  return `/support/tickets/${encodeURIComponent(ticketNumber)}`;
}
