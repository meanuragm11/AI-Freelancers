"use client";

import React, { useState } from 'react';

export default function AIIntelligencePanel({ messages, onSendMessage }: { messages: any[], onSendMessage: (text: string) => void }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    // Hook to your /api/chat/summarize endpoint
    const response = await fetch('/api/chat/summarize', {
      method: 'POST',
      body: JSON.stringify({ messages })
    });
    const data = await response.json();
    setSummary(data.summary);
    setLoading(false);
  };

  return (
    <div className="w-80 border-l border-slate-200 bg-slate-50 flex flex-col hidden lg:flex">
      <div className="p-5 border-b border-slate-200 bg-white">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Project Copilot</h3>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto">
        {!summary ? (
          <div className="text-center py-10">
            <button onClick={fetchSummary} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
              {loading ? 'Analyzing...' : 'Generate Project Summary'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in">
            <p className="text-xs font-medium text-slate-600 leading-relaxed">{summary}</p>
            <button onClick={() => setSummary(null)} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600">Clear</button>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Quick Actions</p>
        <div className="space-y-2">
          {['Looks good, proceed.', 'Can you clarify the RAG logic?', 'Need a delivery timeline.'].map(suggestion => (
            <button key={suggestion} onClick={() => onSendMessage(suggestion)} className="w-full text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-[10px] font-bold text-slate-700 hover:text-blue-700 px-3 py-2 rounded-lg transition-colors">
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}