'use client';

type ActivityEvent = {
  id: string;
  type: string;
  label: string;
  date: string;
  detail?: string;
};

const TYPE_COLORS: Record<string, string> = {
  posted: 'bg-slate-400',
  published: 'bg-blue-500',
  proposal: 'bg-amber-500',
  accepted: 'bg-green-500',
  closed: 'bg-rose-400',
};

export function ProjectActivityTimeline({ events, loading }: { events: ActivityEvent[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center py-8">
        No activity yet
      </p>
    );
  }

  return (
    <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
      {events.map((event) => (
        <div key={event.id} className="relative pl-6">
          <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white ${TYPE_COLORS[event.type] ?? 'bg-slate-300'}`} />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {new Date(event.date).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
          <p className="text-sm font-black text-slate-900 mt-0.5">{event.label}</p>
          {event.detail && (
            <p className="text-xs font-medium text-slate-500 mt-0.5">{event.detail}</p>
          )}
        </div>
      ))}
    </div>
  );
}
