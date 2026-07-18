"use client";

import React, { useState } from 'react';
import Image from '@/components/RemoteImage';
import { supabase } from '@/lib/supabaseClient';
import { uploadMarketplaceFileWithMetadata } from '@/lib/storage/upload';

type AttachmentMeta = {
  name: string;
  url: string;
  type?: string;
  size?: number;
  bucket?: string;
  path?: string;
};

interface SubmitRevisionModalProps {
  milestone: { id: string; title: string };
  collabId: string;
  isResubmission?: boolean;
  onClose: () => void;
  onSubmit: (payload: { description: string; attachments: AttachmentMeta[] }) => Promise<void>;
}

function formatFileSize(size?: number) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${Math.round((size / (1024 * 1024)) * 10) / 10} MB`;
}

export default function SubmitRevisionModal({
  milestone,
  collabId,
  isResubmission = false,
  onClose,
  onSubmit,
}: SubmitRevisionModalProps) {
  const [description, setDescription] = useState('');
  const [changesSummary, setChangesSummary] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullDescription = [description.trim(), changesSummary.trim() ? `Changes implemented:\n${changesSummary.trim()}` : '']
      .filter(Boolean)
      .join('\n\n');

    if (!fullDescription) {
      setError('Please describe the work completed for this submission.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in to submit.');

      const attachments: AttachmentMeta[] = [];
      for (const file of selectedFiles) {
        const uploaded = await uploadMarketplaceFileWithMetadata(user.id, `deliverables/${collabId}`, file);
        attachments.push({
          name: file.name,
          url: uploaded.publicUrl,
          type: file.type || 'application/octet-stream',
          size: file.size,
          bucket: uploaded.bucket,
          path: uploaded.path,
        });
      }

      await onSubmit({ description: fullDescription, attachments });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-black text-slate-900">
            {isResubmission ? 'Submit Revision' : 'Submit for Review'}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1">
            {milestone.title} — describe your work and attach deliverables before sending to the buyer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
              Work Completed *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you built, delivered, or completed for this milestone..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
              What Changed / Implemented
            </label>
            <textarea
              rows={3}
              value={changesSummary}
              onChange={(e) => setChangesSummary(e.target.value)}
              placeholder="Summarize key changes, fixes, or new features (optional but recommended for revisions)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
              Attach Files (Optional)
            </label>
            <input
              type="file"
              multiple
              accept="*/*"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
              className="w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:text-white"
            />
            <p className="mt-1.5 text-[10px] font-medium text-slate-400">
              Code, images, videos, ZIPs, PDFs, and documents supported.
            </p>
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {selectedFiles.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      {file.type.startsWith('image/') ? (
                        <Image src={URL.createObjectURL(file)} alt={file.name} fill sizes="40px" className="object-cover" />
                      ) : (
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v16z" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-800">{file.name}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !description.trim()}
              className="flex-1 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              {submitting ? 'Submitting...' : isResubmission ? 'Submit Revision' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
