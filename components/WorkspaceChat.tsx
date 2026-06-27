"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Message {
  id: string;
  collab_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface WorkspaceChatProps {
  collabId: string;
  currentUserId: string;
}

export default function WorkspaceChat({ collabId, currentUserId }: WorkspaceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    async function fetchMessages() {
      const { data, error } = await supabase
        .from('collab_messages')
        .select('*')
        .eq('collab_id', collabId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
        scrollToBottom();
      }
      setLoading(false);
    }

    fetchMessages();

    // Set up Real-time Subscription for live chat
    const channel = supabase
      .channel(`chat_${collabId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'collab_messages', filter: `collab_id=eq.${collabId}` }, 
      (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [collabId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const payload = {
      collab_id: collabId,
      sender_id: currentUserId,
      message: newMessage.trim(),
    };

    setNewMessage(""); // Optimistic clear

    const { error } = await supabase.from('collab_messages').insert([payload]);
    if (error) {
      alert("Transmission failed. Please try again.");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl flex flex-col h-[600px] shadow-sm overflow-hidden">
      
      {/* Chat Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Secure Comm-Link</h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">End-to-End Encrypted Logs</p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live
        </span>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50/50">
        {loading ? (
          <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mt-10">Decrypting Logs...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mt-10">No comms established yet. Initiate protocol.</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                <div className={`px-5 py-3 rounded-2xl text-sm font-medium ${
                  isMe 
                    ? 'bg-blue-600 text-white rounded-br-sm shadow-md' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.message}
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Transmit secure message or paste code..." 
            className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 disabled:text-slate-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md"
          >
            Send
          </button>
        </form>
      </div>

    </div>
  );
}