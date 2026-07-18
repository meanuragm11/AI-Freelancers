"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Badge from '@/components/founder/Badge';
import InternalNotesPanel from '@/components/founder/InternalNotesPanel';
import ModerationPanel from '@/components/founder/ModerationPanel';
import BusinessTimeline from '@/components/founder/BusinessTimeline';
import { money } from '@/lib/founder/utils';

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="text-sm text-slate-400 font-medium py-4 text-center">{label}</p>;
}

export default function FounderUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/founder/users/${userId}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load user');
      setData(payload);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const toggleFlag = async (field: string, value: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/founder/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to update user');
      setData((prev: any) => ({ ...prev, profile: payload.profile }));
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-xs font-black uppercase tracking-widest text-slate-400">Loading user...</div>;
  }

  if (error && !data) {
    return <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>;
  }

  if (!data) return null;

  const { profile, email, loginHistory, services, projects, transactions, reviews, supportTickets, disputes, withdrawals } = data;

  return (
    <div className="space-y-6">
      <Link href="/founder/users" className="inline-flex text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">
        ← Back to Users
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge label={profile.role || 'user'} tone="slate" />
              {profile.is_freelancer && <Badge label="Builder" tone="purple" />}
              {profile.is_admin && <Badge label="Founder/Admin" tone="rose" />}
              {profile.is_verified && <Badge label="Verified Builder" tone="green" />}
              {profile.verified_buyer && <Badge label="Verified Buyer" tone="green" />}
              {profile.requires_founder_publish_approval && (
                <Badge label="Needs Publish Approval" tone="amber" />
              )}
              {profile.editors_pick && <Badge label="Editor's Pick" tone="purple" />}
              {profile.account_status === 'banned' && <Badge label="Banned" tone="rose" />}
              {profile.account_status === 'suspended' && (
                <Badge
                  label={`Suspended · ${String(profile.suspension_type || '').replace('_', ' ')}`}
                  tone="amber"
                />
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{profile.full_name || 'Unnamed User'}</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">{email || 'No email on file'}</p>
            <p className="text-xs text-slate-400 font-mono mt-1">{profile.id}</p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => toggleFlag('editors_pick', !profile.editors_pick)}
              disabled={saving || !profile.is_freelancer}
              className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-violet-50 hover:bg-violet-100 text-violet-700 transition-colors disabled:opacity-50"
            >
              {profile.editors_pick ? "Revoke Editor's Pick" : "Grant Editor's Pick"}
            </button>
            <button
              onClick={() => toggleFlag('is_verified', !profile.is_verified)}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
            >
              {profile.is_verified ? 'Revoke Verification' : 'Grant Verification'}
            </button>
            {profile.requires_founder_publish_approval && (
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/founder/users/${userId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ approvePublishing: true }),
                    });
                    const payload = await res.json();
                    if (!res.ok) throw new Error(payload.error || 'Failed to approve publishing');
                    setData((prev: any) => ({ ...prev, profile: payload.profile }));
                  } catch (updateError: unknown) {
                    setError(updateError instanceof Error ? updateError.message : 'Failed to approve publishing');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors disabled:opacity-50"
              >
                Approve Unlimited Publishing
              </button>
            )}
            <button
              onClick={() => toggleFlag('is_admin', !profile.is_admin)}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors disabled:opacity-50"
            >
              {profile.is_admin ? 'Revoke Founder Access' : 'Grant Founder Access'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Joined</p>
            <p className="text-sm font-bold text-slate-700">{new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Last Active</p>
            <p className="text-sm font-bold text-slate-700">
              {loginHistory.lastActiveAt ? new Date(loginHistory.lastActiveAt).toLocaleString() : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Last Sign-In</p>
            <p className="text-sm font-bold text-slate-700">
              {loginHistory.lastSignInAt ? new Date(loginHistory.lastSignInAt).toLocaleString() : 'Unavailable'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">KYC Status</p>
            <p className="text-sm font-bold text-slate-700 capitalize">{profile.kyc_status || 'unverified'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Panel title={`AI Solutions (${services.length})`}>
            {services.length === 0 ? <EmptyRow label="No AI solutions published." /> : (
              <div className="space-y-2">
                {services.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{s.title}</p>
                      <p className="text-xs text-slate-400">{s.order_count} orders · {money(s.starting_price_usd)} starting</p>
                    </div>
                    <Badge label={s.status} tone={s.status === 'published' ? 'green' : 'slate'} />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={`Projects as Buyer (${projects.asBuyer.length})`}>
            {projects.asBuyer.length === 0 ? <EmptyRow label="No projects as a buyer." /> : (
              <div className="space-y-2">
                {projects.asBuyer.map((p: any) => (
                  <Link key={p.id} href={`/founder/payments?q=${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                    <p className="font-bold text-slate-900 truncate">{p.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-500">{money(p.escrow_amount_usd)}</span>
                      <Badge label={p.status} tone="blue" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={`Projects as Builder (${projects.asBuilder.length})`}>
            {projects.asBuilder.length === 0 ? <EmptyRow label="No projects as a builder." /> : (
              <div className="space-y-2">
                {projects.asBuilder.map((p: any) => (
                  <Link key={p.id} href={`/founder/payments?q=${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                    <p className="font-bold text-slate-900 truncate">{p.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-500">{money(p.escrow_amount_usd)}</span>
                      <Badge label={p.status} tone="blue" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={`Transactions (${transactions.length})`}>
            {transactions.length === 0 ? <EmptyRow label="No transactions." /> : (
              <div className="space-y-2">
                {transactions.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-slate-400">{t.order_id}</p>
                      <p className="text-sm font-bold text-slate-700 capitalize">{t.transaction_type.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-black text-slate-900">{money(t.amount_usd)}</span>
                      <Badge label={t.status} tone={t.status === 'completed' ? 'green' : 'amber'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={`Reviews (${reviews.length})`}>
            {reviews.length === 0 ? <EmptyRow label="No reviews yet." /> : (
              <div className="space-y-2">
                {reviews.map((r: any) => (
                  <div key={r.id} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-sm font-black text-amber-500">{'★'.repeat(Math.round(Number(r.rating)))}</p>
                    <p className="text-sm text-slate-600 mt-1">{r.review || 'No comment left.'}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <ModerationPanel
            profile={profile}
            onUpdated={(updatedProfile) => setData((prev: any) => ({ ...prev, profile: updatedProfile }))}
          />

          <Panel
            title={`Support History (${supportTickets.length})`}
            action={
              <Link href={`/founder/tickets?userId=${userId}`} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
                View All
              </Link>
            }
          >
            {supportTickets.length === 0 ? <EmptyRow label="No support tickets." /> : (
              <div className="space-y-2">
                {supportTickets.map((t: any) => (
                  <Link key={t.id} href={`/founder/tickets/${t.id}`} className="block px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                    <p className="text-xs font-mono font-bold text-slate-400">{t.ticket_number}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{t.subject}</p>
                    <Badge label={t.status} tone="blue" />
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={`Disputes (${disputes.length})`}>
            {disputes.length === 0 ? <EmptyRow label="No disputes on record." /> : (
              <div className="space-y-2">
                {disputes.map((d: any) => (
                  <Link key={d.id} href={`/founder/disputes/${d.id}`} className="block px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 hover:border-rose-300 transition-colors">
                    <p className="text-sm font-bold text-slate-900 truncate">{d.primary_reason}</p>
                    <Badge label={d.status} tone="rose" />
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {withdrawals.length > 0 && (
            <Panel title={`Withdrawals (${withdrawals.length})`}>
              <div className="space-y-2">
                {withdrawals.map((w: any) => (
                  <div key={w.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-mono text-xs font-bold text-slate-400">{w.reference_code}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">{money(w.amount_usd)}</span>
                      <Badge label={w.status} tone={w.status === 'completed' ? 'green' : 'amber'} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Business Timeline">
            <BusinessTimeline entityType="profile" entityId={userId} />
          </Panel>

          <InternalNotesPanel entityType="user" entityId={userId} />
        </div>
      </div>
    </div>
  );
}
