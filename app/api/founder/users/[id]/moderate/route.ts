import { NextResponse } from 'next/server';
import { logAdminAction, requireFounder, supabaseAdmin } from '@/lib/founder/server';
import { logBusinessEvent } from '@/lib/events/businessEvents';

type RouteParams = { params: Promise<{ id: string }> };

type ModerationAction = 'suspend' | 'lift_suspension' | 'ban' | 'unban';
type SuspensionType = 'soft' | 'financial_hold' | 'full';

const SUSPENSION_TYPES: SuspensionType[] = ['soft', 'financial_hold', 'full'];

// A permanent ban is implemented as a 100-year Supabase Auth ban, which is the
// documented pattern for revoking login indefinitely (there's no infinite option).
const PERMANENT_BAN_DURATION = '876000h';

export async function POST(req: Request, { params }: RouteParams) {
  const auth = await requireFounder();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = (await req.json()) as {
      action?: ModerationAction;
      suspensionType?: SuspensionType;
      reason?: string;
      expiresAt?: string | null;
    };

    const { action, suspensionType, reason, expiresAt } = body;

    if (!action || !['suspend', 'lift_suspension', 'ban', 'unban'].includes(action)) {
      return NextResponse.json({ error: 'A valid action is required' }, { status: 400 });
    }

    if (id === auth.actor.id) {
      return NextResponse.json({ error: 'You cannot moderate your own account' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin, is_freelancer, account_status, suspension_type, suspension_reason, suspended_at')
      .eq('id', id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (existing.is_admin) {
      return NextResponse.json(
        { error: 'Cannot moderate a founder/admin account. Revoke founder access first.' },
        { status: 400 }
      );
    }

    if ((action === 'suspend' || action === 'ban') && !reason?.trim()) {
      return NextResponse.json({ error: 'A reason is required for this action' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let updates: Record<string, unknown>;
    let auditAction: string;
    let shouldArchiveListings = false;

    if (action === 'suspend') {
      if (!suspensionType || !SUSPENSION_TYPES.includes(suspensionType)) {
        return NextResponse.json({ error: 'A valid suspensionType is required' }, { status: 400 });
      }
      updates = {
        account_status: 'suspended',
        suspension_type: suspensionType,
        suspended_at: now,
        suspended_by: auth.actor.id,
        suspension_reason: reason!.trim(),
        suspension_expires_at: expiresAt || null,
        reinstated_at: null,
        reinstated_by: null,
      };
      auditAction = `user.suspend.${suspensionType}`;
      shouldArchiveListings = suspensionType === 'soft' || suspensionType === 'full';
    } else if (action === 'lift_suspension') {
      if (existing.account_status !== 'suspended') {
        return NextResponse.json({ error: 'Account is not currently suspended' }, { status: 409 });
      }
      updates = {
        account_status: 'active',
        suspension_type: null,
        suspension_expires_at: null,
        reinstated_at: now,
        reinstated_by: auth.actor.id,
      };
      auditAction = 'user.suspension.lifted';
    } else if (action === 'ban') {
      updates = {
        account_status: 'banned',
        suspension_type: null,
        suspended_at: now,
        suspended_by: auth.actor.id,
        suspension_reason: reason!.trim(),
        suspension_expires_at: null,
        reinstated_at: null,
        reinstated_by: null,
      };
      auditAction = 'user.ban';
      shouldArchiveListings = true;
    } else {
      if (existing.account_status !== 'banned') {
        return NextResponse.json({ error: 'Account is not currently banned' }, { status: 409 });
      }
      updates = {
        account_status: 'active',
        suspension_type: null,
        suspension_expires_at: null,
        reinstated_at: now,
        reinstated_by: auth.actor.id,
      };
      auditAction = 'user.unban';
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    if (shouldArchiveListings) {
      const { error: archiveError } = await supabaseAdmin.rpc('archive_builder_published_listings', {
        p_builder_id: id,
      });
      if (archiveError) console.error('Failed to archive listings during moderation:', archiveError);
    }

    if (action === 'ban') {
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: PERMANENT_BAN_DURATION,
      });
      if (banError) console.error('Failed to revoke auth session during ban:', banError);
    } else if (action === 'unban') {
      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: 'none',
      });
      if (unbanError) console.error('Failed to lift auth ban:', unbanError);
    }

    await logAdminAction({
      actor: auth.actor,
      action: auditAction,
      targetType: 'user',
      targetId: id,
      metadata: {
        reason: reason?.trim() || null,
        suspensionType: suspensionType || null,
        expiresAt: expiresAt || null,
      },
      previousValue: {
        account_status: existing.account_status,
        suspension_type: existing.suspension_type,
      },
      newValue: {
        account_status: updated.account_status,
        suspension_type: updated.suspension_type,
      },
    });

    void logBusinessEvent({
      eventType: auditAction,
      entityType: 'profile',
      entityId: id,
      actorId: auth.actor.id,
      summary: `${auditAction.replace(/[._]/g, ' ')}${reason ? `: ${reason.trim()}` : ''}`,
      metadata: { suspensionType: suspensionType || null },
    });

    return NextResponse.json({ profile: updated });
  } catch (error: unknown) {
    console.error('Founder moderation error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
