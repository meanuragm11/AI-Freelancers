"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import TicketStatusBadge from '@/components/support/TicketStatusBadge';
import type { SupportTicket } from '@/lib/support/types';

export default function SupportTicketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTickets() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth?redirect=/support/tickets');
        return;
      }

      try {
        const response = await fetch('/api/support');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load tickets');
        }
        setTickets(data.tickets ?? []);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    }

    void loadTickets();
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-160px)] bg-slate-50 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Support Center</p>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">My Support Tickets</h1>
            <p className="text-slate-500 font-medium mt-2">Track status, read replies, and continue conversations.</p>
          </div>
          <Link
            href="/support"
            className="inline-flex justify-center bg-slate-900 hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            New Ticket
          </Link>
        </div>

        {loading && (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
            Loading tickets...
          </div>
        )}

        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
            <p className="text-slate-500 font-medium mb-4">You have not submitted any support tickets yet.</p>
            <Link href="/support" className="text-blue-600 font-bold hover:text-blue-700">
              Create your first ticket
            </Link>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/tickets/${encodeURIComponent(ticket.ticket_number)}`}
                className="block bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-black font-mono text-slate-500">{ticket.ticket_number}</span>
                      <TicketStatusBadge status={ticket.status} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {ticket.priority}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-slate-900">{ticket.subject}</h2>
                    <p className="text-sm text-slate-500 mt-1">{ticket.category}</p>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Updated {new Date(ticket.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
