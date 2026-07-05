"use client";



import React, { useState } from "react";

import type { LedgerTransaction } from "@/lib/builder/earningsLedger";

import { MIN_WITHDRAWAL_USD } from "@/lib/builder/earningsLedger";

import { useEarningsLedger } from "@/lib/builder/useEarningsLedger";

import BankAccountModal from "@/components/builder/BankAccountModal";



function statusBadge(status: LedgerTransaction["status"]) {

  switch (status) {

    case "cleared":

      return "bg-green-100 text-green-700";

    case "processing":

      return "bg-amber-100 text-amber-700";

    case "pending":

      return "bg-blue-100 text-blue-700";

    default:

      return "bg-rose-100 text-rose-700";

  }

}



function statusLabel(status: LedgerTransaction["status"]) {

  switch (status) {

    case "cleared":

      return "Cleared";

    case "processing":

      return "Processing";

    case "pending":

      return "Pending";

    default:

      return "Failed";

  }

}



export default function EarningsLedgerPanel() {

  const { ledger, loading, error, setError, reload } = useEarningsLedger();

  const [showBankModal, setShowBankModal] = useState(false);

  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [withdrawAmount, setWithdrawAmount] = useState("");



  const handleConnectBank = async (payoutForm: {

    payoutRegion: "india" | "international";

    accountHolderName: string;

    bankName: string;

    accountNumber: string;

    routingNumber: string;

    ifscCode: string;

    paypalEmail: string;

  }) => {

    setSubmitting(true);

    setActionMessage(null);

    setError(null);



    try {

      const response = await fetch("/api/builder/earnings/payout-method", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(payoutForm),

      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Failed to connect bank account");



      setActionMessage("Bank account connected successfully.");

      setShowBankModal(false);

      await reload({ silent: true });

    } catch (submitError) {

      setError(submitError instanceof Error ? submitError.message : "Failed to connect bank account");

    } finally {

      setSubmitting(false);

    }

  };



  const handleWithdraw = async (event: React.FormEvent) => {

    event.preventDefault();

    setSubmitting(true);

    setActionMessage(null);

    setError(null);



    try {

      const response = await fetch("/api/builder/earnings/withdraw", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ amountUsd: Number(withdrawAmount) }),

      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Withdrawal failed");



      setActionMessage(result.message || "Withdrawal submitted.");

      setShowWithdrawForm(false);

      setWithdrawAmount("");

      await reload({ silent: true });

    } catch (submitError) {

      setError(submitError instanceof Error ? submitError.message : "Withdrawal failed");

    } finally {

      setSubmitting(false);

    }

  };



  if (loading) {

    return (

      <div className="py-16 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">

        Loading earnings ledger...

      </div>

    );

  }



  if (!ledger) {

    return (

      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-8 text-sm font-bold text-rose-700">

        {error || "Unable to load earnings ledger."}

      </div>

    );

  }



  const canWithdraw =

    ledger.payoutMethod.connected &&

    ledger.availableBalanceUsd >= MIN_WITHDRAWAL_USD &&

    !submitting;



  return (

    <div className="animate-in fade-in duration-300">

      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">

        <div>

          <h2 className="text-3xl font-black tracking-tight text-slate-900">Earnings Ledger</h2>

          <p className="mt-1 text-sm font-medium text-slate-500">

            Track released funds, pending escrows, and manage bank payouts.

          </p>

        </div>

        <button

          type="button"

          onClick={() => {

            setShowWithdrawForm(true);

            setShowBankModal(false);

          }}

          disabled={!canWithdraw}

          className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"

        >

          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">

            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />

          </svg>

          Withdraw Funds

        </button>

      </div>



      {(error || actionMessage) && (

        <div

          className={`mb-6 rounded-2xl px-5 py-4 text-xs font-bold ${

            error ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"

          }`}

        >

          {error || actionMessage}

        </div>

      )}



      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-500 to-green-600 p-8 text-white shadow-lg">

          <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-green-100">

            Available for Withdrawal

          </p>

          <p className="text-4xl font-black">${ledger.availableBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>

          <p className="mt-4 text-xs font-medium text-green-100">

            Lifetime earned ${ledger.lifetimeEarnedUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} · Withdrawn ${ledger.totalWithdrawnUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}

          </p>

        </div>



        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Pending in Escrow</p>

          <p className="text-4xl font-black text-slate-900">${ledger.pendingEscrowUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>

          <p className="mt-4 text-xs font-medium text-slate-500">

            Locked milestone funds in active client contracts awaiting release.

          </p>

        </div>

      </div>



      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-1">

          <div className="border-b border-slate-100 bg-slate-50 p-6">

            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Payout Method</h3>

          </div>



          <div className="flex flex-1 flex-col p-6">

            {ledger.payoutMethod.connected ? (

              <div className="space-y-4">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">

                  <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />

                  </svg>

                </div>

                <div className="text-center">

                  <p className="text-sm font-black text-slate-900">Bank Account Connected</p>

                  <p className="mt-1 text-xs font-medium text-slate-500">

                    {ledger.payoutMethod.accountHolderName}

                  </p>

                  <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">

                    {ledger.payoutMethod.bankName || (ledger.payoutMethod.payoutRegion === "india" ? "Indian Bank" : "International Bank")}

                    {" · "}

                    ****{ledger.payoutMethod.accountLast4}

                  </p>

                  {ledger.payoutMethod.ifscCode && (

                    <p className="mt-1 text-[10px] font-bold text-slate-400">IFSC {ledger.payoutMethod.ifscCode}</p>

                  )}

                  {ledger.payoutMethod.paypalEmail && (

                    <p className="mt-1 text-[10px] font-bold text-slate-400">PayPal {ledger.payoutMethod.paypalEmail}</p>

                  )}

                </div>

                <button

                  type="button"

                  onClick={() => {

                    setShowBankModal(true);

                    setShowWithdrawForm(false);

                  }}

                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50"

                >

                  Update Bank Account

                </button>

              </div>

            ) : (

              <div className="flex flex-1 flex-col items-center justify-center text-center">

                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-blue-100 bg-blue-50">

                  <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />

                  </svg>

                </div>

                <p className="mb-1 text-xs font-bold text-slate-900">No Connected Account</p>

                <p className="mb-6 text-[10px] font-medium text-slate-500">

                  Link your bank account to withdraw cleared earnings safely.

                </p>

                <button

                  type="button"

                  onClick={() => {

                    setShowBankModal(true);

                    setShowWithdrawForm(false);

                  }}

                  className="w-full rounded-xl bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-blue-700"

                >

                  Connect Bank Account

                </button>

              </div>

            )}

          </div>

        </div>



        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-2">

          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6">

            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Recent Transactions</h3>

          </div>



          {showWithdrawForm && (

            <form onSubmit={handleWithdraw} className="border-b border-slate-100 bg-blue-50/60 p-6">

              <p className="mb-3 text-xs font-black uppercase tracking-widest text-blue-700">Withdraw Funds</p>

              <div className="flex flex-col gap-3 sm:flex-row">

                <input

                  required

                  min={MIN_WITHDRAWAL_USD}

                  max={ledger.availableBalanceUsd}

                  step="0.01"

                  type="number"

                  placeholder={`Amount (min $${MIN_WITHDRAWAL_USD})`}

                  value={withdrawAmount}

                  onChange={(event) => setWithdrawAmount(event.target.value)}

                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"

                />

                <button

                  type="submit"

                  disabled={submitting || !ledger.payoutMethod.connected}

                  className="rounded-xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-600 disabled:opacity-60"

                >

                  {submitting ? "Processing..." : "Confirm Withdrawal"}

                </button>

                <button

                  type="button"

                  onClick={() => setShowWithdrawForm(false)}

                  className="rounded-xl border border-slate-200 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white"

                >

                  Cancel

                </button>

              </div>

              <p className="mt-2 text-[10px] font-medium text-slate-500">

                Available balance: ${ledger.availableBalanceUsd.toFixed(2)} · Minimum withdrawal ${MIN_WITHDRAWAL_USD}

              </p>

            </form>

          )}



          <div className="overflow-x-auto">

            {ledger.transactions.length === 0 ? (

              <div className="p-12 text-center text-xs font-bold uppercase tracking-widest text-slate-400">

                No transactions yet.

              </div>

            ) : (

              <table className="w-full whitespace-nowrap text-left text-sm">

                <thead className="border-b border-slate-100 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400">

                  <tr>

                    <th className="px-6 py-4">Date</th>

                    <th className="px-6 py-4">Description</th>

                    <th className="px-6 py-4">Status</th>

                    <th className="px-6 py-4 text-right">Amount</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {ledger.transactions.map((transaction) => {

                    const isDebit = transaction.amountUsd < 0;

                    const isPendingEscrow =

                      transaction.type === "escrow_deposit" && transaction.status === "pending";

                    return (

                      <tr key={transaction.id} className="transition-colors hover:bg-slate-50">

                        <td className="px-6 py-4 font-medium text-slate-500">

                          {new Date(transaction.date).toLocaleDateString()}

                        </td>

                        <td className="px-6 py-4 font-black text-slate-900">{transaction.description}</td>

                        <td className="px-6 py-4">

                          <span className={`rounded px-2 py-1 text-[8px] font-black uppercase tracking-widest ${statusBadge(transaction.status)}`}>

                            {statusLabel(transaction.status)}

                          </span>

                        </td>

                        <td

                          className={`px-6 py-4 text-right font-black ${

                            isDebit ? "text-slate-700" : isPendingEscrow ? "text-blue-600" : "text-green-600"

                          }`}

                        >

                          {isDebit ? "-" : "+"}${Math.abs(transaction.amountUsd).toLocaleString(undefined, { minimumFractionDigits: 2 })}

                        </td>

                      </tr>

                    );

                  })}

                </tbody>

              </table>

            )}

          </div>

        </div>

      </div>



      <BankAccountModal

        open={showBankModal}

        existingMethod={ledger.payoutMethod}

        submitting={submitting}

        onClose={() => {

          if (!submitting) setShowBankModal(false);

        }}

        onSubmit={handleConnectBank}

      />

    </div>

  );

}

