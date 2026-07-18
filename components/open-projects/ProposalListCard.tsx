'use client';

import Image from '@/components/RemoteImage';
import Link from 'next/link';
import { pickDisplayableImageUrl } from '@/lib/images';
import { formatBuilderName } from '@/lib/display/formatBuilderName';
import RecognitionBadge from '@/components/arena/RecognitionBadge';
import type { RecognitionBadgeGrant } from '@/lib/arena/badges/types';

type Proposal = {
  id: string;
  builder_id: string;
  cover_letter: string;
  proposed_amount_usd: number;
  proposed_duration_days?: number | null;
  status: string;
  created_at: string;
  builder?: {
    full_name?: string;
    avatar_url?: string | null;
    headline?: string;
    average_rating?: number;
    is_verified?: boolean;
  };
};

const STATUS_STYLES: Record<string, string> = {
  accepted: 'bg-green-100 text-green-700',
  shortlisted: 'bg-blue-100 text-blue-700',
  rejected: 'bg-slate-100 text-slate-500',
  submitted: 'bg-amber-100 text-amber-700',
};

type Props = {
  proposal: Proposal;
  projectStatus?: string;
  onHire?: (proposal: Proposal) => void;
  onReject?: (proposalId: string) => void;
  onShortlist?: (proposalId: string) => void;
  onMessage?: (proposal: Proposal) => void;
  messaging?: boolean;
  recognitionBadge?: RecognitionBadgeGrant | null;
};

export function ProposalListCard({
  proposal,
  projectStatus,
  onHire,
  onReject,
  onShortlist,
  onMessage,
  messaging,
  recognitionBadge = null,
}: Props) {
  const builder = proposal.builder ?? {};
  const builderDisplayName = formatBuilderName(builder.full_name);
  const canAct = projectStatus === 'published' && ['submitted', 'shortlisted'].includes(proposal.status);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex items-center gap-3 md:w-48 shrink-0">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 relative shrink-0">
            {builder.avatar_url && pickDisplayableImageUrl(builder.avatar_url) && (
              <Image
                src={pickDisplayableImageUrl(builder.avatar_url)!}
                fill
                sizes="44px"
                className="object-cover"
                alt=""
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 truncate flex items-center gap-1.5 flex-wrap">
              {builderDisplayName}
              {recognitionBadge && <RecognitionBadge badge={recognitionBadge} size="sm" />}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{builder.headline}</p>
            {builder.average_rating != null && builder.average_rating > 0 && (
              <p className="text-[10px] font-bold text-amber-600">★ {Number(builder.average_rating).toFixed(1)}</p>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 mb-2">
            <p className="text-lg font-black text-slate-900">${Number(proposal.proposed_amount_usd).toLocaleString()}</p>
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0 ${STATUS_STYLES[proposal.status] ?? 'bg-slate-100 text-slate-500'}`}>
              {proposal.status}
            </span>
          </div>
          <p className="text-sm text-slate-600 line-clamp-3 mb-2">{proposal.cover_letter}</p>
          <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {proposal.proposed_duration_days && <span>{proposal.proposed_duration_days} days delivery</span>}
            <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex flex-row md:flex-col gap-2 shrink-0">
          <Link
            href={`/profile/${proposal.builder_id}`}
            className="px-3 py-2 rounded-xl border border-slate-200 text-center text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50"
          >
            Profile
          </Link>
          {onMessage && (
            <button
              type="button"
              disabled={messaging}
              onClick={() => onMessage(proposal)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {messaging ? '…' : 'Message'}
            </button>
          )}
          {canAct && onShortlist && proposal.status === 'submitted' && (
            <button
              type="button"
              onClick={() => onShortlist(proposal.id)}
              className="px-3 py-2 rounded-xl border border-blue-200 text-[10px] font-black uppercase text-blue-700 hover:bg-blue-50"
            >
              Shortlist
            </button>
          )}
          {canAct && onHire && (
            <button
              type="button"
              onClick={() => onHire(proposal)}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase hover:bg-blue-700"
            >
              Send Contract
            </button>
          )}
          {canAct && onReject && (
            <button
              type="button"
              onClick={() => onReject(proposal.id)}
              className="px-3 py-2 rounded-xl border border-rose-200 text-[10px] font-black uppercase text-rose-600 hover:bg-rose-50"
            >
              Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
