"use client";

import React, { useEffect, useState } from 'react';

type BusinessEvent = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  collab_id: string | null;
  amount_usd: number | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: { id: string; full_name: string | null } | null;
};

type Props =
  | { entityType: string; entityId: string; collabId?: never; order?: 'asc' | 'desc' }
  | { collabId: string; entityType?: never; entityId?: never; order?: 'asc' | 'desc' };

export default function BusinessTimeline(props: Props) {
  const order = props.order ?? 'desc';
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if ('entityType' in props && props.entityType) {
      params.set('entityType', props.entityType);
      params.set('entityId', props.entityId);
    } else if ('collabId' in props && props.collabId) {
      params.set('collabId', props.collabId);
    }
    if (order === 'asc') params.set('order', 'asc');

    setLoading(true);
    fetch(`/api/founder/timeline?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load timeline');
        setEvents(data.events ?? []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load timeline'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [('entityType' in props ? props.entityType : ''), ('entityId' in props ? props.entityId : ''), ('collabId' in props ? props.collabId : ''), order]);

  if (loading) {
    return <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading timeline...</p>;
  }

  if (error) {
    return <p className="text-xs font-bold text-rose-600">{error}</p>;
  }

  if (events.length === 0) {
    return <p className="text-sm text-slate-400">No business events recorded yet.</p>;
  }

  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
      {events.map((event) => (
        <div key={event.id} className="border border-slate-100 rounded-xl p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              {event.event_type.replace(/[._]/g, ' ')}
            </span>
            <span className="text-[10px] font-bold text-slate-400">{new Date(event.created_at).toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-700 mt-1">{event.summary || 'No summary provided.'}</p>
          <div className="flex items-center gap-3 mt-1">
            {event.actor?.full_name && (
              <span className="text-[10px] font-bold text-slate-400">by {event.actor.full_name}</span>
            )}
            {event.amount_usd != null && (
              <span className="text-[10px] font-black text-slate-600">${Number(event.amount_usd).toLocaleString()}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
