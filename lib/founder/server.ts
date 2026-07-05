import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type FounderActor = {
  id: string;
  email: string;
  fullName: string | null;
};

export type FounderAuthResult =
  | { ok: true; actor: FounderActor }
  | { ok: false; response: NextResponse };

/**
 * Server-side gate for every /api/founder/* route. Confirms there is an
 * authenticated Supabase session AND that the underlying profile has
 * is_admin = true. Never trust a client-supplied role/flag for this check.
 */
export async function requireFounder(): Promise<FounderAuthResult> {
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

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile?.is_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return {
    ok: true,
    actor: {
      id: user.id,
      email: user.email ?? '',
      fullName: profile.full_name ?? null,
    },
  };
}

export type AuditLogInput = {
  actor: FounderActor;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  /** State of the record before the mutation, for a structured before/after diff. */
  previousValue?: Record<string, unknown> | null;
  /** State of the record after the mutation, for a structured before/after diff. */
  newValue?: Record<string, unknown> | null;
};

async function requestIpAddress(): Promise<string | null> {
  const headerStore = await headers();
  return (
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerStore.get('x-real-ip') ||
    null
  );
}

/**
 * Records an immutable trail of every founder/admin mutation for auditing.
 * Best-effort: a logging failure never blocks the underlying admin action,
 * but is surfaced in server logs for investigation.
 */
export async function logAdminAction({
  actor,
  action,
  targetType,
  targetId,
  metadata,
  previousValue,
  newValue,
}: AuditLogInput) {
  try {
    const ipAddress = await requestIpAddress();

    await supabaseAdmin.from('admin_audit_log').insert({
      actor_id: actor.id,
      actor_email: actor.email,
      action,
      target_type: targetType,
      target_id: targetId ?? null,
      metadata: metadata ?? {},
      previous_value: previousValue ?? null,
      new_value: newValue ?? null,
      ip_address: ipAddress,
    });
  } catch (auditError) {
    console.error('Failed to write admin audit log entry:', auditError);
  }
}

