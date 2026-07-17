"use client";

import React from 'react';
import Image from '@/components/RemoteImage';

export type SubmissionAttachment = {
  name: string;
  url: string;
  type?: string;
  size?: number;
};

function formatFileSize(size?: number) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${Math.round((size / (1024 * 1024)) * 10) / 10} MB`;
}

export default function SubmissionFilePreview({ file }: { file: SubmissionAttachment }) {
  const isImage = file.type?.startsWith('image/');
  const isVideo = file.type?.startsWith('video/');

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
        {isImage ? (
          <Image src={file.url} alt={file.name} fill sizes="48px" className="object-cover" />
        ) : isVideo ? (
          <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v16z" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black text-slate-800">{file.name}</p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
          {file.type?.split('/').pop() || 'File'} {formatFileSize(file.size)}
        </p>
      </div>
      <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-blue-600 group-hover:text-blue-700">
        Download
      </span>
    </a>
  );
}
