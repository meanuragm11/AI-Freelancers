"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import SectionHeader from '@/components/founder/SectionHeader';
import Badge from '@/components/founder/Badge';

type UserRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  is_freelancer: boolean;
  is_admin: boolean;
  is_verified: boolean;
  kyc_status: string | null;
  average_rating: number | null;
  review_count: number | null;
  created_at: string;
  last_active_at: string | null;
  account_status: string | null;
  suspension_type: string | null;
};

export default function FounderUsersPage() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        const res = await fetch(`/api/founder/users?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load users');
        setUsers(data.users ?? []);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [q]);

  return (
    <div>
      <SectionHeader
        eyebrow="Identity"
        title="Users"
        description="Instant search across every buyer and builder account on the platform."
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or user ID..."
          autoFocus
          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium outline-none"
        />
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
          Searching...
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm font-medium text-rose-700">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="uppercase tracking-widest text-[9px] font-black text-slate-400 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Verification</th>
                  <th className="px-5 py-4">Rating</th>
                  <th className="px-5 py-4">Joined</th>
                  <th className="px-5 py-4">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No users found.</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/founder/users/${user.id}`} className="font-black text-slate-900 hover:text-blue-600">
                        {user.full_name || 'Unnamed User'}
                      </Link>
                    </td>
                    <td className="px-5 py-4 flex flex-wrap gap-1.5 items-center">
                      <Badge label={user.role || 'user'} tone="slate" />
                      {user.is_freelancer && <Badge label="Builder" tone="purple" />}
                      {user.is_admin && <Badge label="Admin" tone="rose" />}
                      {user.account_status === 'banned' && <Badge label="Banned" tone="rose" />}
                      {user.account_status === 'suspended' && (
                        <Badge label={`Suspended: ${user.suspension_type || ''}`} tone="amber" />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {user.is_verified ? <Badge label="Verified" tone="green" /> : <Badge label={user.kyc_status || 'unverified'} tone="amber" />}
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-medium">
                      {user.average_rating ? `${Number(user.average_rating).toFixed(1)} ★ (${user.review_count || 0})` : '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-400 font-medium">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-slate-400 font-medium">
                      {user.last_active_at ? new Date(user.last_active_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
