"use client";

import React, { useEffect, useState } from 'react';
import SectionHeader from '@/components/founder/SectionHeader';
import Badge from '@/components/founder/Badge';

const STATUS_TONE: Record<string, 'green' | 'amber' | 'rose' | 'slate'> = {
  operational: 'green',
  degraded: 'amber',
  down: 'rose',
  not_configured: 'slate',
  unknown: 'slate',
};

function HealthCard({ label, status, detail }: { label: string; status: string; detail?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <Badge label={status} tone={STATUS_TONE[status] || 'slate'} />
      </div>
      {detail && <p className="text-sm text-slate-500 font-medium mt-2">{detail}</p>}
    </div>
  );
}

export default function FounderSystemPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/founder/system');
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load system health');
      setData(payload);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resolveAlert = async (alertId: string) => {
    await fetch('/api/founder/system', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId, status: 'resolved' }),
    });
    void load();
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Infrastructure"
        title="System Health"
        description="Email delivery, notifications, storage, and payment pipeline health. Stubbed gracefully where no data source exists yet."
      />

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
          Checking systems...
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>
      )}

      {!loading && !error && data && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <HealthCard label="Email Delivery" status={data.email.status} detail={`${data.email.sentToday} sent today`} />
            <HealthCard label="Notifications" status={data.notifications.status} detail={`${data.notifications.unread} unread total`} />
            <HealthCard label="Payment Pipeline" status={data.payments.status} detail={`${data.payments.failuresToday} failure(s) today`} />
            <HealthCard label="Withdrawals" status={data.withdrawals.status} detail={`${data.withdrawals.failedCount} failed total`} />
            <HealthCard label="Storage Buckets" status={data.storage.status} detail={`${data.storage.buckets.length} bucket(s) configured`} />
            <HealthCard label="Background Jobs" status={data.backgroundJobs.status} detail={data.backgroundJobs.note} />
            <HealthCard label="API Error Log" status={data.apiErrors.status} detail={data.apiErrors.note} />
            <HealthCard label="Failed Uploads" status={data.failedUploads.status} detail={data.failedUploads.note} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Storage Buckets</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.storage.buckets.map((bucket: any) => (
                <div key={bucket.id} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-sm">{bucket.name}</span>
                  <Badge label={bucket.public ? 'public' : 'private'} tone={bucket.public ? 'amber' : 'slate'} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">System Alerts</h3>
            {data.systemAlerts.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium py-6 text-center">No system alerts recorded.</p>
            ) : (
              <div className="space-y-2">
                {data.systemAlerts.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{alert.message}</p>
                      <p className="text-xs text-slate-400 font-medium">{alert.alert_type} · {new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge label={alert.risk_level} tone={alert.risk_level === 'critical' ? 'rose' : 'amber'} />
                      <Badge label={alert.status} tone={alert.status === 'resolved' ? 'green' : 'slate'} />
                      {alert.status !== 'resolved' && (
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
