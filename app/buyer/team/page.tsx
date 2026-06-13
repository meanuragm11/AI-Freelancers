import React from 'react';

/* ── Optimized Team Access Governance Components ── */
const SeatUsage = ({ used, total, label }: { used: number, total: number, label: string }) => (
  <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-black text-slate-900">{used} / {total} Seats</p>
    </div>
    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bg-blue-600" style={{ width: `${(used/total)*100}%` }}></div>
    </div>
  </div>
);

export default function BuyerTeamAccess() {
  return (
    <div className="bg-slate-50 min-h-screen p-6 md:p-10 w-full font-sans">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Enterprise Team Governance</h1>
            <p className="text-base text-slate-500 font-medium mt-1">Manage seat allocations, device limits, and subscription tiers.</p>
          </div>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold tracking-widest hover:bg-blue-700 transition-colors uppercase shrink-0">
            Invite Team Member
          </button>
        </div>

        {/* Governance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SeatUsage used={12} total={15} label="Support Agent AI" />
          <SeatUsage used={5} total={5} label="Invoice Extractor" />
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Policy Alerts</p>
              <p className="text-xl font-black text-slate-900">2 Devices Exceeded</p>
            </div>
          </div>
        </div>

        {/* Directory with License Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-8 text-xs font-bold text-slate-400 uppercase tracking-widest">Team Member</th>
                <th className="py-4 px-8 text-xs font-bold text-slate-400 uppercase tracking-widest">Role</th>
                <th className="py-4 px-8 text-xs font-bold text-slate-400 uppercase tracking-widest">Tool Access</th>
                <th className="py-4 px-8 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="py-5 px-8 font-bold text-slate-900">Sarah Williams</td>
                <td className="py-5 px-8">
                  <select className="bg-slate-100 text-[11px] font-bold px-2 py-1 rounded border border-slate-200 uppercase tracking-wider">
                    <option>Standard Member</option>
                    <option>Admin</option>
                  </select>
                </td>
                <td className="py-5 px-8 text-xs font-bold text-slate-600">CS Agent AI, Invoice Bot</td>
                <td className="py-5 px-8 text-right">
                  <button className="text-red-600 text-xs font-bold hover:underline">Revoke Access</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}