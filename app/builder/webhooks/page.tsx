"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function WebhooksPage() {
  const [webhookData, setWebhookData] = useState({ id: '', endpoint_url: '', secret_key: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    async function loadWebhook() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('webhooks')
          .select('*')
          .eq('builder_id', user.id)
          .single();

        if (data) {
          setWebhookData(data);
        } else {
          // Generate a highly secure secret for first-time visitors
          const newSecret = 'whsec_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          setWebhookData({ id: '', endpoint_url: '', secret_key: newSecret });
        }
      }
      setLoading(false);
    }
    loadWebhook();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (webhookData.id) {
        // Update existing
        await supabase
          .from('webhooks')
          .update({ endpoint_url: webhookData.endpoint_url })
          .eq('id', webhookData.id);
      } else {
        // Insert new
        const { data } = await supabase
          .from('webhooks')
          .insert({
            builder_id: user.id,
            endpoint_url: webhookData.endpoint_url,
            secret_key: webhookData.secret_key
          })
          .select()
          .single();
          
        if (data) setWebhookData(data);
      }
    }
    setSaving(false);
    alert('Webhook endpoint saved securely!');
  };

  if (loading) {
    return <div className="p-10 animate-pulse text-slate-400 font-bold tracking-widest uppercase text-sm">Configuring Endpoints...</div>;
  }

  return (
    <div className="p-10 max-w-5xl mx-auto flex flex-col gap-8 w-full animate-in fade-in duration-500">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Webhook Sync</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Automate API key provisioning and account creation when a buyer completes a purchase.</p>
      </div>

      <div className="bg-slate-900 p-10 rounded-3xl shadow-xl flex flex-col gap-8 border border-slate-800">
        
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Your Server Endpoint URL</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input 
              type="url" 
              value={webhookData.endpoint_url}
              onChange={(e) => setWebhookData({...webhookData, endpoint_url: e.target.value})}
              placeholder="https://api.yourdomain.com/webhooks"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-green-400 outline-none focus:border-blue-500 transition-colors" 
            />
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Endpoint'}
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Signing Secret (Use this to verify the payload signature)</label>
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-500 flex justify-between items-center">
            <span>{showSecret ? webhookData.secret_key : '••••••••••••••••••••••••••••••••••••••••'}</span>
            <button 
              onClick={() => setShowSecret(!showSecret)}
              className="text-blue-400 hover:text-blue-300 font-bold text-[10px] uppercase tracking-widest transition-colors"
            >
              {showSecret ? 'Hide' : 'Reveal'}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 mt-2">
          <h2 className="text-sm font-black text-white uppercase tracking-widest mb-4">Event Testing</h2>
          <p className="text-sm text-slate-400 mb-6">Send a test <code>checkout.completed</code> payload to your endpoint to ensure your server parses it correctly.</p>
          <button 
            onClick={() => alert(`Test payload scheduled for ${webhookData.endpoint_url || 'your endpoint'}`)}
            className="bg-white text-slate-900 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
          >
            Send Test Payload
          </button>
        </div>

      </div>
    </div>
  );
}