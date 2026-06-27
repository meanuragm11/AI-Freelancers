"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function SupportPortal() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");
  
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    email: '',
    category: 'General Inquiry',
    subject: '',
    message: ''
  });

  // Automatically pre-fill data if the user is authenticated on the mesh
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setFormData(prev => ({
          ...prev,
          userId: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || ''
        }));
      }
    }
    checkUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit ticket.");
      }

      setTicketId(data.ticketId);
      setSubmitted(true);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-2xl relative">
        
        {/* Background ambient glow for premium feel */}
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none -z-10"></div>

        {!submitted ? (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest mb-4 shadow-sm">
                Zelance Support
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                How can we help?
              </h1>
              <p className="text-slate-500 font-medium text-lg max-w-lg mx-auto">
                Submit a request to our support team. We will review your issue and get back to you shortly.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col gap-6 relative z-10">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Account Email</label>
                  <input 
                    required 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                <select 
                  value={formData.category} 
                  onChange={(e) => setFormData({...formData, category: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Escrow & Payments">Escrow & Payments (High Priority)</option>
                  <option value="Technical Bug">Technical Bug / Issue</option>
                  <option value="Account Verification">Account Verification</option>
                  <option value="Report a User">Report a User / Plagiarism</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Subject</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Briefly summarize the issue"
                  value={formData.subject} 
                  onChange={(e) => setFormData({...formData, subject: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Message Details</label>
                <textarea 
                  required 
                  rows={6} 
                  placeholder="Provide full context. If disputing an Escrow milestone, include the Collab ID."
                  value={formData.message} 
                  onChange={(e) => setFormData({...formData, message: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all resize-none" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full mt-2 bg-slate-900 hover:bg-blue-600 text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Support Ticket'}
              </button>
            </form>
          </>
        ) : (
          
          /* --- SUCCESS STATE UI --- */
          <div className="bg-white border border-slate-200 rounded-3xl p-12 shadow-sm text-center animate-in fade-in zoom-in duration-500 relative z-10">
            <div className="w-20 h-20 bg-green-50 border-4 border-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Request Submitted</h2>
            <p className="text-slate-500 font-medium text-base mb-8 max-w-md mx-auto">
              Your support ticket has been successfully received. Our team will review it and respond to you shortly.
            </p>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 max-w-xs mx-auto">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ticket Reference ID</p>
              <p className="text-sm font-black text-slate-900 font-mono">{ticketId.substring(0, 12).toUpperCase()}</p>
            </div>

            <Link 
              href="/" 
              className="inline-block bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"
            >
              Return Home
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}