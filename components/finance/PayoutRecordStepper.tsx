'use client';

import { useEffect, useId, useRef, useState } from 'react';
import FinanceError from './FinanceError';
import FinanceStatusBadge from './FinanceStatusBadge';
import {
  formatFinanceDate,
  formatUsd,
  paymentMethodLabel,
  payoutSourceLabel,
} from './utils/formatters';
import type { PayoutQueueItemDto } from '@/lib/finance/read/shared/dto/payouts';

type Step = 'review' | 'form' | 'confirm';

type PayoutRecordStepperProps = {
  payout: PayoutQueueItemDto;
  loading: boolean;
  error: string | null;
  onSubmit: (values: {
    transactionReference: string;
    notes: string;
    receiptUrl: string;
  }) => Promise<void>;
  onCancel: () => void;
  onResetError?: () => void;
};

function invoiceLabel(item: PayoutQueueItemDto): string {
  if (item.invoiceId) return item.invoiceId.slice(0, 8);
  if (item.withdrawalReference) return item.withdrawalReference;
  return '—';
}

function DrawerField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className="text-sm font-medium text-slate-900 break-words">{value}</div>
    </div>
  );
}

export default function PayoutRecordStepper({
  payout,
  loading,
  error,
  onSubmit,
  onCancel,
  onResetError,
}: PayoutRecordStepperProps) {
  const [step, setStep] = useState<Step>('review');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const stepperId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const transactionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step === 'form') {
      transactionRef.current?.focus();
    }
  }, [step]);

  const steps: { id: Step; label: string }[] = [
    { id: 'review', label: 'Review' },
    { id: 'form', label: 'Payment details' },
    { id: 'confirm', label: 'Confirm' },
  ];

  const stepIndex = steps.findIndex((item) => item.id === step);

  const goToForm = () => {
    setFieldError(null);
    onResetError?.();
    setStep('form');
  };

  const goToConfirm = () => {
    onResetError?.();
    const reference = transactionReference.trim();
    if (!reference) {
      setFieldError('Transaction reference is required.');
      transactionRef.current?.focus();
      return;
    }
    setFieldError(null);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    onResetError?.();
    await onSubmit({
      transactionReference: transactionReference.trim(),
      notes,
      receiptUrl,
    });
  };

  return (
    <div className="space-y-6">
      <nav aria-label="Payout recording steps">
        <ol className="flex items-center gap-2">
          {steps.map((item, index) => {
            const active = item.id === step;
            const complete = index < stepIndex;
            return (
              <li key={item.id} className="flex items-center gap-2 min-w-0">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black shrink-0 ${
                    active
                      ? 'bg-blue-600 text-white'
                      : complete
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                  aria-current={active ? 'step' : undefined}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-widest truncate ${
                    active ? 'text-blue-700' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
                {index < steps.length - 1 && (
                  <span className="text-slate-300 px-1" aria-hidden="true">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {error && (
        <FinanceError
          title="Unable to record payout"
          message={error}
          onRetry={onResetError}
          retryLabel="Dismiss"
        />
      )}

      {step === 'review' && (
        <section aria-labelledby={`${stepperId}-review-heading`} className="space-y-4">
          <h3
            ref={headingRef}
            id={`${stepperId}-review-heading`}
            tabIndex={-1}
            className="text-sm font-black text-slate-900 outline-none"
          >
            Review payout
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DrawerField label="Builder" value={payout.builderName ?? payout.builderId} />
            <DrawerField label="Source" value={payoutSourceLabel(payout.source)} />
            <DrawerField label="Invoice / reference" value={invoiceLabel(payout)} />
            <DrawerField label="Status" value={<FinanceStatusBadge status={payout.status} />} />
            <DrawerField label="Gross" value={formatUsd(payout.grossAmountUsd)} />
            <DrawerField label="Platform fee" value={formatUsd(payout.platformFeeUsd)} />
            <DrawerField label="Net payout" value={formatUsd(payout.netAmountUsd)} />
            <DrawerField label="Payment method" value={paymentMethodLabel(payout.source)} />
            <DrawerField label="Requested" value={formatFinanceDate(payout.createdAt)} />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={goToForm}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Record payment
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {step === 'form' && (
        <section aria-labelledby={`${stepperId}-form-heading`} className="space-y-4">
          <h3
            ref={headingRef}
            id={`${stepperId}-form-heading`}
            tabIndex={-1}
            className="text-sm font-black text-slate-900 outline-none"
          >
            Payment details
          </h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor={`${stepperId}-transaction-ref`} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Transaction reference <span className="text-rose-500">*</span>
              </label>
              <input
                ref={transactionRef}
                id={`${stepperId}-transaction-ref`}
                type="text"
                required
                value={transactionReference}
                onChange={(event) => {
                  setTransactionReference(event.target.value);
                  if (fieldError) setFieldError(null);
                }}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? `${stepperId}-transaction-error` : undefined}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                placeholder="Bank transfer ID, UTR, or wire reference"
              />
              {fieldError && (
                <p id={`${stepperId}-transaction-error`} className="text-xs font-medium text-rose-600" role="alert">
                  {fieldError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`${stepperId}-notes`} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Notes
              </label>
              <textarea
                id={`${stepperId}-notes`}
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-y min-h-[4.5rem]"
                placeholder="Optional internal notes"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`${stepperId}-receipt-url`} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Receipt URL
              </label>
              <input
                id={`${stepperId}-receipt-url`}
                type="url"
                value={receiptUrl}
                onChange={(event) => setReceiptUrl(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                placeholder="https://…"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={goToConfirm}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => setStep('review')}
              className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Back
            </button>
          </div>
        </section>
      )}

      {step === 'confirm' && (
        <section aria-labelledby={`${stepperId}-confirm-heading`} className="space-y-4">
          <h3
            ref={headingRef}
            id={`${stepperId}-confirm-heading`}
            tabIndex={-1}
            className="text-sm font-black text-slate-900 outline-none"
          >
            Confirm payout
          </h3>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
            This action cannot be undone.
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Net payout</span>
              <span className="font-semibold text-slate-900">{formatUsd(payout.netAmountUsd)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Transaction reference</span>
              <span className="font-mono text-xs font-medium text-slate-900">{transactionReference.trim()}</span>
            </div>
            {notes.trim() && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Notes</span>
                <span className="font-medium text-slate-900 text-right">{notes.trim()}</span>
              </div>
            )}
            {receiptUrl.trim() && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Receipt URL</span>
                <span className="font-medium text-blue-600 text-right break-all">{receiptUrl.trim()}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={loading}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {loading ? 'Recording…' : 'Confirm payout'}
            </button>
            <button
              type="button"
              onClick={() => setStep('form')}
              disabled={loading}
              className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-50 disabled:opacity-60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Back
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export function PayoutCompletionAudit({
  payout,
}: {
  payout: PayoutQueueItemDto & {
    transactionReference?: string | null;
    completedBy?: string | null;
    completedByName?: string | null;
    notes?: string | null;
    receiptUrl?: string | null;
  };
}) {
  const isCompleted =
    payout.status.toLowerCase() === 'completed' || payout.status.toLowerCase() === 'paid';

  if (!isCompleted) return null;

  const transactionReference =
    payout.transactionReference ?? payout.withdrawalReference ?? null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
        Completion audit
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {payout.completedBy && (
          <DrawerField
            label="Completed by"
            value={payout.completedByName ?? payout.completedBy}
          />
        )}
        {payout.processedAt && (
          <DrawerField label="Completed at" value={formatFinanceDate(payout.processedAt)} />
        )}
        {transactionReference && (
          <DrawerField label="Transaction reference" value={transactionReference} />
        )}
        {payout.notes && <DrawerField label="Notes" value={payout.notes} />}
        {payout.receiptUrl && (
          <DrawerField
            label="Receipt URL"
            value={
              <a
                href={payout.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {payout.receiptUrl}
              </a>
            }
          />
        )}
      </div>
    </div>
  );
}
