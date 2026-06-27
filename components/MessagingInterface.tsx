"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import AIIntelligencePanel from './AIIntelligencePanel';

interface MessagingInterfaceProps {
    currentUser: any;
    userRole: 'buyer' | 'builder';
}

// --- SYSTEM PARSER (Code, Milestones, Files) ---
const MessageContent = ({ text, isMe }: { text: string, isMe: boolean }) => {
    // 1. FILE PARSER
    const fileMatch = text.match(/\[\[FILE\|(.*?)\|(.*?)\|(.*?)\]\]/);
    if (fileMatch) {
        const [_, url, name, type] = fileMatch;
        const isImage = type.startsWith('image/');
        return (
            <div className={`my-2 rounded-2xl overflow-hidden border ${isMe ? 'border-white/20' : 'border-slate-200'}`}>
                {isImage ? (
                    <div className="relative w-full min-w-[240px] aspect-video group cursor-zoom-in">
                        <Image src={url} fill className="object-cover" alt={name} />
                        <a href={url} target="_blank" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest">
                            View Full Size
                        </a>
                    </div>
                ) : (
                    <div className="p-4 bg-white/10 backdrop-blur-md flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-black truncate text-inherit">{name}</p>
                            <div className="flex gap-3 mt-1">
                                <a href={url} download={name} className="text-[9px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300">Download</a>
                                {!isMe && <button className="text-[9px] font-bold uppercase tracking-widest text-green-400 hover:text-green-300">Approve File</button>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 2. MILESTONE PARSER
    const milestoneMatch = text.match(/\[\[MILESTONE\|(.*?)\|(\d+)\]\]/);
    if (milestoneMatch) {
        const [_, title, amount] = milestoneMatch;
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm my-2 text-slate-900 w-full min-w-[280px]">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Milestone Proposal</p>
                            <p className="text-sm font-black text-slate-900">{title}</p>
                        </div>
                    </div>
                    <p className="text-lg font-black text-blue-600">${amount}</p>
                </div>
                <div className="flex gap-2">
                    {!isMe && <button className="flex-1 bg-slate-900 hover:bg-blue-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">Fund Escrow</button>}
                    <button className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">Details</button>
                </div>
            </div>
        );
    }

    // 3. CODE BLOCK & TEXT PARSER
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = []; let lastIndex = 0; let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
        parts.push({ type: 'code', language: match[1] || 'Code', content: match[2].trim() });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push({ type: 'text', content: text.slice(lastIndex) });

    return (
        <div className="text-sm font-medium leading-relaxed">
            {parts.map((p, i) => p.type === 'code' ? (
                <div key={i} className={`my-3 overflow-hidden rounded-xl border bg-slate-900 ${isMe ? 'border-slate-700' : 'border-slate-800'}`}>
                    <div className="flex justify-between items-center px-4 py-2 bg-black/40 border-b border-white/10">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{p.language}</span>
                        <button onClick={() => navigator.clipboard.writeText(p.content)} className="text-slate-400 hover:text-white transition-colors text-[9px] font-bold uppercase tracking-widest">Copy</button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-xs text-slate-50 font-mono"><code>{p.content}</code></pre>
                </div>
            ) : <span key={i} className="whitespace-pre-wrap break-words">{p.content}</span>)}
        </div>
    );
};

// --- HELPER: DATE FORMATTING ---
const formatDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// --- MAIN INTERFACE ---
export default function MessagingInterface({ currentUser, userRole }: MessagingInterfaceProps) {
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<any[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [activeCollabId, setActiveCollabId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    const [messages, setMessages] = useState<any[]>([]);

    // Input & Typing States
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [hasMore, setHasMore] = useState(true);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showActionMenu, setShowActionMenu] = useState(false);

    // 1. FETCH CONVERSATIONS & UNREAD COUNTS
    useEffect(() => {
        async function loadConversations() {
            const relatedProfileColumn = userRole === 'buyer' ? 'builder_id' : 'buyer_id';

            const [collabsRes, unreadRes] = await Promise.all([
                supabase.from('collabs').select(`id, title, profiles!${relatedProfileColumn}(full_name, avatar_url)`).eq(userRole === 'buyer' ? 'buyer_id' : 'builder_id', currentUser.id).order('created_at', { ascending: false }),
                supabase.from('messages').select('collab_id').eq('is_read', false).neq('sender_id', currentUser.id)
            ]);

            if (collabsRes.data) {
                setConversations(collabsRes.data);
                if (collabsRes.data.length > 0 && window.innerWidth >= 768) setActiveCollabId(collabsRes.data[0].id);
            }

            if (unreadRes.data) {
                const counts: Record<string, number> = {};
                unreadRes.data.forEach(msg => { counts[msg.collab_id] = (counts[msg.collab_id] || 0) + 1; });
                setUnreadCounts(counts);
            }
            setLoading(false);
        }
        loadConversations();
    }, [currentUser.id, userRole]);

    // 2. LOAD MESSAGES & REALTIME SUBSCRIPTIONS
    useEffect(() => {
        if (!activeCollabId) return;
        setMessages([]);
        setHasMore(true);
        setIsOtherTyping(false);

        // Clear unread badge for active chat
        setUnreadCounts(prev => ({ ...prev, [activeCollabId]: 0 }));

        let messageSub: any;
        let broadcastSub: any;

        async function initializeChat() {
            await supabase.from('messages').update({ is_read: true }).eq('collab_id', activeCollabId).neq('sender_id', currentUser.id).eq('is_read', false);
            const { data } = await supabase.from('messages').select('*').eq('collab_id', activeCollabId).order('created_at', { ascending: false }).limit(50);

            if (data) {
                setMessages(data.reverse());
                if (data.length < 50) setHasMore(false);
                setTimeout(() => scrollToBottom(true), 100);
            }

            // DB Listener
            messageSub = supabase.channel(`chat_db_${activeCollabId}`)
                .on('postgres', { event: 'INSERT', schema: 'public', table: 'messages', filter: `collab_id=eq.${activeCollabId}` }, payload => {
                    setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
                    if (payload.new.sender_id !== currentUser.id) setIsOtherTyping(false); // Clear typing indicator on receive
                    setTimeout(() => scrollToBottom(), 50);
                }).subscribe();

            // Presence / Broadcast Listener (Typing)
            broadcastSub = supabase.channel(`room_${activeCollabId}`)
                .on('broadcast', { event: 'typing' }, payload => {
                    if (payload.payload.user_id !== currentUser.id) {
                        setIsOtherTyping(true);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 2500);
                    }
                }).subscribe();
        }

        initializeChat();
        return () => {
            if (messageSub) supabase.removeChannel(messageSub);
            if (broadcastSub) supabase.removeChannel(broadcastSub);
        };
    }, [activeCollabId, currentUser.id]);

    // --- AUTO-GROWING TEXTAREA & TYPING BROADCAST ---
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewMessage(e.target.value);

        // Auto-grow
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
        }

        // Broadcast Typing
        if (activeCollabId) {
            supabase.channel(`room_${activeCollabId}`).send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: currentUser.id }
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // --- MESSAGE SENDING ---
    const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
        if (e) e.preventDefault();
        const text = customText || newMessage.trim();
        if (!text || !activeCollabId || isSending) return;

        if (!customText) {
            setNewMessage('');
            if (inputRef.current) inputRef.current.style.height = 'auto'; // Reset height
        }

        setShowActionMenu(false);
        setIsSending(true);

        const tempId = `temp-${Date.now()}`;
        setMessages(prev => [...prev, { id: tempId, collab_id: activeCollabId, sender_id: currentUser.id, text, is_read: false, created_at: new Date().toISOString(), status: 'sending' }]);
        scrollToBottom(true);

        const { data, error } = await supabase.from('messages').insert({ collab_id: activeCollabId, sender_id: currentUser.id, text }).select().single();
        if (error) setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
        else setMessages(prev => prev.map(m => m.id === tempId ? { ...data, status: 'sent' } : m));

        setIsSending(false);
    };

    const uploadFile = async (file: File) => {
        if (!activeCollabId) return;
        setUploadProgress(10);
        const fileExt = file.name.split('.').pop();
        const filePath = `${activeCollabId}/${Math.random()}.${fileExt}`;

        const { error } = await supabase.storage.from('chat-attachments').upload(filePath, file);
        if (error) { alert("Upload failed"); setUploadProgress(null); return; }

        setUploadProgress(90);
        const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
        await handleSendMessage(undefined, `[[FILE|${publicUrl}|${file.name}|${file.type}]]`);
        setUploadProgress(null);
    };

    const scrollToBottom = (force = false) => {
        if (chatEndRef.current) {
            const container = chatContainerRef.current;
            if (force || (container && container.scrollHeight - container.scrollTop - container.clientHeight < 200)) {
                chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    const activeConversation = conversations.find(c => c.id === activeCollabId);

    // --- RENDER PREP ---
    let lastDateGroup = '';

    if (loading) return <div className="h-[70vh] flex items-center justify-center animate-pulse"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Secure Workspace...</p></div>;

    return (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm h-[75vh] min-h-[600px] flex overflow-hidden relative">

            {/* LEFT SIDEBAR */}
            <div className={`w-full md:w-1/3 md:min-w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col ${mobileView === 'list' ? 'flex' : 'hidden md:flex'}`}>
                <div className="p-5 border-b border-slate-200 bg-white"><h2 className="text-xl font-black text-slate-900">Messages</h2></div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.map(c => (
                        <button key={c.id} onClick={() => { setActiveCollabId(c.id); setMobileView('chat'); }} className={`w-full text-left p-5 border-b border-slate-200 flex items-center gap-4 transition-colors ${activeCollabId === c.id ? 'bg-white border-l-4 border-l-blue-600' : 'hover:bg-slate-100 border-l-4 border-transparent'}`}>
                            <div className="w-12 h-12 rounded-full overflow-hidden relative border border-slate-200 shrink-0">
                                <Image src={c.profiles?.avatar_url || 'https://via.placeholder.com/100'} fill className="object-cover" alt="Avatar" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-0.5">
                                    <p className="text-sm font-black text-slate-900 truncate pr-2">{c.profiles?.full_name}</p>
                                    {unreadCounts[c.id] > 0 && (
                                        <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 shadow-sm">{unreadCounts[c.id]}</span>
                                    )}
                                </div>
                                <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${unreadCounts[c.id] > 0 ? 'text-blue-600' : 'text-slate-500'}`}>{c.title}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* RIGHT SIDE: Chat Window + AI Panel Wrapper */}
            <div className={`flex-1 flex overflow-hidden ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>

                {/* Main Chat Column */}
                <div
                    className="flex-1 flex flex-col bg-white relative"
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
                    }}
                >
                    {/* Drag Drop Overlay */}
                    {isDragging && (
                        <div className="absolute inset-0 z-50 bg-blue-600/10 backdrop-blur-sm border-4 border-blue-500 border-dashed rounded-3xl flex items-center justify-center">
                            <h3 className="text-2xl font-black text-blue-800 animate-bounce">Drop file to share</h3>
                        </div>
                    )}

                    {activeCollabId ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white z-10 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setMobileView('list')} className="md:hidden text-slate-400 p-2">←</button>
                                    <div className="w-10 h-10 rounded-full overflow-hidden relative border border-slate-200 shadow-sm">
                                        <Image src={activeConversation?.profiles?.avatar_url || 'https://via.placeholder.com/100'} fill className="object-cover" alt="Avatar" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-sm font-black text-slate-900">{activeConversation?.profiles?.full_name}</h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                            <p className="text-[9px] font-black uppercase text-slate-400">Online</p>
                                        </div>
                                    </div>
                                </div>
                                <button className="text-[10px] font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg transition-colors">Workspace</button>
                            </div>

                            {/* Chat History */}
                            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar flex flex-col">
                                <div className="text-center pb-6">
                                    <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200 shadow-inner flex items-center justify-center gap-1.5 w-max mx-auto">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> Secure Escrow Chat
                                    </span>
                                </div>

                                {messages.map(msg => {
                                    const isMe = msg.sender_id === currentUser.id;
                                    const currentDateGroup = formatDateGroup(msg.created_at);
                                    const showDateSeparator = currentDateGroup !== lastDateGroup;
                                    lastDateGroup = currentDateGroup;

                                    return (
                                        <React.Fragment key={msg.id}>
                                            {showDateSeparator && (
                                                <div className="flex justify-center my-6">
                                                    <span className="bg-white border border-slate-200 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                                                        {currentDateGroup}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`flex mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3.5 ${isMe ? 'bg-blue-600 text-white rounded-br-sm shadow-md' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'}`}>
                                                    <MessageContent text={msg.text} isMe={isMe} />
                                                    <div className={`flex items-center gap-1 mt-2 text-[8px] font-bold uppercase tracking-widest ${isMe ? 'text-blue-200 justify-end' : 'text-slate-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isMe && (
                                                            <span className="ml-1">
                                                                {msg.status === 'sending' ? '...' : msg.status === 'error' ? 'Failed' : msg.is_read ? 'Seen' : 'Sent'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}

                                {/* Typing Indicator */}
                                {isOtherTyping && (
                                    <div className="flex justify-start mb-4 animate-in fade-in">
                                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-sm flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* AI Suggested Actions Bar (Pre-Input) */}
                            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
                                {userRole === 'buyer' ? (
                                    <>
                                        <button className="bg-white border border-slate-200 text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm whitespace-nowrap transition-colors flex items-center gap-1">✨ Summarize Status</button>
                                        <button onClick={() => handleSendMessage(undefined, "Can you provide an update on the current milestone?")} className="bg-white border border-slate-200 text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm whitespace-nowrap transition-colors">Request Update</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => document.getElementById('file-upload')?.click()} className="bg-white border border-slate-200 text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm whitespace-nowrap transition-colors flex items-center gap-1">📎 Upload Deliverable</button>
                                        <button onClick={() => handleSendMessage(undefined, "I have completed the task. Please review the attached files.")} className="bg-white border border-slate-200 text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm whitespace-nowrap transition-colors">Mark Completed</button>
                                    </>
                                )}
                            </div>

                            {/* Input Area (Auto-Growing) */}
                            <div className="p-4 md:p-5 bg-white border-t border-slate-200 relative z-20 shadow-sm">
                                {uploadProgress !== null && (
                                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 -mt-1"><div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div>
                                )}

                                {showActionMenu && (
                                    <div className="absolute bottom-full left-4 mb-4 bg-white border border-slate-200 rounded-2xl shadow-xl w-56 overflow-hidden animate-in fade-in zoom-in-95">
                                        <button onClick={() => document.getElementById('file-upload')?.click()} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3">Share File</button>
                                        <button onClick={() => handleSendMessage(undefined, "[[MILESTONE|New Phase Initiation|500]]")} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 transition-colors flex items-center gap-3">Propose Milestone</button>
                                        <input type="file" id="file-upload" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); setShowActionMenu(false); }} />
                                    </div>
                                )}

                                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                                    <button type="button" onClick={() => setShowActionMenu(!showActionMenu)} className={`p-3.5 rounded-xl border transition-all shrink-0 ${showActionMenu ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500'}`}>+</button>

                                    {/* Auto-Growing Textarea */}
                                    <textarea
                                        ref={inputRef}
                                        rows={1}
                                        value={newMessage}
                                        onChange={handleInput}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a message... (Shift+Enter for new line)"
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors shadow-inner resize-none custom-scrollbar"
                                        style={{ minHeight: '52px', maxHeight: '150px' }}
                                    />

                                    <button type="submit" disabled={!newMessage.trim() || isSending} className="bg-slate-900 hover:bg-blue-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase transition-all shadow-md shrink-0 h-[52px]">Send</button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-slate-50 text-xs font-black text-slate-400">Select project</div>
                    )}
                </div>

                {/* AI Intelligence Side Panel */}
                {activeCollabId && (
                    <AIIntelligencePanel 
                        messages={messages}
                        onSendMessage={(text) => handleSendMessage(undefined, text)}
                        // Extra props preserved to ensure no breaking changes based on user's exact paste
                        collabId={activeCollabId}
                        currentUser={currentUser}
                        userRole={userRole}
                    />
                )}
            </div>
        </div>
    );
}