"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { getOnlinePresenceState, subscribeToOnlinePresence } from '@/lib/onlinePresenceChannel';
import { notifyMessageRecipient } from '@/lib/notifyMessageRecipient';
import Image from '@/components/RemoteImage';
import { useMessageUnread } from '@/components/messages/MessageUnreadProvider';
import {
  formatProfileDisplayName,
  getDisplayNameInitials,
  resolveDisplayName,
} from '@/lib/display/formatDisplayName';
import RecognitionBadge from '@/components/arena/RecognitionBadge';
import { fetchBuilderRecognition } from '@/lib/arena/badges/client';
import type { RecognitionBadgeGrant } from '@/lib/arena/badges/types';

interface MessagingInterfaceProps {
    currentUser: any;
    userRole: 'buyer' | 'builder';
    initialConversationId?: string | null;
}

interface ConversationRow {
    id: string;
    title: string;
    buyer_id: string;
    builder_id: string;
    created_at: string;
    counterparty?: {
        full_name?: string | null;
        avatar_url?: string | null;
    } | null;
    latest_message_at?: string;
}

function sortConversations(
    rows: ConversationRow[],
    unreadCounts: Record<string, number>,
): ConversationRow[] {
    return [...rows].sort((a, b) => {
        const aUnread = (unreadCounts[a.id] || 0) > 0 ? 1 : 0;
        const bUnread = (unreadCounts[b.id] || 0) > 0 ? 1 : 0;
        if (aUnread !== bUnread) return bUnread - aUnread;

        const aTime = a.latest_message_at || a.created_at;
        const bTime = b.latest_message_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
}

function getCounterpartyLabel(
    counterparty?: ConversationRow['counterparty'] | null,
): string {
    return formatProfileDisplayName(counterparty);
}

function getCounterpartyInitials(
    counterparty?: ConversationRow['counterparty'] | null,
): string {
    return getDisplayNameInitials(resolveDisplayName(counterparty));
}

interface ChatMessage {
    id: string;
    collab_id: string;
    sender_id: string;
    text?: string | null;
    content?: string | null;
    is_read?: boolean;
    deleted_at?: string | null;
    edited_at?: string | null;
    reply_to?: string | null;
    message_kind?: 'user' | 'system' | null;
    system_event_type?: string | null;
    created_at: string;
    status?: 'sending' | 'sent' | 'error';
}

// --- SYSTEM PARSER (Code, Milestones, Files) ---
const MessageContent = ({
    text,
    isMe,
    userRole,
    currentUserId,
    collabId,
    onFocusComposer,
    onProposalUpdated,
}: {
    text: string;
    isMe: boolean;
    userRole?: 'buyer' | 'builder';
    currentUserId?: string;
    collabId?: string;
    onFocusComposer?: () => void;
    onProposalUpdated?: () => void;
}) => {
    const proposalCardMatch = text.match(/\[\[PROPOSAL_CARD\|([0-9a-f-]{36})\]\]/i);
    const proposalFundedMatch = text.match(/\[\[PROPOSAL_FUNDED\|([0-9a-f-]{36})\]\]/i);
    const proposalAcceptedMatch = text.match(/\[\[PROPOSAL_ACCEPTED\|([0-9a-f-]{36})\]\]/i);
    const milestoneCardMatch = text.match(/\[\[MILESTONE_CARD\|([0-9a-f-]{36})\|(created|funded|released)\]\]/i);

    if (milestoneCardMatch && userRole) {
        const MilestoneChatCard = React.lazy(() => import('@/components/chat/MilestoneChatCard'));
        return (
            <React.Suspense fallback={<div className="my-2 h-24 animate-pulse rounded-2xl bg-slate-100" />}>
                <MilestoneChatCard
                    milestoneId={milestoneCardMatch[1]}
                    event={milestoneCardMatch[2].toLowerCase() as 'created' | 'funded' | 'released'}
                    userRole={userRole}
                />
            </React.Suspense>
        );
    }

    const embeddedProposalId =
        proposalCardMatch?.[1] ?? proposalFundedMatch?.[1] ?? proposalAcceptedMatch?.[1] ?? null;

    if (embeddedProposalId && currentUserId && userRole) {
        const ProjectProposalCard = React.lazy(() => import('@/components/chat/ProjectProposalCard'));
        return (
            <React.Suspense fallback={<div className="my-2 h-24 animate-pulse rounded-2xl bg-slate-100" />}>
                <ProjectProposalCard
                    negotiationId={embeddedProposalId}
                    userRole={userRole}
                    currentUserId={currentUserId}
                    onFocusComposer={onFocusComposer}
                    onUpdated={onProposalUpdated}
                />
            </React.Suspense>
        );
    }
    // Handle multiple files in a single message
    const legacyFileMatches = Array.from(text.matchAll(/\[\[FILE\|(.*?)\|(.*?)\|(.*?)\]\]/g))
        .map(m => ({ mode: 'legacy' as const, url: m[1], name: m[2], type: m[3] }));
    const privateFileMatches = Array.from(text.matchAll(/\[\[FILE_PATH\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]\]/g))
        .map(m => ({ mode: 'private' as const, bucket: m[1], path: m[2], name: m[3], type: m[4] }));
    const files = [...legacyFileMatches, ...privateFileMatches];

    const openAuthorizedFile = async (file: typeof files[number]) => {
        if (file.mode === 'legacy') {
            window.open(file.url, '_blank', 'noopener,noreferrer');
            return;
        }
        if (!collabId) return;
        const response = await fetch(`/api/collabs/${collabId}/files/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucket: file.bucket, path: file.path, fileName: file.name }),
        });
        const result = await response.json();
        if (response.ok && result.url) {
            window.open(result.url, '_blank', 'noopener,noreferrer');
        }
    };
    
    if (files.length > 0) {
        return (
            <div className={`my-2 rounded-2xl overflow-hidden border ${isMe ? 'border-white/20' : 'border-slate-200'}`}>
                {files.map((file, idx) => {
                    const isImage = file.type.startsWith('image/') && file.mode === 'legacy';
                    return (
                        <div key={idx} className={idx > 0 ? 'border-t border-slate-200/20' : ''}>
                            {isImage ? (
                                <div className="relative w-full min-w-[240px] aspect-video group cursor-zoom-in">
                                    <Image src={file.url} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" alt={file.name} />
                                    <a href={file.url} target="_blank" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest">
                                        View Full Size
                                    </a>
                                </div>
                            ) : (
                                <div className="p-4 bg-white/10 backdrop-blur-md flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-black truncate text-inherit">{file.name}</p>
                                        <div className="flex gap-3 mt-1">
                                            <button onClick={() => openAuthorizedFile(file)} className="text-[9px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300">Download</button>
                                            {file.mode === 'legacy' && <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400">Legacy Link</span>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    const quotationMatch = text.match(/\[\[QUOTATION\|(.*?)\|(\d+(?:\.\d+)?)\|(\d+)\|(\d+)\]\]/);
    if (quotationMatch) {
        const [_, quoteId, price, days, revisions] = quotationMatch;
        const notes = text.replace(quotationMatch[0], '').trim();
        const handleQuoteAction = async (status: 'accepted' | 'rejected' | 'changes_requested') => {
            if (!currentUserId) return;
            const { updateQuotationStatus } = await import('@/lib/quotations');
            try {
                const result = await updateQuotationStatus(quoteId, status, currentUserId);
                if (status === 'accepted' && result.milestoneId) {
                    window.location.href = `/checkout/escrow/${result.milestoneId}`;
                } else {
                    alert(`Quotation ${status.replace('_', ' ')}`);
                }
            } catch (err: unknown) {
                alert(err instanceof Error ? err.message : 'Action failed');
            }
        };
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm my-2 text-slate-900 w-full min-w-[280px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quotation</p>
                <p className="text-2xl font-black text-blue-600 mt-1">${price}</p>
                <p className="text-sm text-slate-600 mt-1">{days} days · {revisions} revisions</p>
                {notes && <p className="text-sm text-slate-500 mt-2">{notes}</p>}
                {userRole === 'buyer' && !isMe && (
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => handleQuoteAction('accepted')} className="flex-1 bg-green-600 text-white py-2 rounded-xl text-[10px] font-black uppercase">Accept</button>
                        <button onClick={() => handleQuoteAction('rejected')} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl text-[10px] font-black uppercase">Reject</button>
                        <button onClick={() => handleQuoteAction('changes_requested')} className="flex-1 bg-amber-100 text-amber-800 py-2 rounded-xl text-[10px] font-black uppercase">Request Changes</button>
                    </div>
                )}
            </div>
        );
    }

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

const PROPOSAL_SYSTEM_EVENTS = new Set(['proposal_card', 'proposal_accepted', 'proposal_funded']);
const MILESTONE_SYSTEM_EVENTS = new Set(['milestone_created', 'milestone_funded', 'milestone_released']);

const isProposalSystemMessage = (msg: ChatMessage, body: string | null) => {
    if (msg.system_event_type && PROPOSAL_SYSTEM_EVENTS.has(msg.system_event_type)) return true;
    if (!body) return false;
    return /\[\[PROPOSAL_(CARD|ACCEPTED|FUNDED)\|/i.test(body);
};

const isMilestoneSystemMessage = (msg: ChatMessage, body: string | null) => {
    if (msg.system_event_type && MILESTONE_SYSTEM_EVENTS.has(msg.system_event_type)) return true;
    if (!body) return false;
    return /\[\[MILESTONE_CARD\|/i.test(body);
};

const getMessageBody = (msg: { text?: string | null; content?: string | null; deleted_at?: string | null }) => {
    if (msg.deleted_at) return null;
    return msg.text || msg.content || '';
};

const getMessagePreview = (text: string) => {
    if (text.startsWith('[[FILE|')) return 'Attachment';
    if (text.startsWith('[[MILESTONE|')) return 'Milestone proposal';
    if (text.startsWith('[[QUOTATION|')) return 'Quotation';
    if (text.startsWith('[[PROPOSAL_CARD|')) return 'Project proposal';
    if (text.startsWith('[[PROPOSAL_FUNDED|')) return 'Proposal funded';
    if (text.startsWith('[[PROPOSAL_ACCEPTED|')) return 'Proposal accepted';
    if (text.startsWith('[[MILESTONE_CARD|')) return 'Milestone update';
    if (text.startsWith('Dispute ')) return 'Dispute update';
    return text.length > 80 ? `${text.slice(0, 80)}...` : text;
};

const ReadReceipt = ({ status, isRead }: { status?: string; isRead?: boolean }) => {
    if (status === 'sending') return <span className="opacity-70">...</span>;
    if (status === 'error') return <span className="text-red-300">Failed</span>;
    if (isRead) {
        return (
            <span className="inline-flex items-center text-blue-200" title="Seen">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 15" fill="currentColor">
                    <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.879a.32.32 0 01-.484.033l-.358-.325a.319.319 0 00-.484.032l-.378.483a.418.418 0 00-.036.541l1.32 2.266c.143.246.437.313.683.168L15.01 3.884a.363.363 0 00.063-.51zm-4.1 0l-.478-.372a.365.365 0 00-.51.063L4.566 9.879a.32.32 0 01-.484.033L1.891 7.769a.366.366 0 00-.515.006l-.423.433a.364.364 0 00.006.514l3.258 3.185c.143.147.361.125.484-.033l6.272-8.048a.366.366 0 00-.064-.51z" />
                </svg>
            </span>
        );
    }
    return (
        <span className="inline-flex items-center opacity-70" title="Sent">
            <svg className="w-3 h-3" viewBox="0 0 16 12" fill="currentColor">
                <path d="M15.854 2.146a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L8.5 8.793l6.646-6.647a.5.5 0 01.708 0z" />
            </svg>
        </span>
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
function normalizeConversation(row: Record<string, unknown>): ConversationRow {
    const counterparty =
        (row.counterparty as ConversationRow['counterparty']) ??
        (row.profiles_public as ConversationRow['counterparty']) ??
        (row.profiles as ConversationRow['counterparty']) ??
        null;

    return {
        id: String(row.id),
        title: String(row.title ?? ''),
        buyer_id: String(row.buyer_id),
        builder_id: String(row.builder_id),
        created_at: String(row.created_at ?? new Date().toISOString()),
        counterparty,
        latest_message_at: typeof row.latest_message_at === 'string' ? row.latest_message_at : undefined,
    };
}

export default function MessagingInterface({ currentUser, userRole, initialConversationId }: MessagingInterfaceProps) {
    const { refreshUnreadCount, subscribeToMessages } = useMessageUnread();
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<ConversationRow[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [activeCollabId, setActiveCollabId] = useState<string | null>(null);
    const activeCollabIdRef = useRef<string | null>(null);
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    
    // Input & Typing States
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const [isOtherOnline, setIsOtherOnline] = useState(false);
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    
    const [hasMore, setHasMore] = useState(true);
    
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const broadcastChannelRef = useRef<RealtimeChannel | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
    const [showFileUploadModal, setShowFileUploadModal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
    const [headerBadge, setHeaderBadge] = useState<RecognitionBadgeGrant | null>(null);

    useEffect(() => {
        activeCollabIdRef.current = activeCollabId;
    }, [activeCollabId]);

    const resortConversations = (
        rows: ConversationRow[],
        counts: Record<string, number>,
    ) => sortConversations(rows, counts);

    // 1. FETCH CONVERSATIONS & UNREAD COUNTS
    useEffect(() => {
        async function loadConversations() {
            const relatedProfileColumn = userRole === 'buyer' ? 'builder_id' : 'buyer_id';
            
            const [collabsRes, unreadRes] = await Promise.all([
                supabase
                    .from('collabs')
                    .select(`id, title, buyer_id, builder_id, created_at, counterparty:profiles_public!${relatedProfileColumn}(full_name, avatar_url)`)
                    .eq(userRole === 'buyer' ? 'buyer_id' : 'builder_id', currentUser.id)
                    .order('created_at', { ascending: false }),
                supabase.from('messages').select('collab_id').eq('is_read', false).neq('sender_id', currentUser.id),
            ]);

            if (collabsRes.error) {
                console.error('Supabase query error fetching conversations:', collabsRes.error);
            }

            const counts: Record<string, number> = {};
            unreadRes.data?.forEach((msg) => {
                counts[msg.collab_id] = (counts[msg.collab_id] || 0) + 1;
            });
            setUnreadCounts(counts);

            if (collabsRes.data) {
                let rows = collabsRes.data.map((row) => normalizeConversation(row as Record<string, unknown>));
                const collabIds = rows.map((row) => row.id);

                if (collabIds.length > 0) {
                    const { data: recentMessages } = await supabase
                        .from('messages')
                        .select('collab_id, created_at')
                        .in('collab_id', collabIds)
                        .order('created_at', { ascending: false });

                    const latestByCollab: Record<string, string> = {};
                    recentMessages?.forEach((msg) => {
                        if (!latestByCollab[msg.collab_id]) {
                            latestByCollab[msg.collab_id] = msg.created_at;
                        }
                    });

                    rows = rows.map((row) => ({
                        ...row,
                        latest_message_at: latestByCollab[row.id],
                    }));
                }

                const sortedRows = resortConversations(rows, counts);
                setConversations(sortedRows);

                const preferredId =
                    initialConversationId &&
                    sortedRows.some((collab) => collab.id === initialConversationId)
                        ? initialConversationId
                        : sortedRows[0]?.id ?? null;
                if (preferredId) {
                    setActiveCollabId(preferredId);
                    if (window.innerWidth < 768) setMobileView('chat');
                }
            }

            setLoading(false);
        }
        loadConversations();
    }, [currentUser.id, userRole, initialConversationId]);

    useEffect(() => {
        return subscribeToMessages((event) => {
            const message = event.message as {
                collab_id?: string;
                sender_id?: string;
                created_at?: string;
                is_read?: boolean;
            };
            const collabId = message.collab_id;
            if (!collabId) return;

            if (event.type === 'insert') {
                setUnreadCounts((prevCounts) => {
                    const shouldIncrement =
                        message.sender_id !== currentUser.id &&
                        collabId !== activeCollabIdRef.current;
                    const nextCounts = shouldIncrement
                        ? { ...prevCounts, [collabId]: (prevCounts[collabId] || 0) + 1 }
                        : prevCounts;

                    setConversations((prevRows) =>
                        resortConversations(
                            prevRows.map((conversation) =>
                                conversation.id === collabId
                                    ? {
                                          ...conversation,
                                          latest_message_at:
                                              message.created_at || conversation.latest_message_at,
                                      }
                                    : conversation,
                            ),
                            nextCounts,
                        ),
                    );

                    return nextCounts;
                });
                return;
            }

            if (event.type === 'update') {
                const previous = event.previous as { is_read?: boolean; sender_id?: string } | undefined;
                if (previous?.sender_id === currentUser.id) return;
                if (!previous?.is_read && message.is_read) {
                    setUnreadCounts((prevCounts) => {
                        const nextCounts = { ...prevCounts, [collabId]: 0 };
                        setConversations((prevRows) => resortConversations(prevRows, nextCounts));
                        return nextCounts;
                    });
                }
            }
        });
    }, [currentUser.id, subscribeToMessages]);

    useEffect(() => {
        const closeMenu = (e: MouseEvent) => {
            const target = e.target as Element | null;
            if (target?.closest('[data-message-menu]')) return;
            setActiveMessageMenu(null);
        };
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, []);

    useEffect(() => {
        const activeConv = conversations.find((c) => c.id === activeCollabId);
        if (userRole !== 'buyer' || !activeConv?.builder_id) {
            setHeaderBadge(null);
            return;
        }

        let cancelled = false;
        fetchBuilderRecognition(activeConv.builder_id)
            .then((result) => {
                if (!cancelled) setHeaderBadge(result.primaryBadge);
            })
            .catch(() => {
                if (!cancelled) setHeaderBadge(null);
            });

        return () => {
            cancelled = true;
        };
    }, [activeCollabId, conversations, userRole]);

    const syncOnlineStatusRef = useRef<() => void>(() => {});

    syncOnlineStatusRef.current = () => {
        const activeConv = conversations.find((c) => c.id === activeCollabId);
        if (!activeConv) {
            setIsOtherOnline(false);
            return;
        }
        const otherId = userRole === 'buyer' ? activeConv.builder_id : activeConv.buyer_id;
        if (!otherId) {
            setIsOtherOnline(false);
            return;
        }
        const state = getOnlinePresenceState();
        setIsOtherOnline(Boolean(state[otherId]?.length));
    };

    // Online presence — shared channel; callbacks registered before subscribe()
    useEffect(() => {
        if (!currentUser?.id) return;

        return subscribeToOnlinePresence(currentUser.id, () => {
            syncOnlineStatusRef.current();
        });
    }, [currentUser?.id]);

    useEffect(() => {
        syncOnlineStatusRef.current();
    }, [activeCollabId, conversations, userRole]);

    // 2. LOAD MESSAGES & REALTIME SUBSCRIPTIONS
    useEffect(() => {
        if (!activeCollabId) return;
        setMessages([]); 
        setHasMore(true);
        setIsOtherTyping(false);
        setReplyTo(null);
        setEditingMessageId(null);
        setNewMessage('');

        setUnreadCounts(prev => ({ ...prev, [activeCollabId]: 0 }));

        let messageSub: RealtimeChannel | null = null;
        let broadcastSub: RealtimeChannel | null = null;
        let isCancelled = false;

        async function initializeChat() {
            await supabase.from('messages').update({ is_read: true }).eq('collab_id', activeCollabId).neq('sender_id', currentUser.id).eq('is_read', false);
            void refreshUnreadCount();
            const { data } = await supabase.from('messages').select('*').eq('collab_id', activeCollabId).order('created_at', { ascending: false }).limit(50);

            if (isCancelled) return;

            if (data) {
                setMessages((data as ChatMessage[]).reverse());
                if (data.length < 50) setHasMore(false);
                setTimeout(() => scrollToBottom(true), 100);
            }

            messageSub = supabase.channel(`chat_db_${activeCollabId}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `collab_id=eq.${activeCollabId}` }, payload => {
                    const incoming = payload.new as ChatMessage;
                    setMessages(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]);
                    if (incoming.sender_id !== currentUser.id) {
                        setIsOtherTyping(false);
                        void supabase.from('messages').update({ is_read: true }).eq('id', incoming.id);
                    }
                    setTimeout(() => scrollToBottom(), 50);
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `collab_id=eq.${activeCollabId}` }, payload => {
                    const updated = payload.new as ChatMessage;
                    setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated, status: m.status === 'sending' ? m.status : 'sent' } : m));
                })
                .subscribe();

            broadcastSub = supabase.channel(`room_${activeCollabId}`)
                .on('broadcast', { event: 'typing' }, payload => {
                    if (payload.payload.user_id !== currentUser.id) {
                        setIsOtherTyping(true);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 2500);
                    }
                }).subscribe();
            broadcastChannelRef.current = broadcastSub;
        }

        initializeChat();
        return () => { 
            isCancelled = true;
            broadcastChannelRef.current = null;
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
            if (messageSub) supabase.removeChannel(messageSub); 
            if (broadcastSub) supabase.removeChannel(broadcastSub);
        };
    }, [activeCollabId, currentUser.id, refreshUnreadCount]);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewMessage(e.target.value);
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
        }
        if (activeCollabId && broadcastChannelRef.current) {
            void broadcastChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: currentUser.id } });
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
        if (e) e.preventDefault();
        const text = customText || newMessage.trim();
        if (!text || !activeCollabId || isSending) return;

        if (editingMessageId && !customText) {
            await handleSaveEdit(text);
            return;
        }
        
        if (!customText) {
            setNewMessage('');
            if (inputRef.current) inputRef.current.style.height = 'auto'; 
        }
        
        setShowActionMenu(false);
        setIsSending(true);

        const tempId = `temp-${Date.now()}`;
        const replyToId = replyTo?.id ?? null;
        setMessages(prev => [...prev, {
            id: tempId,
            collab_id: activeCollabId,
            sender_id: currentUser.id,
            text,
            content: text,
            reply_to: replyToId,
            is_read: false,
            created_at: new Date().toISOString(),
            status: 'sending',
        }]);
        scrollToBottom(true);

        const insertPayload: Record<string, unknown> = {
            collab_id: activeCollabId,
            sender_id: currentUser.id,
            text,
            content: text,
        };
        if (replyToId) insertPayload.reply_to = replyToId;

        const { data, error } = await supabase.from('messages').insert(insertPayload).select().single();
        if (error) {
            console.error('Message send failed:', error);
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
        } else {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...(data as ChatMessage), status: 'sent' } : m));
            setReplyTo(null);
            void notifyMessageRecipient(data.id);
        }

        setIsSending(false);
    };

    const handleSaveEdit = async (text: string) => {
        if (!editingMessageId) return;

        setIsSending(true);
        const editedAt = new Date().toISOString();
        const { error } = await supabase
            .from('messages')
            .update({ text, content: text, edited_at: editedAt })
            .eq('id', editingMessageId)
            .eq('sender_id', currentUser.id);

        if (error) {
            alert('Could not edit message. Please try again.');
            setIsSending(false);
            return;
        }

        setMessages(prev => prev.map(m =>
            m.id === editingMessageId ? { ...m, text, content: text, edited_at: editedAt } : m
        ));
        setEditingMessageId(null);
        setNewMessage('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
        setIsSending(false);
    };

    const handleReply = (msg: ChatMessage) => {
        setReplyTo(msg);
        setEditingMessageId(null);
        setActiveMessageMenu(null);
        inputRef.current?.focus();
    };

    const handleStartEdit = (msg: ChatMessage) => {
        const body = getMessageBody(msg);
        if (!body) return;
        setEditingMessageId(msg.id);
        setReplyTo(null);
        setNewMessage(body);
        setActiveMessageMenu(null);
        inputRef.current?.focus();
    };

    const handleUnsend = async (messageId: string) => {
        if (messageId.startsWith('temp-')) {
            setMessages(prev => prev.filter(m => m.id !== messageId));
            setActiveMessageMenu(null);
            return;
        }

        const deletedAt = new Date().toISOString();
        const { error } = await supabase
            .from('messages')
            .update({ deleted_at: deletedAt, text: '', content: '' })
            .eq('id', messageId)
            .eq('sender_id', currentUser.id);

        if (error) {
            alert('Could not unsend message. Please try again.');
            return;
        }

        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deleted_at: deletedAt, text: '', content: '' } : m));
        setActiveMessageMenu(null);
    };

    const uploadFile = async (file: File, fileId: string): Promise<string | null> => {
        if (!activeCollabId) return null;
        setUploadProgress(prev => ({ ...prev, [fileId]: 10 }));
        const fileExt = file.name.split('.').pop();
        const filePath = `${activeCollabId}/${Date.now()}_${file.name}`;

        const { error } = await supabase.storage.from('chat-attachments').upload(filePath, file);
        if (error) { 
            setUploadProgress(prev => ({ ...prev, [fileId]: -1 })); 
            return null;
        }

        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        return `[[FILE_PATH|chat-attachments|${filePath}|${file.name}|${file.type}]]`;
    };

    const validateFiles = (files: File[]): { valid: boolean; error?: string } => {
        const MAX_SINGLE_FILE = 100 * 1024 * 1024; // 100MB
        const MAX_TOTAL = 500 * 1024 * 1024; // 500MB

        for (const file of files) {
            if (file.size > MAX_SINGLE_FILE) {
                return { valid: false, error: `${file.name} exceeds 100MB limit` };
            }
        }

        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        if (totalSize > MAX_TOTAL) {
            return { valid: false, error: `Total size exceeds 500MB limit` };
        }

        return { valid: true };
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

    let lastDateGroup = '';

    if (loading) return <div className="h-[70vh] flex items-center justify-center animate-pulse"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Secure Workspace...</p></div>;

    return (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm h-[75vh] min-h-[600px] flex overflow-hidden relative">
            
            {/* LEFT SIDEBAR */}
            <div className={`w-full md:w-1/3 md:min-w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col ${mobileView === 'list' ? 'flex' : 'hidden md:flex'}`}>
                <div className="p-5 border-b border-slate-200 bg-white"><h2 className="text-xl font-black text-slate-900">Messages</h2></div>
                
                {/* 🚨 THE EMPTY STATE FIX 🚨 */}
                {conversations.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 bg-slate-200/50 rounded-full flex items-center justify-center mb-4 border-2 border-white shadow-sm">
                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </div>
                        <h3 className="text-sm font-black text-slate-900 mb-1">Inbox Empty</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                            {userRole === 'buyer' 
                                ? "When you hire an expert, your secure escrow chat will appear here." 
                                : "When a client hires you, your active contracts will appear here."}
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {conversations.map(c => (
                            <button key={c.id} onClick={() => { setActiveCollabId(c.id); setMobileView('chat'); }} className={`w-full text-left p-5 border-b border-slate-200 flex items-center gap-4 transition-colors ${activeCollabId === c.id ? 'bg-white border-l-4 border-l-blue-600' : 'hover:bg-slate-100 border-l-4 border-transparent'}`}>
                                <div className="w-12 h-12 rounded-full overflow-hidden relative border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center">
                                    {c.counterparty?.avatar_url ? (
                                      <Image src={c.counterparty.avatar_url} fill sizes="40px" className="object-cover" alt="Avatar" />
                                    ) : (
                                      <span className="text-slate-400 text-xs font-bold">{getCounterpartyInitials(c.counterparty)}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <p className="text-sm font-black text-slate-900 truncate pr-2">{getCounterpartyLabel(c.counterparty)}</p>
                                        {unreadCounts[c.id] > 0 && (
                                            <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 shadow-sm">{unreadCounts[c.id]}</span>
                                        )}
                                    </div>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${unreadCounts[c.id] > 0 ? 'text-blue-600' : 'text-slate-500'}`}>{c.title}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* RIGHT SIDE: Chat Window */}
            <div className={`flex-1 flex overflow-hidden ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>
                <div
                    className="flex-1 flex flex-col bg-white relative"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                    onDrop={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setIsDragging(false); 
                        const files = e.dataTransfer.files;
                        if (files && files.length > 0) { 
                            const validation = validateFiles(Array.from(files));
                            if (validation.valid) {
                                setSelectedFiles(Array.from(files)); 
                                setShowFileUploadModal(true); 
                            } else {
                                alert(validation.error);
                            }
                        } 
                    }}
                >
                    {isDragging && <div className="absolute inset-0 z-50 bg-blue-600/10 backdrop-blur-sm border-4 border-blue-500 border-dashed rounded-3xl flex items-center justify-center"><h3 className="text-2xl font-black text-blue-800 animate-bounce">Drop file to share</h3></div>}

                    {activeCollabId ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white z-10 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setMobileView('list')} className="md:hidden text-slate-400 p-2">←</button>
                                    <div className="w-10 h-10 rounded-full overflow-hidden relative border border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center">
                                        {activeConversation?.counterparty?.avatar_url ? (
                                          <Image src={activeConversation.counterparty.avatar_url} fill sizes="40px" className="object-cover" alt="Avatar" />
                                        ) : (
                                          <span className="text-slate-400 text-xs font-bold">{getCounterpartyInitials(activeConversation?.counterparty)}</span>
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-black text-slate-900">{getCounterpartyLabel(activeConversation?.counterparty)}</h3>
                                            {headerBadge && <RecognitionBadge badge={headerBadge} size="sm" />}
                                        </div>
                                        {isOtherOnline && (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                <p className="text-[9px] font-black uppercase text-green-600">Online</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => window.location.href = `/collab/${activeCollabId}`} className="text-[10px] font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg transition-colors">Workspace</button>
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
                                    const messageBody = getMessageBody(msg);
                                    const isDeleted = Boolean(msg.deleted_at);
                                    const isSystem = msg.message_kind === 'system';
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
                                            {isSystem && (isProposalSystemMessage(msg, messageBody) || isMilestoneSystemMessage(msg, messageBody)) ? (
                                                <div className="mb-4 flex w-full justify-center px-1">
                                                    <div className="w-full max-w-xl">
                                                        <MessageContent
                                                            text={messageBody || ''}
                                                            isMe={false}
                                                            userRole={userRole}
                                                            currentUserId={currentUser.id}
                                                            collabId={activeCollabId || undefined}
                                                            onFocusComposer={() => inputRef.current?.focus()}
                                                            onProposalUpdated={() => {
                                                                if (!activeCollabId) return;
                                                                void supabase
                                                                    .from('messages')
                                                                    .select('*')
                                                                    .eq('collab_id', activeCollabId)
                                                                    .order('created_at', { ascending: false })
                                                                    .limit(50)
                                                                    .then(({ data }) => {
                                                                        if (data) setMessages((data as ChatMessage[]).reverse());
                                                                    });
                                                            }}
                                                        />
                                                        <p className="mt-2 text-center text-[8px] font-bold uppercase tracking-widest text-slate-400">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : isSystem ? (
                                                <div className="flex justify-center mb-4">
                                                    <div className="max-w-[90%] rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-center shadow-sm">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">
                                                            Dispute System Event
                                                        </p>
                                                        <p className="mt-1 text-xs font-bold leading-relaxed text-amber-900">
                                                            {messageBody}
                                                        </p>
                                                        <p className="mt-2 text-[8px] font-bold uppercase tracking-widest text-amber-600/70">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                            <div className={`group flex mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3.5 ${isMe ? 'bg-blue-600 text-white rounded-br-sm shadow-md' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'} ${isDeleted ? 'opacity-80' : ''}`}>
                                                    {!isDeleted && (
                                                        <div
                                                            data-message-menu
                                                            className={`absolute top-1 ${isMe ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} ${activeMessageMenu === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-20`}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id)}
                                                                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 bg-white border border-slate-200 shadow-sm"
                                                                aria-label="Message options"
                                                                aria-expanded={activeMessageMenu === msg.id}
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                                            </button>
                                                            {activeMessageMenu === msg.id && (
                                                                <div className={`absolute top-full ${isMe ? 'right-0' : 'left-0'} mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 min-w-[140px]`}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleReply(msg)}
                                                                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                                    >
                                                                        Reply
                                                                    </button>
                                                                    {isMe && (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleStartEdit(msg)}
                                                                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleUnsend(msg.id)}
                                                                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50"
                                                                            >
                                                                                Unsend Message
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {msg.reply_to && !isDeleted && (() => {
                                                        const parent = messages.find(m => m.id === msg.reply_to);
                                                        const parentBody = parent ? getMessageBody(parent) : null;
                                                        return (
                                                            <div className={`mb-2 pl-3 border-l-2 ${isMe ? 'border-blue-300' : 'border-slate-300'} opacity-80`}>
                                                                <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5">Reply</p>
                                                                <p className="text-xs truncate">{parentBody ? getMessagePreview(parentBody) : 'Original message'}</p>
                                                            </div>
                                                        );
                                                    })()}
                                                    {isDeleted ? (
                                                        <p className={`text-sm italic ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                                            {isMe ? 'You unsent this message' : 'This message was deleted'}
                                                        </p>
                                                    ) : (
                                                        <MessageContent
                                                            text={messageBody || ''}
                                                            isMe={isMe}
                                                            userRole={userRole}
                                                            currentUserId={currentUser.id}
                                                            collabId={activeCollabId || undefined}
                                                            onFocusComposer={() => inputRef.current?.focus()}
                                                            onProposalUpdated={() => {
                                                                if (!activeCollabId) return;
                                                                void supabase
                                                                    .from('messages')
                                                                    .select('*')
                                                                    .eq('collab_id', activeCollabId)
                                                                    .order('created_at', { ascending: false })
                                                                    .limit(50)
                                                                    .then(({ data }) => {
                                                                        if (data) setMessages((data as ChatMessage[]).reverse());
                                                                    });
                                                            }}
                                                        />
                                                    )}
                                                    <div className={`flex items-center gap-1.5 mt-2 text-[8px] font-bold uppercase tracking-widest ${isMe ? 'text-blue-200 justify-end' : 'text-slate-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {msg.edited_at && !isDeleted && <span className="normal-case opacity-70">edited</span>}
                                                        {isMe && !isDeleted && (
                                                            <ReadReceipt status={msg.status} isRead={msg.is_read} />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                                
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

                            {/* Input Area */}
                            <div className="p-4 md:p-5 bg-white border-t border-slate-200 relative z-20 shadow-sm">

                                {replyTo && (
                                    <div className="mb-3 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Replying</p>
                                            <p className="text-xs text-slate-600 truncate">{getMessagePreview(getMessageBody(replyTo) || '')}</p>
                                        </div>
                                        <button type="button" onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600 shrink-0 ml-2" aria-label="Cancel reply">✕</button>
                                    </div>
                                )}

                                {editingMessageId && (
                                    <div className="mb-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">Editing message</p>
                                        <button
                                            type="button"
                                            onClick={() => { setEditingMessageId(null); setNewMessage(''); if (inputRef.current) inputRef.current.style.height = 'auto'; }}
                                            className="text-slate-400 hover:text-slate-600"
                                            aria-label="Cancel edit"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                                
                                {showActionMenu && (
                                    <div className="absolute bottom-full left-4 mb-4 bg-white border border-slate-200 rounded-2xl shadow-xl w-56 overflow-hidden animate-in fade-in zoom-in-95">
                                        <button onClick={() => { setShowActionMenu(false); document.getElementById('file-upload')?.click(); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3">Share File</button>
                                        <button onClick={() => { setShowActionMenu(false); if (activeCollabId) window.location.href = `/collab/${activeCollabId}`; }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 transition-colors flex items-center gap-3">Propose Milestone</button>
                                    </div>
                                )}

                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    multiple
                                    onChange={(e) => {
                                        const files = e.target.files ? Array.from(e.target.files) : [];
                                        if (files.length > 0) {
                                            const validation = validateFiles(files);
                                            if (validation.valid) {
                                                setSelectedFiles(files);
                                                setShowFileUploadModal(true);
                                            } else {
                                                alert(validation.error);
                                            }
                                        }
                                        e.target.value = '';
                                    }}
                                />

                                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                                    <button type="button" onClick={() => setShowActionMenu(!showActionMenu)} className={`p-3.5 rounded-xl border transition-all shrink-0 ${showActionMenu ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500'}`}>+</button>
                                    
                                    <textarea 
                                        ref={inputRef}
                                        rows={1}
                                        value={newMessage}
                                        onChange={handleInput}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                        placeholder="Type a message... (Shift+Enter for new line)" 
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors shadow-inner resize-none custom-scrollbar"
                                        style={{ minHeight: '52px', maxHeight: '150px' }}
                                    />

                                    <button type="submit" disabled={!newMessage.trim() || isSending} className="bg-slate-900 hover:bg-blue-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase transition-all shadow-md shrink-0 h-[52px]">
                                        {editingMessageId ? 'Save' : 'Send'}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 mb-4">
                                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Select a project to view workspace</p>
                        </div>
                    )}
                </div>

                {/* File Upload Modal */}
                {showFileUploadModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-slate-200">
                                <h3 className="text-lg font-black text-slate-900">Share Files</h3>
                                <p className="text-xs font-medium text-slate-500 mt-1">Select files to share in the chat</p>
                            </div>
                            <div className="p-6">
                                <div className="mb-4">
                                    <input
                                        type="file"
                                        id="modal-file-upload"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            const newFiles = e.target.files ? Array.from(e.target.files) : [];
                                            if (newFiles.length === 0) return;
                                            const combined = [...selectedFiles, ...newFiles];
                                            const validation = validateFiles(combined);
                                            if (validation.valid) {
                                                setSelectedFiles(combined);
                                            } else {
                                                alert(validation.error);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                    <button
                                        onClick={() => document.getElementById('modal-file-upload')?.click()}
                                        className="w-full border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                    >
                                        <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-sm font-medium text-slate-600">Click to add more files</p>
                                        <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
                                    </button>
                                </div>

                                {selectedFiles.length > 0 && (
                                    <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                                        {selectedFiles.map((file, index) => {
                                            const fileId = `${file.name}-${index}`;
                                            const progress = uploadProgress[fileId];
                                            return (
                                                <div key={fileId} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                                                        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                                                        {progress !== undefined && progress !== 100 && (
                                                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                                                                <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {progress === undefined && (
                                                        <button
                                                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {progress === 100 && (
                                                        <span className="text-green-500 text-xs font-bold">✓</span>
                                                    )}
                                                    {progress === -1 && (
                                                        <span className="text-red-500 text-xs font-bold">✗</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="flex justify-between items-center text-xs text-slate-500 mb-4">
                                    <span>{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}</span>
                                    <span>{formatFileSize(selectedFiles.reduce((sum, f) => sum + f.size, 0))} / 500MB</span>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowFileUploadModal(false);
                                            setSelectedFiles([]);
                                            setUploadProgress({});
                                        }}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const fileMessages: string[] = [];
                                            for (let i = 0; i < selectedFiles.length; i++) {
                                                const msg = await uploadFile(selectedFiles[i], `${selectedFiles[i].name}-${i}`);
                                                if (msg) fileMessages.push(msg);
                                            }
                                            if (fileMessages.length > 0) {
                                                await handleSendMessage(undefined, fileMessages.join('\n'));
                                            }
                                            setShowFileUploadModal(false);
                                            setSelectedFiles([]);
                                            setUploadProgress({});
                                        }}
                                        disabled={selectedFiles.length === 0}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                                    >
                                        Send Files
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}