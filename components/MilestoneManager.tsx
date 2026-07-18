"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import RazorpayCheckoutButton from '@/components/RazorpayCheckoutButton';
import SubmitRevisionModal from '@/components/SubmitRevisionModal';
import SubmissionFilePreview, { type SubmissionAttachment } from '@/components/SubmissionFilePreview';
import { ACTIVE_DISPUTE_STATUSES } from '@/lib/disputes/constants';

type DeliverableRow = {
    id: string;
    milestone_id: string | null;
    title: string;
    description: string | null;
    status: string;
    revision_notes: string | null;
    attachments?: SubmissionAttachment[] | null;
    created_at: string;
};

type RevisionRequestRow = {
    id: string;
    milestone_id: string | null;
    reason: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
};

interface MilestoneManagerProps {
    collabId: string;
    userRole: 'buyer' | 'builder';
    onRaiseDispute?: () => void;
    onManageDispute?: () => void;
    hasActiveDispute?: boolean;
}

export default function MilestoneManager({ collabId, userRole, onRaiseDispute, onManageDispute, hasActiveDispute }: MilestoneManagerProps) {
    const router = useRouter();
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [paymentType, setPaymentType] = useState<'single_payment' | 'milestone_based'>('single_payment');
    const [activeDisputeStatus, setActiveDisputeStatus] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [revisionTarget, setRevisionTarget] = useState<any | null>(null);
    const [revisionReason, setRevisionReason] = useState('');
    const [revisionPurchaseSuccess, setRevisionPurchaseSuccess] = useState(false);
    const [submitTarget, setSubmitTarget] = useState<any | null>(null);
    const [deliverables, setDeliverables] = useState<DeliverableRow[]>([]);
    const [revisionRequests, setRevisionRequests] = useState<RevisionRequestRow[]>([]);

    // Milestone Form State
    const [milestoneForm, setMilestoneForm] = useState({
        title: '',
        description: '',
        deliverables: '',
        amount: '',
        due_date: '',
        notes: '',
        require_approval: true
    });

    // Financial Aggregations
    const [totals, setTotals] = useState({ budget: 0, escrow: 0, released: 0 });
    const [collabMeta, setCollabMeta] = useState<{
        title: string;
        buyer_id: string;
        builder_id: string;
        status: string;
        cumulative_new_milestones_fee_charged: boolean;
        max_revisions: number | null;
        revisions_used: number;
        extra_revision_price_usd: number;
    } | null>(null);
    const [fundedNewMilestoneTotal, setFundedNewMilestoneTotal] = useState(0);
    const [hasAnyFundedMilestone, setHasAnyFundedMilestone] = useState(false);

    useEffect(() => {
        fetchMilestones();

        // Subscribe to realtime milestone and collab revision-limit updates
        const subscription = supabase.channel(`milestones_${collabId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones', filter: `collab_id=eq.${collabId}` }, () => {
                fetchMilestones();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'collabs', filter: `id=eq.${collabId}` }, () => {
                fetchMilestones();
            })
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, [collabId]);

    const fetchMilestones = async () => {
        const [milestonesRes, collabRes, disputeRes, deliverablesRes, revisionsRes] = await Promise.all([
            supabase
                .from('milestones')
                .select('*')
                .eq('collab_id', collabId)
                .order('order_index', { ascending: true })
                .order('created_at', { ascending: true }),
            supabase
                .from('collabs')
                .select('escrow_amount_usd, fixed_price_usd, payment_type, title, buyer_id, builder_id, status, project_request_id, cumulative_new_milestones_fee_charged, max_revisions, revisions_used, extra_revision_price_usd, service_id, services(extra_revision_price_usd)')
                .eq('id', collabId)
                .single(),
            supabase
                .from('disputes')
                .select('status')
                .eq('collab_id', collabId)
                .in('status', [...ACTIVE_DISPUTE_STATUSES])
                .maybeSingle(),
            supabase
                .from('deliverables')
                .select('id, milestone_id, title, description, status, revision_notes, attachments, created_at')
                .eq('collab_id', collabId)
                .order('created_at', { ascending: true }),
            supabase
                .from('revision_requests')
                .select('id, milestone_id, reason, status, created_at, resolved_at')
                .eq('collab_id', collabId)
                .order('created_at', { ascending: true }),
        ]);

        setActiveDisputeStatus(disputeRes.data?.status || null);
        if (!deliverablesRes.error) setDeliverables((deliverablesRes.data ?? []) as DeliverableRow[]);
        if (!revisionsRes.error) setRevisionRequests((revisionsRes.data ?? []) as RevisionRequestRow[]);

        let milestoneRows = milestonesRes.data ?? [];

        if (milestoneRows.length === 0 && collabRes.data?.project_request_id) {
            await fetch(`/api/collabs/${collabId}/sync-proposal-milestones`, { method: 'POST' });
            const { data: syncedRows } = await supabase
                .from('milestones')
                .select('*')
                .eq('collab_id', collabId)
                .order('order_index', { ascending: true })
                .order('created_at', { ascending: true });
            milestoneRows = syncedRows ?? [];
        }

        if (!milestonesRes.error) {
            setMilestones(milestoneRows);

            let effectivePaymentType = collabRes.data?.payment_type || 'single_payment';
            let agreedBudget = Number(collabRes.data?.escrow_amount_usd ?? collabRes.data?.fixed_price_usd ?? 0);

            if (collabRes.data?.project_request_id) {
                const { data: projectRequest } = await supabase
                    .from('project_requests')
                    .select('payment_type, agreed_amount_usd, budget_usd')
                    .eq('id', collabRes.data.project_request_id)
                    .maybeSingle();

                if (projectRequest?.payment_type === 'milestone_payment') {
                    effectivePaymentType = 'milestone_based';
                }
                agreedBudget = Math.max(
                    agreedBudget,
                    Number(projectRequest?.agreed_amount_usd ?? projectRequest?.budget_usd ?? 0)
                );
            }

            const milestoneTotal = milestoneRows.reduce(
                (sum, milestone) => sum + Number(milestone.amount_usd ?? 0),
                0
            );
            const budget = Math.max(agreedBudget, milestoneTotal);

            setPaymentType(effectivePaymentType === 'milestone_based' ? 'milestone_based' : 'single_payment');

            if (collabRes.data) {
                const serviceExtra = (collabRes.data.services as { extra_revision_price_usd?: number } | null)?.extra_revision_price_usd;
                setCollabMeta({
                    title: collabRes.data.title || 'Project',
                    buyer_id: collabRes.data.buyer_id,
                    builder_id: collabRes.data.builder_id,
                    status: collabRes.data.status,
                    cumulative_new_milestones_fee_charged: Boolean(collabRes.data.cumulative_new_milestones_fee_charged),
                    max_revisions: collabRes.data.max_revisions ?? null,
                    revisions_used: Number(collabRes.data.revisions_used ?? 0),
                    extra_revision_price_usd: Number(collabRes.data.extra_revision_price_usd ?? serviceExtra ?? 0),
                });
            }

            const fundedStatuses = ['funded', 'in_progress', 'submitted', 'approved', 'released', 'completed'];
            const fundedNewTotal = milestoneRows
                .filter((m) => m.is_new_milestone && fundedStatuses.includes(m.status))
                .reduce((sum, m) => sum + Number(m.amount_usd ?? 0), 0);
            setFundedNewMilestoneTotal(fundedNewTotal);
            setHasAnyFundedMilestone(
                milestoneRows.some((m) => fundedStatuses.includes(m.status))
            );

            let escrow = 0;
            let released = 0;
            milestoneRows.forEach((m) => {
                if (['funded', 'in_progress', 'submitted', 'approved'].includes(m.status)) {
                    escrow += Number(m.amount_usd);
                }
                if (m.status === 'released' || m.status === 'completed') {
                    released += Number(m.amount_usd);
                }
            });

            setTotals({ budget, escrow, released });
        }
        setLoading(false);
    };

    // --- ESCROW STATE MACHINE ACTIONS ---
    const ensureNoActiveDispute = () => {
        if (!activeDisputeStatus) return true;
        setErrorMessage('Escrow and milestone actions are paused while the dispute is active. Messaging and evidence updates remain available.');
        return false;
    };

    const createMilestone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ensureNoActiveDispute()) return;
        if (!milestoneForm.title || !milestoneForm.amount) return;

        setProcessingId('create');
        setErrorMessage(null);
        const response = await fetch(`/api/collabs/${collabId}/milestones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(milestoneForm),
        });
        const result = await response.json();

        if (!response.ok) {
            setErrorMessage(result.error || 'Failed to create milestone.');
        } else {
            setShowMilestoneModal(false);
            setMilestoneForm({ title: '', description: '', deliverables: '', amount: '', due_date: '', notes: '', require_approval: true });
            await fetchMilestones();
        }
        setProcessingId(null);
    };

    const fundMilestone = async (milestone: any) => {
        if (!ensureNoActiveDispute()) return;
        router.push(`/checkout/escrow/${milestone.id}`);
    };

    const submitMilestoneWork = async (
        milestone: any,
        payload: { description: string; attachments: SubmissionAttachment[] }
    ) => {
        if (!ensureNoActiveDispute()) return;
        setProcessingId(milestone.id);
        setErrorMessage(null);
        const response = await fetch(`/api/milestones/${milestone.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'submit',
                deliverableDescription: payload.description,
                attachments: payload.attachments,
            }),
        });
        const result = await response.json();

        if (!response.ok) {
            setErrorMessage(result.error || 'Submission failed.');
        } else {
            await fetchMilestones();
            setSubmitTarget(null);
        }
        setProcessingId(null);
    };

    const updateMilestoneStatus = async (milestone: any, action: 'start_work' | 'request_revision' | 'accept', revision?: string) => {
        if (!ensureNoActiveDispute()) return;
        setProcessingId(milestone.id);
        setErrorMessage(null);
        const response = await fetch(`/api/milestones/${milestone.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, revisionReason: revision }),
        });
        const result = await response.json();

        if (!response.ok) {
            if (response.status === 402 && result.requiresPayment) {
                setErrorMessage(result.error || 'Purchase an additional revision to continue.');
            } else {
                setErrorMessage(result.error || 'Transaction failed.');
            }
        } else {
            await fetchMilestones();
            setRevisionTarget(null);
            setRevisionReason('');
        }
        setProcessingId(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-slate-200">Draft</span>;
            case 'funded': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-blue-200">In Escrow</span>;
            case 'in_progress': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-amber-200">Active Work</span>;
            case 'submitted': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-purple-200">In Review</span>;
            case 'released': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-green-200 flex items-center gap-1">Paid <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></span>;
            default: return null;
        }
    };

    const projectedNewMilestoneTotal =
        milestoneForm.amount
            ? fundedNewMilestoneTotal + Number(milestoneForm.amount)
            : fundedNewMilestoneTotal;
    const isPostFundingCollab = hasAnyFundedMilestone || (collabMeta
        ? ['funded', 'in_progress', 'active', 'submitted', 'pending_approval'].includes(collabMeta.status)
        : false);
    const addMilestoneFeePreview =
        isPostFundingCollab &&
        !collabMeta?.cumulative_new_milestones_fee_charged &&
        projectedNewMilestoneTotal >= 50
            ? 5
            : 0;

    const freeRevisionsRemaining =
        collabMeta?.max_revisions != null
            ? Math.max(0, collabMeta.max_revisions - collabMeta.revisions_used)
            : null;
    const revisionLimitReached = freeRevisionsRemaining === 0 && collabMeta?.max_revisions != null;
    const canPurchaseExtraRevision = revisionLimitReached && (collabMeta?.extra_revision_price_usd ?? 0) > 0;

    const getMilestoneDeliverables = (milestoneId: string) =>
        deliverables.filter((d) => d.milestone_id === milestoneId);

    const getMilestoneRevisionRequests = (milestoneId: string) =>
        revisionRequests.filter((r) => r.milestone_id === milestoneId);

    const buildSubmissionTimeline = (milestoneId: string) => {
        const items: Array<
            | { kind: 'submission'; data: DeliverableRow }
            | { kind: 'revision'; data: RevisionRequestRow }
        > = [];

        for (const deliverable of getMilestoneDeliverables(milestoneId)) {
            items.push({ kind: 'submission', data: deliverable });
        }
        for (const revision of getMilestoneRevisionRequests(milestoneId)) {
            items.push({ kind: 'revision', data: revision });
        }

        return items.sort(
            (a, b) =>
                new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime()
        );
    };

    if (loading) return <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div></div>;

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-300">

            {/* 1. FINANCIAL DASHBOARD STRIP */}
            <div className="bg-slate-900 text-white p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-bl-full blur-2xl"></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <h2 className="text-xl font-black tracking-tight">Project Budget</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Escrow Vault Status</p>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${paymentType === 'milestone_based' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                                {paymentType === 'milestone_based' ? 'Milestone-Based' : 'Single Payment'}
                            </span>
                        </div>
                    </div>
                    {userRole === 'buyer' && (
                        <button
                            onClick={() => {
                                if (!ensureNoActiveDispute()) return;
                                setShowMilestoneModal(true);
                            }}
                            disabled={Boolean(activeDisputeStatus)}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-slate-300 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors"
                        >
                            + Add Milestone
                        </button>
                    )}
                </div>
                {activeDisputeStatus && (
                    <div className="mt-6 bg-rose-500/10 border border-rose-400/30 text-rose-100 rounded-2xl p-4 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest">Dispute Freeze Active</p>
                        <p className="text-xs font-medium mt-1">Escrow funding, milestone creation, approval, release, and status changes are paused. Continue in chat{userRole === 'builder' ? ' or the Dispute Center sidebar' : ''}.</p>
                        {onManageDispute && (
                            <button
                                type="button"
                                onClick={onManageDispute}
                                className="mt-3 bg-white/10 hover:bg-white/20 border border-rose-300/40 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                                Manage Dispute
                            </button>
                        )}
                    </div>
                )}
                {errorMessage && (
                    <div className="mt-6 bg-rose-500/10 border border-rose-400/30 text-rose-100 rounded-2xl p-4 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest">Action Failed</p>
                        <p className="text-xs font-medium mt-1">{errorMessage}</p>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 relative z-10">
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project Budget</p>
                        <p className="text-2xl font-black">${totals.budget.toLocaleString()}</p>
                        <p className="mt-1 text-[9px] font-medium text-slate-500">Agreed project value</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Locked in Escrow</p>
                        <p className="text-2xl font-black text-blue-400">${totals.escrow.toLocaleString()}</p>
                        <p className="mt-1 text-[9px] font-medium text-slate-500">Funded and not yet released</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Released to Expert</p>
                        <p className="text-2xl font-black text-green-400">${totals.released.toLocaleString()}</p>
                        <p className="mt-1 text-[9px] font-medium text-slate-500">Paid out after approval</p>
                    </div>
                </div>
            </div>

            {/* 2. MILESTONE TIMELINE */}
            <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-50/50 custom-scrollbar">
                {userRole === 'buyer' && collabMeta?.max_revisions != null && (
                    <div className="max-w-4xl mx-auto mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs font-medium text-slate-600">
                        <span className="font-black uppercase tracking-widest text-[10px] text-slate-400">Revisions</span>
                        <p className="mt-1">
                            {freeRevisionsRemaining} of {collabMeta.max_revisions} included revision(s) remaining
                            {(collabMeta.extra_revision_price_usd ?? 0) > 0 &&
                                ` · Extra revisions $${collabMeta.extra_revision_price_usd} each`}
                        </p>
                    </div>
                )}
                {milestones.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-1">No Milestones Defined</h3>
                        <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto">
                            {paymentType === 'milestone_based'
                                ? 'Agreed proposal milestones will appear here once the project request is submitted or accepted.'
                                : 'This is a single-payment project. Fund the project completion milestone when you are ready.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        {milestones.map((milestone, index) => {
                            const timeline = buildSubmissionTimeline(milestone.id);
                            const priorSubmissions = getMilestoneDeliverables(milestone.id).length > 0;

                            return (
                            <div key={milestone.id} className={`bg-white border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 min-w-0 overflow-hidden transition-all ${milestone.status === 'in_progress' ? 'border-blue-300 ring-4 ring-blue-50' : milestone.status === 'submitted' ? 'border-purple-200 ring-4 ring-purple-50/80' : 'border-slate-200'}`}>

                                {/* Number & Status */}
                                <div className="md:w-1/4 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6 flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Milestone {index + 1}</p>
                                        <p className="text-2xl font-black text-slate-900">${Number(milestone.amount_usd).toLocaleString()}</p>
                                    </div>
                                    {getStatusBadge(milestone.status)}
                                </div>

                                {/* Info & Actions */}
                                <div className="flex-1 flex flex-col min-w-0 w-full">
                                    <div className="mb-4">
                                        <h4 className="text-lg font-black text-slate-900 leading-tight mb-1">{milestone.title}</h4>
                                        <p className="text-xs font-medium text-slate-500 leading-relaxed">{milestone.description || 'No description provided.'}</p>
                                    </div>

                                    {timeline.length > 0 && (
                                        <div className="mb-4 space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Submission History</p>
                                            {timeline.map((entry) =>
                                                entry.kind === 'submission' ? (
                                                    <div
                                                        key={`sub-${entry.data.id}`}
                                                        className={`rounded-2xl border p-4 ${
                                                            entry.data.status === 'submitted'
                                                                ? 'border-purple-200 bg-purple-50/50'
                                                                : entry.data.status === 'revision_requested'
                                                                ? 'border-amber-200 bg-amber-50/50'
                                                                : 'border-green-200 bg-green-50/50'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                                    {entry.data.status === 'submitted' ? 'Revision Submitted' : entry.data.status.replace(/_/g, ' ')}
                                                                </p>
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                                                                    {new Date(entry.data.created_at).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <span className="shrink-0 rounded-md bg-white/80 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-slate-600 border border-slate-200">
                                                                {entry.data.status}
                                                            </span>
                                                        </div>
                                                        {entry.data.description && (
                                                            <p className="mt-3 whitespace-pre-wrap text-xs font-medium leading-relaxed text-slate-700">
                                                                {entry.data.description}
                                                            </p>
                                                        )}
                                                        {entry.data.attachments && entry.data.attachments.length > 0 && (
                                                            <div className="mt-3 grid grid-cols-1 gap-2">
                                                                {entry.data.attachments.map((file) => (
                                                                    <SubmissionFilePreview key={`${entry.data.id}-${file.url}`} file={file} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div key={`rev-${entry.data.id}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">Buyer Revision Request</p>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mt-1">
                                                            {new Date(entry.data.created_at).toLocaleString()}
                                                        </p>
                                                        <p className="mt-2 text-xs font-medium leading-relaxed text-amber-950 whitespace-pre-wrap">
                                                            {entry.data.reason}
                                                        </p>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-auto border-t border-slate-100 pt-4 flex flex-col gap-3 min-w-0 w-full">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                                            {milestone.due_date ? `Due: ${new Date(milestone.due_date).toLocaleDateString()}` : 'No deadline set'}
                                        </div>

                                        {/* ROLE-BASED ACTION ENGINE */}
                                        <div className="flex flex-wrap gap-2 w-full min-w-0 [&>*:only-child]:sm:max-w-xs [&>*:only-child]:lg:max-w-none">
                                            {userRole === 'buyer' && milestone.status === 'draft' && (
                                                <button onClick={() => paymentType === 'milestone_based' ? fundMilestone(milestone) : ensureNoActiveDispute() && router.push(`/checkout/escrow/${milestone.id}`)} disabled={processingId === milestone.id || Boolean(activeDisputeStatus)} className="inline-flex items-center justify-center min-h-[2.5rem] min-w-0 w-full sm:min-w-[9rem] sm:w-auto sm:flex-1 sm:max-w-[calc(50%-0.25rem)] lg:max-w-none lg:flex-none px-3 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-snug bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 disabled:text-slate-500 text-white shadow-sm transition-colors">
                                                    {processingId === milestone.id ? 'Processing...' : paymentType === 'milestone_based' ? 'Fund This Milestone' : 'Fund Escrow'}
                                                </button>
                                            )}

                                            {userRole === 'builder' && milestone.status === 'funded' && (
                                                <button onClick={() => updateMilestoneStatus(milestone, 'start_work')} disabled={processingId === milestone.id || Boolean(activeDisputeStatus)} className="inline-flex items-center justify-center min-h-[2.5rem] min-w-0 w-full sm:min-w-[9rem] sm:w-auto sm:flex-1 sm:max-w-[calc(50%-0.25rem)] lg:max-w-none lg:flex-none px-3 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-snug bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white shadow-sm transition-colors">
                                                    {processingId === milestone.id ? 'Updating...' : 'Start Work'}
                                                </button>
                                            )}

                                            {userRole === 'builder' && milestone.status === 'in_progress' && (
                                                <button onClick={() => setSubmitTarget(milestone)} disabled={processingId === milestone.id || Boolean(activeDisputeStatus)} className="inline-flex items-center justify-center min-h-[2.5rem] min-w-0 w-full sm:min-w-[9rem] sm:w-auto sm:flex-1 sm:max-w-[calc(50%-0.25rem)] lg:max-w-none lg:flex-none px-3 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-snug bg-slate-900 hover:bg-purple-600 disabled:bg-slate-300 disabled:text-slate-500 text-white shadow-sm transition-colors">
                                                    {processingId === milestone.id ? 'Submitting...' : priorSubmissions ? 'Submit Revision' : 'Submit for Review'}
                                                </button>
                                            )}

                                            {userRole === 'buyer' && milestone.status === 'submitted' && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            if (canPurchaseExtraRevision) {
                                                                setErrorMessage(`All included revisions are used. Purchase an extra revision ($${collabMeta?.extra_revision_price_usd}) to request more changes.`);
                                                            }
                                                            setRevisionPurchaseSuccess(false);
                                                            setRevisionTarget(milestone);
                                                        }}
                                                        disabled={(revisionLimitReached && !canPurchaseExtraRevision) || processingId === milestone.id || Boolean(activeDisputeStatus)}
                                                        className="inline-flex items-center justify-center min-h-[2.5rem] min-w-0 w-full sm:min-w-[9rem] sm:w-auto sm:flex-1 sm:max-w-[calc(50%-0.25rem)] lg:max-w-none lg:flex-none px-3 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-snug bg-slate-100 hover:bg-amber-100 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 hover:text-amber-800 transition-colors"
                                                    >
                                                        {canPurchaseExtraRevision ? 'Buy Extra Revision' : 'Request Changes'}
                                                    </button>
                                                    <button onClick={() => updateMilestoneStatus(milestone, 'accept')} disabled={processingId === milestone.id || Boolean(activeDisputeStatus)} className="inline-flex items-center justify-center gap-1.5 min-h-[2.5rem] min-w-0 w-full sm:min-w-[9rem] sm:w-auto sm:flex-1 sm:max-w-[calc(50%-0.25rem)] lg:max-w-none lg:flex-none px-3 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-snug bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:text-slate-500 text-white shadow-sm transition-colors">
                                                        {processingId === milestone.id ? 'Releasing...' : 'Approve & Release'}
                                                    </button>
                                                    {onRaiseDispute && !hasActiveDispute && !activeDisputeStatus && (
                                                        <button
                                                            type="button"
                                                            onClick={onRaiseDispute}
                                                            disabled={processingId === milestone.id}
                                                            className="inline-flex items-center justify-center min-h-[2.5rem] min-w-0 w-full sm:min-w-[9rem] sm:w-auto sm:flex-1 sm:max-w-[calc(50%-0.25rem)] lg:max-w-none lg:flex-none px-3 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-snug bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors"
                                                        >
                                                            Raise Dispute
                                                        </button>
                                                    )}
                                                </>
                                            )}

                                            {milestone.status === 'released' && (
                                                <button className="inline-flex items-center justify-center gap-1.5 min-h-[2.5rem] min-w-0 w-full sm:min-w-[9rem] sm:w-auto sm:flex-1 sm:max-w-[calc(50%-0.25rem)] lg:max-w-none lg:flex-none px-3 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-snug bg-slate-50 text-slate-400 cursor-not-allowed">
                                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> Funds Released
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Milestone Creation Modal */}
            {showMilestoneModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200">
                            <h3 className="text-lg font-black text-slate-900">Create New Milestone</h3>
                            <p className="text-xs font-medium text-slate-500 mt-1">Define a new deliverable phase for the project</p>
                        </div>
                        <form onSubmit={createMilestone} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Milestone Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={milestoneForm.title}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                                    placeholder="e.g., UI Design Phase"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Description *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={milestoneForm.description}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                                    placeholder="Describe what this milestone includes..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 resize-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Deliverables *</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={milestoneForm.deliverables}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, deliverables: e.target.value })}
                                    placeholder="List specific deliverables..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 resize-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Amount (USD) *</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={milestoneForm.amount}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, amount: e.target.value })}
                                    placeholder="e.g., 500"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Expected Delivery Date</label>
                                <input
                                    type="date"
                                    value={milestoneForm.due_date}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Optional Notes</label>
                                <textarea
                                    rows={2}
                                    value={milestoneForm.notes}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, notes: e.target.value })}
                                    placeholder="Any additional context..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 resize-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="requireApproval"
                                    checked={milestoneForm.require_approval}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, require_approval: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="requireApproval" className="text-xs font-medium text-slate-700">Require buyer approval before funding</label>
                            </div>
                            {isPostFundingCollab && (
                                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-900">
                                    <p className="font-black uppercase tracking-widest text-[10px] text-blue-700">Additional Milestone Fee Rule</p>
                                    <p className="mt-2 font-medium leading-relaxed">
                                        New milestones added after funding accumulate toward a $50 threshold. Platform fee is charged once when that threshold is reached during payment, not before.
                                    </p>
                                    {milestoneForm.amount && (
                                        <p className="mt-2 font-bold">
                                            Cumulative new milestones after this: ${projectedNewMilestoneTotal.toLocaleString()}
                                            {addMilestoneFeePreview > 0
                                                ? ` · $${addMilestoneFeePreview} platform fee due at funding`
                                                : ' · No platform fee at funding'}
                                        </p>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setShowMilestoneModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processingId === 'create'} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                                    {processingId === 'create' ? 'Creating...' : 'Create Milestone'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {submitTarget && (
                <SubmitRevisionModal
                    milestone={submitTarget}
                    collabId={collabId}
                    isResubmission={getMilestoneDeliverables(submitTarget.id).length > 0}
                    onClose={() => setSubmitTarget(null)}
                    onSubmit={(payload) => submitMilestoneWork(submitTarget, payload)}
                />
            )}
            {revisionTarget && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-slate-200">
                            <h3 className="text-lg font-black text-slate-900">Request Revisions</h3>
                            <p className="text-xs font-medium text-slate-500 mt-1">Tell the builder what needs to change for {revisionTarget.title}.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {collabMeta?.max_revisions != null && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
                                    {freeRevisionsRemaining} of {collabMeta.max_revisions} included revision(s) remaining.
                                </div>
                            )}
                            {canPurchaseExtraRevision && !revisionPurchaseSuccess ? (
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-slate-700">
                                        You have used all included revisions. Pay ${collabMeta?.extra_revision_price_usd} to unlock one more revision request.
                                    </p>
                                    <RazorpayCheckoutButton
                                        amountUsd={collabMeta?.extra_revision_price_usd ?? 0}
                                        itemId={collabId}
                                        transactionType="revision_purchase"
                                        buttonText={`Pay $${collabMeta?.extra_revision_price_usd} for Extra Revision`}
                                        onSuccess={async () => {
                                            await fetchMilestones();
                                            setRevisionPurchaseSuccess(true);
                                            setErrorMessage(null);
                                        }}
                                    />
                                </div>
                            ) : (
                                <>
                                    {revisionPurchaseSuccess && (
                                        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                                            Extra revision unlocked. Describe the changes you need below.
                                        </div>
                                    )}
                                    <textarea
                                        rows={5}
                                        value={revisionReason}
                                        onChange={(e) => setRevisionReason(e.target.value)}
                                        placeholder="List the specific changes required before approval..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 resize-none"
                                    />
                                </>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setRevisionTarget(null); setRevisionReason(''); setRevisionPurchaseSuccess(false); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                                    Cancel
                                </button>
                                {!canPurchaseExtraRevision || revisionPurchaseSuccess ? (
                                    <button
                                        type="button"
                                        onClick={() => updateMilestoneStatus(revisionTarget, 'request_revision', revisionReason)}
                                        disabled={!revisionReason.trim() || processingId === revisionTarget.id || (revisionLimitReached && !revisionPurchaseSuccess)}
                                        className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                                    >
                                        {processingId === revisionTarget.id ? 'Sending...' : 'Send Request'}
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}