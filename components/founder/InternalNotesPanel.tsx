"use client";

import React, { useEffect, useState } from 'react';
import type { InternalNoteEntityType } from '@/lib/founder/constants';

type Note = {
  id: string;
  body: string;
  created_at: string;
  created_by: string | null;
  author?: { full_name: string | null } | null;
};

type InternalNotesPanelProps = {
  entityType: InternalNoteEntityType;
  entityId: string;
  order?: 'asc' | 'desc';
};

export default function InternalNotesPanel({ entityType, entityId, order = 'desc' }: InternalNotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch(
        `/api/founder/notes?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load notes');
      const loaded = (data.notes ?? []) as Note[];
      setNotes(
        order === 'asc'
          ? [...loaded].reverse()
          : loaded
      );
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/founder/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, note: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add note');
      setNotes((prev) => (order === 'asc' ? [...prev, data.note] : [data.note, ...prev]));
      setDraft('');
    } catch (addError: unknown) {
      setError(addError instanceof Error ? addError.message : 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
        </svg>
        <h3 className="text-xs font-black uppercase tracking-widest text-amber-700">
          Internal Notes — Never visible to customers
        </h3>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          placeholder="Add an internal note for the team..."
          className="w-full bg-white border border-amber-200 focus:border-amber-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all resize-none"
        />
        <button
          type="submit"
          disabled={submitting || !draft.trim()}
          className="self-end bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Add Note'}
        </button>
      </form>

      {error && <p className="text-xs font-bold text-rose-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-xs font-bold text-amber-700/60 uppercase tracking-widest">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs font-medium text-amber-700/60">No internal notes yet.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {notes.map((note) => (
            <div key={note.id} className="bg-white border border-amber-100 rounded-xl p-3">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.body}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/70 mt-2">
                {new Date(note.created_at).toLocaleString()} · {note.author?.full_name || 'Admin'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
