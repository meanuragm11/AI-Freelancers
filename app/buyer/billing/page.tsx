"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

/* ── Inline SVG Icons ── */
const CreditCardIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);
const DocumentArrowDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBillingHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch all subscriptions for the buyer
        const { data } = await supabase
          .from('active_subscriptions')
          .select('*, listings(title, profiles(company_name))')
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false });

        if (data) setInvoices(data);
      }
      setLoading(false);
    }
    fetchBillingHistory();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Ledger...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto font-sans w-full min-h-screen">
      
      <div className="flex items-end justify-between border-b border-slate-200 pb-8 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Billing & Invoices</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage payment methods and download past receipts.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 text-slate-600">
            <CreditCardIcon />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Primary Payment Method</p>
            <p className="text-base font-black text-slate-900">Visa ending in •••• 4242</p>
          </div>
        </div>
        <button className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-colors">
          Update Card
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Transaction History</h2>
        </div>
        
        {invoices.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-sm text-slate-500 font-medium">No past transactions found. Your billing history will appear here once you purchase a tool.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                  <th className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="py-4 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-5 px-8">
                      <p className="text-sm font-bold text-slate-700">{new Date(invoice.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="py-5 px-8">
                      <p className="text-sm font-black text-slate-900">{invoice.listings?.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Subscription Activation</p>
                    </td>
                    <td className="py-5 px-8">
                      <span className="text-sm font-black text-slate-900">₹{invoice.amount.toLocaleString()}</span>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <button className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors opacity-0 group-hover:opacity-100">
                        <DocumentArrowDownIcon /> PDF
                      </button>
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