"use client";

import React, { useState } from 'react';

type Profile = {
  id: string;
  is_admin?: boolean;
  account_status?: string | null;
  suspension_type?: string | null;
  suspension_reason?: string | null;
  suspended_at?: string | null;
  suspension_expires_at?: string | null;
  reinstated_at?: string | null;
};

type ModerationPanelProps = {
  profile: Profile;
  onUpdated: (profile: Profile) => void;
};

const SUSPENSION_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: 'soft', label: 'Soft Suspension', description: 'Cannot publish new listings or accept new work. Active projects continue normally.' },
  { value: 'financial_hold', label: 'Financial Hold', description: 'Withdrawals are frozen. Everything else on the account continues normally.' },
  { value: 'full', label: 'Full Suspension', description: 'All new marketplace activity is blocked: publishing, accepting work, withdrawals, and messaging.' },
];

export default function ModerationPanel({ profile, onUpdated }: ModerationPanelProps) {
  const [mode, setMode] = useState<'idle' | 'suspend' | 'ban'>('idle');
  const [suspensionType, setSuspensionType] = useState('soft');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (profile.is_admin) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Moderation</h3>
        <p className="text-sm text-slate-400 font-medium">Founder/admin accounts cannot be moderated from here.</p>
      </div>
    );
  }

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/founder/users/${profile.id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Moderation action failed');
      onUpdated(data.profile);
      setMode('idle');
      setReason('');
      setExpiresAt('');
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'Moderation action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const status = profile.account_status || 'active';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Moderation</h3>

      <div className="mb-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Status</p>
        <p className="text-sm font-black text-slate-900 capitalize">
          {status === 'suspended' ? `Suspended (${String(profile.suspension_type || '').replace('_', ' ')})` : status}
        </p>
        {profile.suspension_reason && (
          <p className="text-xs text-slate-500 mt-1">{profile.suspension_reason}</p>
        )}
        {profile.suspension_expires_at && (
          <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">
            Expires {new Date(profile.suspension_expires_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {error && <p className="text-xs font-bold text-rose-600 mb-3">{error}</p>}

      {status === 'banned' ? (
        <button
          onClick={() => void runAction('unban')}
          disabled={submitting}
          className="w-full px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Working...' : 'Lift Ban & Restore Access'}
        </button>
      ) : (
        <>
          {status === 'suspended' && (
            <button
              onClick={() => void runAction('lift_suspension')}
              disabled={submitting}
              className="w-full mb-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Working...' : 'Lift Suspension'}
            </button>
          )}

          {mode === 'idle' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setMode('suspend')}
                className="w-full px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
              >
                {status === 'suspended' ? 'Change Suspension Level' : 'Suspend Account'}
              </button>
              <button
                onClick={() => setMode('ban')}
                className="w-full px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
              >
                Permanently Ban
              </button>
            </div>
          )}

          {mode === 'suspend' && (
            <div className="mt-2 space-y-3 border-t border-slate-100 pt-4">
              <div className="space-y-2">
                {SUSPENSION_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`block px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                      suspensionType === opt.value ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="suspensionType"
                        value={opt.value}
                        checked={suspensionType === opt.value}
                        onChange={() => setSuspensionType(opt.value)}
                      />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-700">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 ml-5">{opt.description}</p>
                  </label>
                ))}
              </div>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
                placeholder="Reason for suspension (required, visible in audit log)..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm font-medium outline-none resize-none"
              />
              <input
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm font-medium outline-none"
              />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Optional expiry date</p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    void runAction('suspend', {
                      suspensionType,
                      reason,
                      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                    })
                  }
                  disabled={submitting || !reason.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Applying...' : 'Confirm Suspension'}
                </button>
                <button
                  onClick={() => setMode('idle')}
                  className="px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mode === 'ban' && (
            <div className="mt-2 space-y-3 border-t border-slate-100 pt-4">
              <p className="text-xs text-rose-600 font-bold">
                This disables login entirely and blocks all marketplace activity. Historical data is preserved.
              </p>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
                placeholder="Reason for ban (required, visible in audit log)..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-sm font-medium outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void runAction('ban', { reason })}
                  disabled={submitting || !reason.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Applying...' : 'Confirm Ban'}
                </button>
                <button
                  onClick={() => setMode('idle')}
                  className="px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
