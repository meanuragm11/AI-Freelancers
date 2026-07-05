"use client";

import React, { useEffect, useState } from 'react';
import SectionHeader from '@/components/founder/SectionHeader';
import Badge from '@/components/founder/Badge';

type AuditEntry = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export default function FounderAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetType, setTargetType] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (targetType) params.set('targetType', targetType);
    fetch(`/api/founder/audit?${params.toString()}`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load audit log');
        setEntries(payload.entries);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Failed to load audit log'))
      .finally(() => setLoading(false));
  }, [targetType]);

  return (
    <div>
      <SectionHeader
        eyebrow="Accountability"
        title="Audit Log"
        description="Every founder/admin mutation across the platform: status changes, replies, flag toggles, and dispute resolutions."
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex flex-wrap gap-3">
        <select
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className="bg-slate-100 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">All Target Types</option>
          <option value="support_ticket">Support Ticket</option>
          <option value="dispute">Dispute</option>
          <option value="user">User</option>
          <option value="system_alert">System Alert</option>
        </select>
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
          Loading audit trail...
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {entries.length === 0 ? (
            <p className="p-10 text-center text-sm font-medium text-slate-400">No admin actions recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm">
                      {entry.actor_email || 'Unknown actor'}{' '}
                      <span className="font-medium text-slate-400">performed</span>{' '}
                      <span className="font-mono text-blue-600">{entry.action}</span>
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      {entry.target_type}
                      {entry.target_id ? ` · ${entry.target_id}` : ''} · {new Date(entry.created_at).toLocaleString()}
                      {entry.ip_address ? ` · ${entry.ip_address}` : ''}
                    </p>
                    {(entry.previous_value || entry.new_value) && (
                      <p className="text-xs text-slate-500 font-mono mt-1 truncate">
                        {entry.previous_value && `before: ${JSON.stringify(entry.previous_value)}`}
                        {entry.previous_value && entry.new_value && '  →  '}
                        {entry.new_value && `after: ${JSON.stringify(entry.new_value)}`}
                      </p>
                    )}
                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                      <p className="text-xs text-slate-400 font-mono mt-1 truncate">{JSON.stringify(entry.metadata)}</p>
                    )}
                  </div>
                  <Badge label={entry.target_type} tone="slate" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
