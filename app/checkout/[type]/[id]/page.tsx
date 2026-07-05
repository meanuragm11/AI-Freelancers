"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import RazorpayCheckoutButton from '@/components/RazorpayCheckoutButton';

const ESCROW_PLATFORM_FEE_USD = 5;

async function fetchEscrowCheckoutSummary(milestoneId: string) {
  const response = await fetch(`/api/milestones/${milestoneId}/card`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Unable to load checkout summary');
  }
  return result as {
    milestone: {
      id: string;
      collab_id: string;
      title: string;
      description?: string | null;
      deliverables?: string | null;
      due_date?: string | null;
      amount_usd: number;
      collabs?: { title?: string; project_description?: string; builder?: { full_name?: string } };
    };
    platformFee: number;
    totalDue: number;
  };
}

export default function SecureCheckout() {
  const router = useRouter();
  const params = useParams();

  const checkoutType = params.type as string;
  const referenceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [collabId, setCollabId] = useState<string | null>(null);
  const [paymentItemId, setPaymentItemId] = useState<string | null>(null);
  const [projectMilestones, setProjectMilestones] = useState<Array<{ title: string; amount: number }>>([]);

  const [transaction, setTransaction] = useState({
    title: '',
    description: '',
    amount: 0,
    platformFee: 0,
    total: 0,
    recipientName: '',
    scope: '',
    dueDate: '',
    revisions: '',
    terms: '',
  });

  useEffect(() => {
    async function initializeCheckout() {
      void fetch('/api/checkout/cleanup', { method: 'POST' });
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.push('/auth'); return; }
      setUser(currentUser);

      try {
        if (checkoutType === 'escrow') {
          const summary = await fetchEscrowCheckoutSummary(referenceId);
          const milestone = summary.milestone;

          const { data: activeDispute } = await supabase
            .from('disputes')
            .select('id')
            .eq('collab_id', milestone.collab_id)
            .in('status', ['waiting_for_freelancer', 'waiting_for_buyer', 'negotiation', 'under_review', 'arbitration_requested'])
            .maybeSingle();

          if (activeDispute) {
            throw new Error('Escrow funding is paused while a dispute is active.');
          }

          const amount = Number(milestone.amount_usd);
          const platformFee = Number(summary.platformFee ?? 0);
          setCollabId(milestone.collab_id);

          const { data: collabDetails } = await supabase
            .from('collabs')
            .select('title, project_description, builder:profiles_public!builder_id(full_name)')
            .eq('id', milestone.collab_id)
            .maybeSingle();

          setTransaction({
            title: `Escrow Funding: ${milestone.title}`,
            description: `Project: ${collabDetails?.title ?? milestone.collabs?.title ?? 'Collaboration'}`,
            amount,
            platformFee,
            total: Number(summary.totalDue ?? amount + platformFee),
            recipientName: (collabDetails?.builder as { full_name?: string } | null)?.full_name ?? 'Expert',
            scope: milestone.deliverables || milestone.description || collabDetails?.project_description || 'Milestone deliverables defined in the workspace.',
            dueDate: milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : 'No due date set',
            revisions: 'Revision requests must be made before buyer acceptance.',
            terms: 'Funds are released only after buyer acceptance. Disputes pause funding and release actions.',
          });
        } else if (checkoutType === 'project') {
          const prepareResponse = await fetch(`/api/project-requests/${referenceId}/prepare-checkout`, {
            method: 'POST',
          });
          const prepareResult = await prepareResponse.json();
          if (!prepareResponse.ok) {
            throw new Error(prepareResult.error || 'Unable to prepare project checkout');
          }

          setPaymentItemId(prepareResult.milestoneId);

          const { data: request, error: requestError } = await supabase
            .from('project_requests')
            .select(
              'id, title, description, status, payment_type, conversation_id, expected_deadline, agreed_amount_usd, budget_usd, accepted_negotiation_id, builder:profiles_public!builder_id(full_name)'
            )
            .eq('id', referenceId)
            .single();

          if (requestError || !request) throw new Error('Project request not found');
          if (request.status !== 'accepted') throw new Error('Proposal must be accepted before payment');

          setCollabId(request.conversation_id);

          let amount = Number(request.agreed_amount_usd ?? request.budget_usd ?? 0);
          let milestones: Array<{ title: string; amount: number }> = [];

          if (request.accepted_negotiation_id) {
            const { data: negotiation } = await supabase
              .from('negotiation_history')
              .select('proposed_amount_usd, proposed_milestones')
              .eq('id', request.accepted_negotiation_id)
              .maybeSingle();

            if (negotiation?.proposed_amount_usd) {
              amount = Number(negotiation.proposed_amount_usd);
            }
            milestones = ((negotiation?.proposed_milestones ?? []) as Array<{ title: string; amount: number }>);
          }

          setProjectMilestones(milestones);

          const summary = await fetchEscrowCheckoutSummary(prepareResult.milestoneId);
          const platformFee = Number(summary.platformFee ?? ESCROW_PLATFORM_FEE_USD);

          setTransaction({
            title: request.title,
            description: request.description,
            amount,
            platformFee,
            total: Number(summary.totalDue ?? amount + platformFee),
            recipientName: (request.builder as { full_name?: string })?.full_name ?? 'Expert',
            scope: request.description,
            dueDate: request.expected_deadline
              ? new Date(request.expected_deadline).toLocaleDateString()
              : 'To be agreed in workspace',
            revisions: request.payment_type === 'milestone_payment'
              ? `${milestones.length} agreed milestone(s) in chat proposal.`
              : 'Single payment for full project delivery.',
            terms: 'Payment locks the agreed proposal in chat. Scope changes require a new proposal.',
          });
        } else if (checkoutType === 'asset') {
          const { data: component, error } = await supabase
            .from('components')
            .select('*, builder:profiles_public!builder_id(full_name)')
            .eq('id', referenceId)
            .eq('status', 'published')
            .single();

          if (error || !component) throw new Error('Invalid Asset ID');
          const hasFulfillment = component.delivery_method === 'secure_text'
            ? Boolean(component.secure_payload_text)
            : Boolean(component.asset_file_path || component.file_url);
          if (!hasFulfillment) throw new Error('This asset is missing fulfillment content.');

          const amount = Number(component.price_usd);

          setTransaction({
            title: `Asset License: ${component.title}`,
            description: `Category: ${component.category}`,
            amount,
            platformFee: 0,
            total: amount,
            recipientName: (component.builder as { full_name?: string })?.full_name ?? 'Builder',
            scope: component.description || 'Commercial license for the selected AI asset.',
            dueDate: 'Instant delivery after payment confirmation',
            revisions: 'Digital assets are delivered as-is unless the listing states otherwise.',
            terms: 'Download access is granted only to the purchasing account. Refunds require support review.',
          });
        } else {
          throw new Error('Unknown Checkout Type');
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Checkout failed');
      } finally {
        setLoading(false);
      }
    }

    initializeCheckout();
  }, [checkoutType, referenceId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black uppercase tracking-widest text-xs text-slate-400 animate-pulse">
        Initializing Secure Gateway...
      </div>
    );
  }

  const transactionType =
    checkoutType === 'escrow' || checkoutType === 'project'
      ? 'escrow_funding'
      : 'component_purchase';
  const redirectPath =
    checkoutType === 'project' && collabId
      ? `/buyer/messages?conversation=${collabId}`
      : checkoutType === 'escrow' && collabId
        ? `/buyer/messages?conversation=${collabId}`
        : checkoutType === 'asset'
          ? '/buyer/library'
          : undefined;
  const escrowItemId = paymentItemId ?? referenceId;

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <Link href="#" onClick={() => router.back()} className="text-2xl font-black tracking-tighter text-slate-900">
          Zelance<span className="text-blue-600">.</span>
        </Link>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          256-Bit SSL Secured
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        <div className="animate-in fade-in slide-in-from-left-8 duration-500">
          <button onClick={() => router.back()} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 mb-6 inline-flex items-center gap-1 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Cancel & Return
          </button>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Complete Payment</h1>
          <p className="text-sm font-medium text-slate-500 mb-8">Review your transaction details before authorizing the charge.</p>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Order Summary</h3>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h4 className="text-lg font-black text-slate-900 leading-tight">{transaction.title}</h4>
                <p className="text-xs font-medium text-slate-500 mt-1">{transaction.description}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mt-3">Recipient: {transaction.recipientName}</p>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100">
              {checkoutType === 'project' && projectMilestones.length > 0 && (
                <div className="space-y-2 pb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agreed Milestones</p>
                  {projectMilestones.map((milestone, index) => (
                    <div key={`${milestone.title}-${index}`} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm">
                      <span className="font-bold text-slate-800">{milestone.title}</span>
                      <span className="font-black text-blue-600">${Number(milestone.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                <span>Subtotal</span>
                <span>${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {transaction.platformFee > 0 && (
                <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                  <span>Zelance Protection Fee</span>
                  <span>${transaction.platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200">
              <span className="text-base font-black text-slate-900">Total Due</span>
              <span className="text-3xl font-black text-slate-900">${transaction.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-3 text-right">Amounts displayed in USD</p>
          </div>

          <div className="mt-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Contract Confirmation</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Scope</p>
                <p className="font-medium text-slate-700 leading-relaxed">{transaction.scope}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Due / Delivery</p>
                  <p className="font-bold text-slate-900">{transaction.dueDate}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Revisions</p>
                  <p className="font-bold text-slate-900">{transaction.revisions}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-1">Refund / Dispute Terms</p>
                <p className="text-xs font-medium text-amber-800 leading-relaxed">{transaction.terms}</p>
              </div>
            </div>
          </div>

          {(checkoutType === 'escrow' || checkoutType === 'project') && (
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-1">Escrow Protection Active</h4>
                <p className="text-xs font-medium text-blue-800 leading-relaxed">Your funds are held securely by Zelance. They will only be released to the expert once you review and approve the final milestone deliverables.</p>
              </div>
            </div>
          )}
        </div>

        <div className="animate-in fade-in slide-in-from-right-8 duration-500 delay-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
            <h3 className="text-lg font-black text-slate-900 mb-2">Secure Checkout</h3>
            <p className="text-sm text-slate-500 font-medium mb-8">
              You will be redirected to Razorpay to complete payment. Card, UPI, and wallet options are available there.
            </p>

            {user && (checkoutType !== 'project' || paymentItemId) && (
              <RazorpayCheckoutButton
                amountUsd={transaction.amount}
                itemId={checkoutType === 'project' ? escrowItemId : referenceId}
                transactionType={transactionType}
                buttonText={`Pay $${transaction.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} Securely`}
                redirectPath={redirectPath}
              />
            )}

            {errorMessage && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                {errorMessage}
              </p>
            )}

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4 text-center">
              Powered by Razorpay
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
