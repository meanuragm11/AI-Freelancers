"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import SectionHeader from '@/components/founder/SectionHeader';
import StatCard from '@/components/founder/StatCard';

type OverviewStats = {
  totalUsers: number;
  activeBuyers: number;
  activeBuilders: number;
  publishedServices: number;
  publishedAssets: number;
  ordersToday: number;
  revenueToday: number;
  activeEscrowTotal: number;
  activeEscrowCount: number;
  pendingWithdrawalCount: number;
  pendingWithdrawalTotal: number;
  openDisputes: number;
  openTickets: number;
};

type RecentTicket = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
};

type RecentDispute = {
  id: string;
  collab_id: string;
  status: string;
  primary_reason: string;
  created_at: string;
};

const money = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FounderOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [tickets, setTickets] = useState<RecentTicket[]>([]);
  const [disputes, setDisputes] = useState<RecentDispute[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/founder/overview');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load overview');
        setStats(data.stats);
        setTickets(data.recentTickets ?? []);
        setDisputes(data.recentDisputes ?? []);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load overview');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div>
      <SectionHeader
        eyebrow="Marketplace Monitoring"
        title="Live Operations Overview"
        description="Real-time telemetry across users, marketplace activity, escrow, and support load."
      />

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
          Loading telemetry...
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && stats && (
        <div className="space-y-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Users</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} accent="blue" />
              <StatCard label="Active Buyers" value={stats.activeBuyers.toLocaleString()} />
              <StatCard label="Active Builders" value={stats.activeBuilders.toLocaleString()} />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Marketplace</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Published Services" value={stats.publishedServices.toLocaleString()} />
              <StatCard label="Published AI Assets" value={stats.publishedAssets.toLocaleString()} />
              <StatCard label="Orders Today" value={stats.ordersToday.toLocaleString()} accent="blue" />
              <StatCard label="Revenue Today (Fees)" value={money(stats.revenueToday)} accent="green" />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Finance & Risk</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Active Escrow"
                value={money(stats.activeEscrowTotal)}
                hint={`${stats.activeEscrowCount} project(s)`}
              />
              <StatCard
                label="Pending Withdrawals"
                value={money(stats.pendingWithdrawalTotal)}
                accent="amber"
                hint={`${stats.pendingWithdrawalCount} request(s)`}
              />
              <StatCard label="Open Disputes" value={stats.openDisputes.toLocaleString()} accent="rose" />
              <StatCard label="Open Support Tickets" value={stats.openTickets.toLocaleString()} accent="amber" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Latest Tickets</h2>
                <Link href="/founder/tickets" className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
                  View All
                </Link>
              </div>
              {tickets.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium py-6 text-center">No tickets yet.</p>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/founder/tickets/${ticket.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-bold text-slate-400">{ticket.ticket_number}</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{ticket.subject}</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Active Disputes</h2>
                <Link href="/founder/disputes" className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
                  View All
                </Link>
              </div>
              {disputes.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium py-6 text-center">No active disputes. All clear.</p>
              ) : (
                <div className="space-y-2">
                  {disputes.map((dispute) => (
                    <Link
                      key={dispute.id}
                      href={`/founder/disputes/${dispute.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{dispute.primary_reason}</p>
                        <p className="text-xs text-slate-400 font-medium">
                          {new Date(dispute.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 shrink-0">
                        {dispute.status.replace(/_/g, ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
