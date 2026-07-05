"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  SUPPORT_ATTACHMENT_MAX_BYTES,
  SUPPORT_ATTACHMENT_MAX_FILES,
  SUPPORT_ATTACHMENT_TYPES,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  type SupportPriority,
} from '@/lib/support/constants';
import {
  mergeSupportContext,
  parseSupportContextFromPath,
  parseSupportContextFromSearchParams,
} from '@/lib/support/context';
import type { SupportAttachment } from '@/lib/support/types';

type SupportFormProps = {
  onSubmitted?: (ticketNumber: string) => void;
};

export default function SupportForm({ onSubmitted }: SupportFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const contextIds = useMemo(
    () =>
      mergeSupportContext(
        parseSupportContextFromSearchParams(searchParams),
        parseSupportContextFromPath(pathname)
      ),
    [pathname, searchParams]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: searchParams.get('category') || 'Other',
    subject: searchParams.get('subject') || '',
    description: searchParams.get('message') || searchParams.get('description') || '',
    priority: 'medium' as SupportPriority,
    transactionId: contextIds.transactionId || '',
    escrowId: contextIds.escrowId || '',
    projectId: contextIds.projectId || '',
    serviceId: contextIds.serviceId || '',
    aiAssetId: contextIds.aiAssetId || '',
  });

  React.useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth?redirect=/support');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      setFormData((prev) => ({
        ...prev,
        email: user.email || prev.email,
        name: profile?.full_name || user.user_metadata?.full_name || prev.name,
        transactionId: prev.transactionId || contextIds.transactionId || '',
        escrowId: prev.escrowId || contextIds.escrowId || '',
        projectId: prev.projectId || contextIds.projectId || '',
        serviceId: prev.serviceId || contextIds.serviceId || '',
        aiAssetId: prev.aiAssetId || contextIds.aiAssetId || '',
      }));
    }

    void loadUser();
  }, [contextIds, router]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const valid = selected.filter(
      (file) =>
        file.size <= SUPPORT_ATTACHMENT_MAX_BYTES &&
        SUPPORT_ATTACHMENT_TYPES.includes(file.type)
    );

    if (valid.length !== selected.length) {
      setError('Some files were skipped (invalid type or over 10MB).');
    } else {
      setError(null);
    }

    setFiles((prev) => [...prev, ...valid].slice(0, SUPPORT_ATTACHMENT_MAX_FILES));
    event.target.value = '';
  };

  const uploadAttachments = async (): Promise<SupportAttachment[]> => {
    const uploaded: SupportAttachment[] = [];

    for (const file of files) {
      const body = new FormData();
      body.append('file', file);

      const response = await fetch('/api/support/upload', {
        method: 'POST',
        body,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to upload ${file.name}`);
      }

      uploaded.push(data.attachment);
    }

    return uploaded;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const attachments = files.length > 0 ? await uploadAttachments() : [];

      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          description: formData.description,
          transactionId: formData.transactionId || undefined,
          escrowId: formData.escrowId || undefined,
          projectId: formData.projectId || undefined,
          serviceId: formData.serviceId || undefined,
          aiAssetId: formData.aiAssetId || undefined,
          attachments,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit ticket.');
      }

      onSubmitted?.(data.ticketNumber);
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col gap-6 relative z-10">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
          <input
            required
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Contact Email</label>
          <input
            required
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Issue Category</label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer"
          >
            {SUPPORT_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as SupportPriority })}
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer"
          >
            {SUPPORT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Subject</label>
        <input
          required
          type="text"
          placeholder="Briefly summarize the issue"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Detailed Description</label>
        <textarea
          required
          rows={6}
          placeholder="Provide full context, steps to reproduce, and expected outcome."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          ['transactionId', 'Transaction ID'],
          ['escrowId', 'Escrow ID'],
          ['projectId', 'Project ID'],
          ['serviceId', 'Service ID'],
          ['aiAssetId', 'AI Asset ID'],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">{label} (optional)</label>
            <input
              type="text"
              value={formData[key as keyof typeof formData] as string}
              onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Attach Screenshots / Files</label>
        <input
          type="file"
          multiple
          accept={SUPPORT_ATTACHMENT_TYPES.join(',')}
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-slate-900 file:text-white hover:file:bg-blue-600"
        />
        {files.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs font-medium text-slate-500">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`}>• {file.name}</li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 bg-slate-900 hover:bg-blue-600 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Support Ticket'}
      </button>

      <p className="text-center text-xs text-slate-400 font-medium">
        Already have a ticket?{' '}
        <Link href="/support/tickets" className="text-blue-600 hover:text-blue-700 font-bold">
          View My Tickets
        </Link>
      </p>
    </form>
  );
}
