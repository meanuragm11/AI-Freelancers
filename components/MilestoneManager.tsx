"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface MilestoneManagerProps {
    collabId: string;
    currentUser: any;
    userRole: 'buyer' | 'builder';
}

export default function MilestoneManager({ collabId, currentUser, userRole }: MilestoneManagerProps) {
    const router = useRouter();
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Financial Aggregations
    const [totals, setTotals] = useState({ budget: 0, escrow: 0, released: 0 });
    
    useEffect(() => {
        fetchMilestones();

        // Subscribe to realtime milestone updates
        const subscription = supabase.channel(`milestones_${collabId}`)
            .on('postgres', { event: '*', schema: 'public', table: 'milestones', filter: `collab_id=eq.${collabId}` }, () => {
                fetchMilestones(); // Re-fetch on any change to keep financials perfectly synced
            })
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, [collabId]);

    const fetchMilestones = async () => {
        const { data, error } = await supabase
            .from('milestones')
            .select('*')
            .eq('collab_id', collabId)
            .order('order_index', { ascending: true })
            .order('created_at', { ascending: true });

        if (data && !error) {
            setMilestones(data);

            // Calculate Financials
            let budget = 0; let escrow = 0; let released = 0;
            data.forEach(m => {
                budget += Number(m.amount_usd);
                if (m.status === 'funded' || m.status === 'in_progress' || m.status === 'submitted') escrow += Number(m.amount_usd);
                if (m.status === 'released') released += Number(m.amount_usd);
            });
            setTotals({ budget, escrow, released });
        }
        setLoading(false);
    };

    // --- ESCROW STATE MACHINE ACTIONS ---
    const updateMilestoneStatus = async (id: string, newStatus: string) => {
        setProcessingId(id);
        const { error } = await supabase.from('milestones').update({ status: newStatus }).eq('id', id);
        if (error) alert("Transaction failed. Please try again.");
        else await fetchMilestones();
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

    if (loading) return <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div></div>;

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-300">

            {/* 1. FINANCIAL DASHBOARD STRIP */}
            <div className="bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-bl-full blur-2xl"></div>
                <div className="flex flex-wrap gap-8 md:gap-12 relative z-10">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Budget</p>
                        <p className="text-2xl font-black">${totals.budget.toLocaleString()}</p>
                    </div>
                    <div className="h-10 w-px bg-slate-700 hidden md:block"></div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Locked in Escrow</p>
                        <p className="text-2xl font-black">${totals.escrow.toLocaleString()}</p>
                    </div>
                    <div className="h-10 w-px bg-slate-700 hidden md:block"></div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Released to Expert</p>
                        <p className="text-2xl font-black text-green-400">${totals.released.toLocaleString()}</p>
                    </div>
                </div>

                {userRole === 'buyer' && (
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-colors relative z-10">
                        + Add Milestone
                    </button>
                )}
            </div>

            {/* 2. MILESTONE TIMELINE */}
            <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-50/50 custom-scrollbar">
                {milestones.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-1">No Milestones Defined</h3>
                        <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto">Break your project down into smaller deliverables to protect funds and track progress safely.</p>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        {milestones.map((milestone, index) => (
                            <div key={milestone.id} className={`bg-white border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 transition-all ${milestone.status === 'in_progress' ? 'border-blue-300 ring-4 ring-blue-50' : 'border-slate-200'}`}>

                                {/* Number & Status */}
                                <div className="md:w-1/4 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6 flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Milestone {index + 1}</p>
                                        <p className="text-2xl font-black text-slate-900">${Number(milestone.amount_usd).toLocaleString()}</p>
                                    </div>
                                    {getStatusBadge(milestone.status)}
                                </div>

                                {/* Info & Actions */}
                                <div className="flex-1 flex flex-col">
                                    <div className="mb-4">
                                        <h4 className="text-lg font-black text-slate-900 leading-tight mb-1">{milestone.title}</h4>
                                        <p className="text-xs font-medium text-slate-500 leading-relaxed">{milestone.description || 'No description provided.'}</p>
                                    </div>

                                    <div className="mt-auto border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {milestone.due_date ? `Due: ${new Date(milestone.due_date).toLocaleDateString()}` : 'No deadline set'}
                                        </div>

                                        {/* ROLE-BASED ACTION ENGINE */}
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            {userRole === 'buyer' && milestone.status === 'draft' && (
                                                <button onClick={() => router.push(`/checkout/escrow/${milestone.id}`)} disabled={processingId === milestone.id} className="w-full sm:w-auto bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors">
                                                    Fund Escrow
                                                </button>
                                            )}

                                            {userRole === 'builder' && milestone.status === 'funded' && (
                                                <button onClick={() => updateMilestoneStatus(milestone.id, 'in_progress')} disabled={processingId === milestone.id} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors">
                                                    {processingId === milestone.id ? 'Updating...' : 'Start Work'}
                                                </button>
                                            )}

                                            {userRole === 'builder' && milestone.status === 'in_progress' && (
                                                <button onClick={() => updateMilestoneStatus(milestone.id, 'submitted')} disabled={processingId === milestone.id} className="w-full sm:w-auto bg-slate-900 hover:bg-purple-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors">
                                                    {processingId === milestone.id ? 'Submitting...' : 'Submit for Review'}
                                                </button>
                                            )}

                                            {userRole === 'buyer' && milestone.status === 'submitted' && (
                                                <>
                                                    <button onClick={() => updateMilestoneStatus(milestone.id, 'in_progress')} disabled={processingId === milestone.id} className="flex-1 sm:flex-none bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                                                        Request Changes
                                                    </button>
                                                    <button onClick={() => updateMilestoneStatus(milestone.id, 'released')} disabled={processingId === milestone.id} className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors flex items-center justify-center gap-1.5">
                                                        {processingId === milestone.id ? 'Releasing...' : 'Approve & Release'}
                                                    </button>
                                                </>
                                            )}

                                            {milestone.status === 'released' && (
                                                <button className="bg-slate-50 text-slate-400 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed flex items-center gap-1.5 w-full sm:w-auto justify-center">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> Funds Released
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}