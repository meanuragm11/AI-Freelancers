"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SectionHeader from '@/components/founder/SectionHeader';
import Badge from '@/components/founder/Badge';

type ModerationStats = { pending: number; flagged: number; blocked: number; reviewed: number };

type ChatItem = {
  id: string;
  message_id: string;
  collab_id: string;
  sender_id: string;
  content_snapshot: string;
  risk_score: number;
  confidence_score: number;
  category: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  sender?: { full_name?: string | null };
};

type ProjectItem = {
  id: string;
  project_id: string;
  buyer_id: string;
  title_snapshot: string;
  description_snapshot?: string;
  risk_score: number;
  confidence_score: number;
  category: string | null;
  domain?: string | null;
  recommended_action?: string | null;
  safe?: boolean | null;
  reason: string | null;
  status: string;
  created_at: string;
  buyer?: { full_name?: string | null };
};

type ProposalItem = {
  id: string;
  proposal_id: string;
  builder_id: string;
  cover_letter_snapshot: string;
  risk_score: number;
  confidence_score: number;
  category: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  builder?: { full_name?: string | null };
};

type UserItem = {
  user_id: string;
  trust_score: number;
  offence_count: number;
  last_offence_at: string | null;
  profile?: { full_name?: string | null; account_status?: string };
};

type ModerationData = {
  chats: ChatItem[];
  projects: ProjectItem[];
  proposals: ProposalItem[];
  users: UserItem[];
  stats: ModerationStats;
};

function statusTone(status: string): 'amber' | 'rose' | 'green' | 'slate' | 'blue' {
  if (status === 'flagged') return 'amber';
  if (status === 'blocked') return 'rose';
  if (status === 'approved') return 'green';
  if (status === 'reviewed') return 'blue';
  return 'slate';
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 85 ? 'bg-rose-500' : score >= 60 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-xs font-black text-slate-700">{score}</span>
    </div>
  );
}

function ActionButtons({
  targetType,
  targetId,
  moderationRecordId,
  userId,
  onAction,
}: {
  targetType: string;
  targetId: string;
  moderationRecordId: string;
  userId?: string;
  onAction: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const act = async (action: string) => {
    const reason = window.prompt(`Reason for ${action}:`);
    if (reason === null) return;
    setLoading(action);
    try {
      const res = await fetch('/api/founder/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetType, targetId, moderationRecordId, reason }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Action failed');
      onAction();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {(['approve', 'dismiss', 'remove_content', 'restore_content', 'warn'] as const).map((action) => (
        <button
          key={action}
          onClick={() => void act(action)}
          disabled={!!loading}
          className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50"
        >
          {loading === action ? '...' : action.replace('_', ' ')}
        </button>
      ))}
      {userId && (
        <>
          <Link href={`/founder/users/${userId}`} className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-50 hover:bg-blue-100 text-blue-700">
            User
          </Link>
          <button
            onClick={() => void act('suspend')}
            disabled={!!loading}
            className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-50 hover:bg-amber-100 text-amber-700 disabled:opacity-50"
          >
            Suspend
          </button>
        </>
      )}
    </div>
  );
}

export default function FounderModerationPage() {
  const [data, setData] = useState<ModerationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'chat' | 'project' | 'proposal' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [expandedCollab, setExpandedCollab] = useState<string | null>(null);
  const [conversation, setConversation] = useState<{ messages: unknown[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== 'all') params.set('type', tab);
      if (statusFilter) params.set('status', statusFilter);
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/founder/moderation?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load moderation queue');
      setData(payload);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const openConversation = async (collabId: string) => {
    if (expandedCollab === collabId) {
      setExpandedCollab(null);
      setConversation(null);
      return;
    }
    setExpandedCollab(collabId);
    const res = await fetch(`/api/founder/moderation/conversations/${collabId}`);
    const payload = await res.json();
    if (res.ok) setConversation(payload);
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Trust & Safety"
        title="AI Moderation Queue"
        description="Review AI-flagged chats, open projects, and proposals. Gemini 2.5 Flash scores every item for risk, confidence, and category."
      />

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending', value: data.stats.pending, tone: 'slate' as const },
            { label: 'Flagged', value: data.stats.flagged, tone: 'amber' as const },
            { label: 'Blocked', value: data.stats.blocked, tone: 'rose' as const },
            { label: 'Reviewed', value: data.stats.reviewed, tone: 'blue' as const },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {(['all', 'chat', 'project', 'proposal', 'user'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                tab === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-100 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="flagged">Flagged</option>
          <option value="blocked">Blocked</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reason, category, content..."
          className="flex-1 min-w-[200px] bg-slate-100 rounded-xl px-4 py-2 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => void load()}
          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-blue-600 transition-colors"
        >
          Search
        </button>
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
          Loading moderation queue...
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          {(tab === 'all' || tab === 'chat') && data.chats.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Flagged Chats ({data.chats.length})</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {data.chats.map((item) => (
                  <div key={item.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{item.sender?.full_name ?? item.sender_id.slice(0, 8)}</p>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.content_snapshot}</p>
                        <p className="text-xs text-slate-400 mt-1">{item.reason}</p>
                      </div>
                      <div className="shrink-0 text-right space-y-2">
                        <Badge label={item.status} tone={statusTone(item.status)} />
                        <RiskBar score={item.risk_score} />
                        <p className="text-[10px] text-slate-400">conf: {item.confidence_score}%</p>
                        {item.category && <Badge label={item.category} tone="slate" />}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 mt-3">
                      <button
                        onClick={() => void openConversation(item.collab_id)}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        {expandedCollab === item.collab_id ? 'Hide conversation' : 'Open full conversation'}
                      </button>
                      <ActionButtons
                        targetType="chat"
                        targetId={item.message_id}
                        moderationRecordId={item.id}
                        userId={item.sender_id}
                        onAction={load}
                      />
                    </div>
                    {expandedCollab === item.collab_id && conversation && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-xl max-h-64 overflow-y-auto space-y-2">
                        {(conversation.messages as { id: string; content: string; sender?: { full_name?: string }; created_at: string; is_hidden?: boolean }[]).map((msg) => (
                          <div key={msg.id} className={`text-sm ${msg.is_hidden ? 'opacity-50 line-through' : ''}`}>
                            <span className="font-bold text-slate-700">{msg.sender?.full_name ?? 'User'}:</span>{' '}
                            <span className="text-slate-600">{msg.content}</span>
                            <span className="text-[10px] text-slate-400 ml-2">{new Date(msg.created_at).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(tab === 'all' || tab === 'project') && data.projects.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Project Domain & Safety Review ({data.projects.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {data.projects.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/projects/${item.project_id}`} className="font-bold text-slate-900 hover:text-blue-600">
                        {item.title_snapshot}
                      </Link>
                      <p className="text-xs text-slate-400 mt-1">by {item.buyer?.full_name ?? item.buyer_id.slice(0, 8)} · {new Date(item.created_at).toLocaleString()}</p>
                      {item.description_snapshot && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-3">{item.description_snapshot}</p>
                      )}
                      <p className="text-sm text-slate-600 mt-1">{item.reason}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.domain && <Badge label={item.domain.replace(/_/g, ' ')} tone="blue" />}
                        {item.recommended_action && <Badge label={item.recommended_action.replace(/_/g, ' ')} tone="amber" />}
                        {item.safe === false && <Badge label="unsafe" tone="rose" />}
                      </div>
                    </div>
                    <div className="shrink-0 space-y-2 text-right">
                      <Badge label={item.status} tone={statusTone(item.status)} />
                      <p className="text-[10px] text-slate-400">domain conf: {item.confidence_score}%</p>
                      <RiskBar score={item.risk_score} />
                      {item.category && <Badge label={item.category} tone="slate" />}
                      <ActionButtons targetType="project" targetId={item.project_id} moderationRecordId={item.id} userId={item.buyer_id} onAction={load} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(tab === 'all' || tab === 'proposal') && data.proposals.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Flagged Proposals ({data.proposals.length})</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {data.proposals.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{item.builder?.full_name ?? item.builder_id.slice(0, 8)}</p>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-3">{item.cover_letter_snapshot}</p>
                      <p className="text-xs text-slate-400 mt-1">{item.reason}</p>
                    </div>
                    <div className="shrink-0 space-y-2 text-right">
                      <Badge label={item.status} tone={statusTone(item.status)} />
                      <RiskBar score={item.risk_score} />
                      {item.category && <Badge label={item.category} tone="slate" />}
                      <ActionButtons targetType="proposal" targetId={item.proposal_id} moderationRecordId={item.id} userId={item.builder_id} onAction={load} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(tab === 'all' || tab === 'user') && data.users.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">User Trust Scores ({data.users.length})</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {data.users
                  .filter((u) => u.offence_count > 0 || u.trust_score < 100)
                  .map((item) => (
                    <Link
                      key={item.user_id}
                      href={`/founder/users/${item.user_id}`}
                      className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{item.profile?.full_name ?? item.user_id.slice(0, 8)}</p>
                        <p className="text-xs text-slate-400">{item.offence_count} offences · {item.profile?.account_status ?? 'active'}</p>
                      </div>
                      <RiskBar score={100 - item.trust_score} />
                    </Link>
                  ))}
              </div>
            </section>
          )}

          {data.chats.length === 0 && data.projects.length === 0 && data.proposals.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm font-medium text-slate-400">
              No moderation items match your filters. The AI engine runs asynchronously on every publish, proposal, and chat message.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
