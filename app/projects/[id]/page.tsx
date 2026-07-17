'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    if (!id) return;

    fetch(`/api/projects/${id}`).then((r) => r.json()).then((d) => setProject(d.project)).finally(() => setLoading(false));
    fetch(`/api/projects/${id}/questions`).then((r) => r.json()).then((d) => setQuestions(d.questions ?? []));
  }, [id]);


  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { router.push('/auth'); return; }
    await fetch(`/api/projects/${id}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    setQuestion('');
    const res = await fetch(`/api/projects/${id}/questions`);
    const d = await res.json();
    setQuestions(d.questions ?? []);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Loading…</div>;
  if (!project) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-bold text-slate-500">Project not found</div>;

  const skills = project.skills?.map((s: { skill: string }) => s.skill) ?? [];
  const canPropose = project.status === 'published' && userId && userId !== project.buyer_id;

  const postedAt = project.published_at
    ? (() => {
        const days = Math.floor((Date.now() - new Date(project.published_at).getTime()) / 86400000);
        if (days <= 0) return 'Posted today';
        if (days === 1) return 'Posted 1 day ago';
        if (days < 7) return `Posted ${days} days ago`;
        const weeks = Math.floor(days / 7);
        if (weeks < 5) return `Posted ${weeks} week${weeks === 1 ? '' : 's'} ago`;
        return `Posted ${new Date(project.published_at).toLocaleDateString()}`;
      })()
    : null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/projects" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-4 inline-block">← Browse Projects</Link>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm mb-6">
          {project.is_featured && <span className="inline-block mb-3 px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-md">Featured</span>}
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">{project.title}</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">
            {project.category} · {project.experience_level} · {project.proposal_count ?? 0} proposals
            {postedAt ? ` · ${postedAt}` : ''}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 p-4 bg-slate-50 rounded-xl">
            <div><p className="text-[9px] font-black uppercase text-slate-400">Budget</p><p className="text-sm font-black">${project.budget_min_usd?.toLocaleString()} – ${project.budget_max_usd?.toLocaleString()}</p></div>
            <div><p className="text-[9px] font-black uppercase text-slate-400">Duration</p><p className="text-sm font-black">{project.expected_duration_days ?? '—'} days</p></div>
            <div><p className="text-[9px] font-black uppercase text-slate-400">Payment</p><p className="text-sm font-black capitalize">{project.payment_type?.replace('_', ' ')}</p></div>
          </div>

          <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap mb-6">{project.description}</p>

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {skills.map((s: string) => <span key={s} className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-full">{s}</span>)}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {canPropose && (
              <Link href={`/builder/proposals/new?project=${id}`} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">Submit Proposal</Link>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 mb-4">Questions & Answers</h2>
          {questions.length === 0 && <p className="text-sm text-slate-400 mb-4">No questions yet.</p>}
          <div className="space-y-4 mb-6">
            {questions.map((q) => (
              <div key={q.id} className="border-b border-slate-100 pb-4">
                <p className="text-sm font-bold text-slate-900">{q.question}</p>
                {q.answer ? <p className="text-sm text-slate-600 mt-2 pl-4 border-l-2 border-blue-200">{q.answer}</p> : <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Awaiting answer</p>}
              </div>
            ))}
          </div>
          {userId && (
            <form onSubmit={submitQuestion} className="flex gap-3">
              <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question…" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" required />
              <button type="submit" className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Ask</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
