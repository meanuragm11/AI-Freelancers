"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchBuyerBillingHistory, type BillingRecord } from '@/lib/billing/fetchBillingHistory';

/* ── Inline SVG Icons ── */
const CreditCardIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);
function formatTypeLabel(type: BillingRecord['type']) {
  switch (type) {
    case 'subscription': return 'Subscription';
    case 'component': return 'AI Solution Purchase';
    case 'escrow': return 'Escrow Funding';
    case 'invoice': return 'Escrow Invoice';
  }
}

export default function BillingPage() {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBillingHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const history = await fetchBuyerBillingHistory(user.id);
        setRecords(history);
      }
      setLoading(false);
    }
    loadBillingHistory();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Ledger...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto font-sans w-full min-h-screen">
      
      <div className="flex items-end justify-between border-b border-slate-200 pb-8 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Billing & Invoices</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">View your payment history.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 text-slate-600">
            <CreditCardIcon />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Payment Processing</p>
            <p className="text-base font-black text-slate-900">Secured via Razorpay at checkout</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Card details are not stored on Zelance.</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Transaction History</h2>
        </div>
        
        {records.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-sm text-slate-500 font-medium">No past transactions found. Your billing history will appear here once you purchase a tool or fund escrow.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                  <th className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-5 px-8">
                      <p className="text-sm font-bold text-slate-700">{new Date(record.date).toLocaleDateString()}</p>
                    </td>
                    <td className="py-5 px-8">
                      <p className="text-sm font-black text-slate-900">{record.description}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {record.sublabel ?? formatTypeLabel(record.type)}
                      </p>
                    </td>
                    <td className="py-5 px-8">
                      <span className="text-sm font-black text-slate-900">${record.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="py-5 px-8">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{record.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
